import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(dirname(__dirname)); // server/ -> project root

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function renderTemplate(templateName: string, context: Record<string, any>) {
  const templatePath = join(projectRoot, 'src', 'emails', 'templates', `${templateName}.html`);
  const source = await readFile(templatePath, 'utf-8');
  const tpl = handlebars.compile(source);
  return tpl({ year: new Date().getFullYear(), app_name: 'GENBOOK.AI', ...context });
}

async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  let transporter: nodemailer.Transporter;
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

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'email' });
});

router.post('/send-welcome', async (req, res) => {
  try {
    const { to, user_first_name = 'there', confirm_url, app_name = 'GENBOOK.AI', redirect_to, app_origin } = req.body || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!to || typeof to !== 'string' || !emailRegex.test(to)) return res.status(400).json({ error: 'Invalid to email' });
    if (typeof user_first_name !== 'string') return res.status(400).json({ error: 'Invalid user_first_name' });

    let finalConfirmUrl: string | undefined = confirm_url;

    // Prefer generating a magic link (no password required) when AUTO and server creds exist
    if ((!finalConfirmUrl || finalConfirmUrl === 'AUTO') && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: to,
          options: redirect_to ? { redirectTo: redirect_to } : undefined,
        } as any);
        if (error) throw error;
        finalConfirmUrl = (data as any)?.properties?.action_link || (data as any)?.action_link || finalConfirmUrl;
      } catch (e: any) {
        console.error('Failed to generate Supabase magic link, falling back:', e?.message || e);
      }
    }

    if (!finalConfirmUrl) {
      const origin = app_origin || process.env.FRONTEND_URL || 'http://localhost:5173';
      finalConfirmUrl = `${origin}/login`;
    }

    const html = await renderTemplate('welcome-email', {
      user_first_name,
      confirm_url: finalConfirmUrl,
      app_name,
    });

    const result = await sendMail({ to, subject: 'Confirm Your Signup', html });
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('Email send-welcome error:', err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.post('/send-reset', async (req, res) => {
  try {
    const { to, user_first_name = 'there', redirect_to, app_name = 'GENBOOK.AI' } = req.body || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!to || typeof to !== 'string' || !emailRegex.test(to)) return res.status(400).json({ error: 'Invalid to email' });
    if (typeof user_first_name !== 'string') return res.status(400).json({ error: 'Invalid user_first_name' });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: to,
      options: redirect_to ? { redirectTo: redirect_to } : undefined,
    });
    if (error) throw error;

    const resetUrl = (data as any)?.properties?.action_link || (data as any)?.action_link;
    if (!resetUrl) return res.status(500).json({ error: 'Failed to generate recovery link' });

    const html = await renderTemplate('reset-password', {
      user_first_name,
      reset_url: resetUrl,
      app_name,
    });

    const result = await sendMail({ to, subject: 'Reset Your Password', html });
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('Email send-reset error:', err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

export default router;
