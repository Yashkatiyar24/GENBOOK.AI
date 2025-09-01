import logger from '../logger.js';
import { supabase } from '../../supabase.js';
import { sendSMS } from '../providers/sms.js';
import { sendEmail } from '../providers/email.js';

// Simple mustache-style replacer: "Hello {{name}}" with payload.vars = { name: 'Alice' }
function renderTemplate(str = '', vars = {}) {
  return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (k in vars ? String(vars[k]) : ''));
}

async function processJob(job) {
  const { id, tenant_id, channel, template_key, payload } = job;
  const vars = payload?.vars || {};

  let subject = payload?.subject || '';
  let html = payload?.html || '';
  let text = payload?.text || '';
  let to = payload?.to || '';

  // If template_key provided, fetch template and render
  if (template_key) {
    const { data: tpl, error: tplErr } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('channel', channel)
      .eq('key', template_key)
      .single();
    if (tplErr) throw new Error(`Template not found: ${template_key} (${tplErr.message})`);
    subject = subject || tpl.subject || '';
    html = html || tpl.body_md || '';
  }

  // Render variables
  if (subject) subject = renderTemplate(subject, vars);
  if (html) html = renderTemplate(html, vars);
  if (text) text = renderTemplate(text, vars);

  if (channel === 'sms') {
    if (!to) throw new Error('SMS requires payload.to');
    const body = text || html || subject || '';
    await sendSMS(to, body);
  } else if (channel === 'email') {
    if (!to) throw new Error('Email requires payload.to');
    const finalHtml = html || `<pre>${text || ''}</pre>`;
    await sendEmail(to, subject || '(no subject)', finalHtml);
  } else if (channel === 'in_app') {
    // In-app: no external provider. For now, just succeed.
    logger.info(`[InApp] Notification for tenant=${tenant_id} job=${id}`);
  } else {
    throw new Error(`Unsupported channel: ${channel}`);
  }
}

async function markJob(id, fields) {
  return supabase
    .from('notification_jobs')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
}

async function fetchQueuedJobs() {
  const { data, error } = await supabase
    .from('notification_jobs')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(10);
  if (error) throw error;
  return data || [];
}

let timer = null;
let running = false;

export function startNotificationProcessor() {
  if (timer) return; // already started
  const intervalMs = Number(process.env.NOTIFICATIONS_POLL_MS || 30000);
  logger.info(`[Jobs] Notification processor starting (interval=${intervalMs}ms)`);

  timer = setInterval(async () => {
    if (running) return; // prevent re-entry
    running = true;
    try {
      const jobs = await fetchQueuedJobs();
      for (const job of jobs) {
        try {
          await markJob(job.id, { status: 'processing', attempts: (job.attempts || 0) + 1, error: null });
          await processJob(job);
          await markJob(job.id, { status: 'succeeded' });
        } catch (e) {
          const msg = e?.message || String(e);
          logger.error(`[Jobs] Job ${job.id} failed: ${msg}`);
          await markJob(job.id, { status: 'failed', error: msg });
        }
      }
    } catch (e) {
      logger.error('[Jobs] Poll error', e);
    } finally {
      running = false;
    }
  }, intervalMs);
}

export function stopNotificationProcessor() {
  if (timer) clearInterval(timer);
  timer = null;
}
