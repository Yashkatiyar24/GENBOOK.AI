import logger from '../logger.js';

let twilioClient: any | null = null;

function getTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!twilioClient) {
    // Lazy import to avoid dependency if not configured
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio');
    twilioClient = twilio(sid, token);
  }
  return twilioClient;
}

export async function sendSMS(to: string, body: string) {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const client = getTwilio();
  if (!client || !messagingServiceSid) {
    logger.warn(`[SMS] Twilio not configured. Would send to=${to} body=${body.slice(0, 120)}`);
    return { ok: true, provider: 'noop' };
  }
  try {
    const msg = await client.messages.create({ to, body, messagingServiceSid });
    logger.info(`[SMS] Sent ${msg.sid} to=${to}`);
    return { ok: true, sid: msg.sid };
  } catch (e: any) {
    logger.error('[SMS] Error', e);
    throw e;
  }
}
