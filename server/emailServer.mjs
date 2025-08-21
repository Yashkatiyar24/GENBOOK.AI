import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root first, then allow server/.env to override if present
try {
  const rootEnv = join(dirname(__dirname), '.env');
  dotenv.config({ path: rootEnv });
} catch {}
try {
  const serverEnv = join(__dirname, '.env');
  dotenv.config({ path: serverEnv });
} catch {}

const PORT = process.env.EMAIL_API_PORT ? Number(process.env.EMAIL_API_PORT) : 8787;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true; // same-origin/no-origin tools
  return ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin);
}

// Simple per-IP rate limiter (5 req/min) for POST endpoints
const hits = new Map(); // ip -> timestamps array
function rateLimitOK(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 5;
  const arr = hits.get(ip) || [];
  const recent = arr.filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

// Load and compile template lazily
async function renderTemplate(templateName, context) {
  const root = dirname(__dirname); // project root
  const templatePath = join(root, 'src', 'emails', 'templates', `${templateName}.html`);
  const source = await readFile(templatePath, 'utf-8');
  const tpl = handlebars.compile(source);
  return tpl({
    year: new Date().getFullYear(),
    app_name: 'GENBOOK.AI',
    ...context,
  });
}

async function sendMail({ to, subject, html }) {
  let transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.NODE_ENV !== 'development') {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"GENBOOK.AI" <welcome@genbook.ai>',
    to,
    subject,
    html,
  });
  return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  const origin = res._origin || '*';
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  // CORS pre-processing
  const requestOrigin = req.headers.origin;
  res._origin = isOriginAllowed(requestOrigin) ? (requestOrigin || '*') : 'null';

  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });

  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, service: 'email' });
  }

  if (req.method === 'POST' && req.url === '/api/send-welcome') {
    try {
      // Simple rate limit per IP
      const ip = req.socket.remoteAddress || 'unknown';
      if (!rateLimitOK(ip)) return json(res, 429, { error: 'Too many requests' });

      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

      const { to, user_first_name = 'there', confirm_url, app_name = 'GENBOOK.AI', redirect_to, app_origin } = body || {};
      // Basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!to || typeof to !== 'string' || !emailRegex.test(to)) return json(res, 400, { error: 'Invalid to email' });
      if (!confirm_url || typeof confirm_url !== 'string') return json(res, 400, { error: 'Missing confirm_url' });
      if (typeof user_first_name !== 'string') return json(res, 400, { error: 'Invalid user_first_name' });

      // Determine confirmation link
      let finalConfirmUrl = confirm_url;
      if ((!finalConfirmUrl || finalConfirmUrl === 'AUTO') && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email: to,
            options: redirect_to ? { redirectTo: redirect_to } : undefined,
          });
          if (error) throw error;
          finalConfirmUrl = data?.properties?.action_link || data?.action_link || finalConfirmUrl;
        } catch (e) {
          console.error('Failed to generate Supabase confirm link, falling back:', e?.message || e);
        }
      }

      if (!finalConfirmUrl) {
        const origin = app_origin || 'http://localhost:5175';
        finalConfirmUrl = `${origin}/login`;
      }

      const html = await renderTemplate('welcome-email', {
        user_first_name,
        confirm_url: finalConfirmUrl,
        app_name,
      });

      const result = await sendMail({ to, subject: 'Confirm Your Signup', html });
      return json(res, 200, { ok: true, ...result });
    } catch (err) {
      console.error('Email API error:', err);
      return json(res, 500, { ok: false, error: err?.message || String(err) });
    }
  }

  // Send reset password email with generated recovery link
  if (req.method === 'POST' && req.url === '/api/send-reset') {
    try {
      // Simple rate limit per IP
      const ip = req.socket.remoteAddress || 'unknown';
      if (!rateLimitOK(ip)) return json(res, 429, { error: 'Too many requests' });

      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      const { to, user_first_name = 'there', redirect_to, app_name = 'GENBOOK.AI' } = body || {};
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!to || typeof to !== 'string' || !emailRegex.test(to)) return json(res, 400, { error: 'Invalid to email' });
      if (typeof user_first_name !== 'string') return json(res, 400, { error: 'Invalid user_first_name' });

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return json(res, 500, { error: 'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: to,
        options: redirect_to ? { redirectTo: redirect_to } : undefined,
      });
      if (error) throw error;

      const resetUrl = data?.properties?.action_link || data?.action_link;
      if (!resetUrl) return json(res, 500, { error: 'Failed to generate recovery link' });

      const html = await renderTemplate('reset-password', {
        user_first_name,
        reset_url: resetUrl,
        app_name,
      });

      const result = await sendMail({ to, subject: 'Reset Your Password', html });
      return json(res, 200, { ok: true, ...result });
    } catch (err) {
      console.error('Reset API error:', err);
      return json(res, 500, { ok: false, error: err?.message || String(err) });
    }
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Email API listening on http://localhost:${PORT}`);
});
