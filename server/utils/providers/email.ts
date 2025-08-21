import logger from '../logger.js';

let sgMail: any | null = null;

function getSendGrid() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return null;
  if (!sgMail) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(key);
  }
  return sgMail;
}

export async function sendEmail(to: string, subject: string, html: string, from?: string) {
  const client = getSendGrid();
  const sender = from || process.env.EMAIL_FROM || 'no-reply@genbook.ai';
  if (!client) {
    logger.warn(`[Email] SendGrid not configured. Would send to=${to} subj=${subject}`);
    return { ok: true, provider: 'noop' };
  }
  try {
    await client.send({ to, from: sender, subject, html });
    logger.info(`[Email] Sent to=${to} subj=${subject}`);
    return { ok: true };
  } catch (e: any) {
    logger.error('[Email] Error', e);
    throw e;
  }
}
