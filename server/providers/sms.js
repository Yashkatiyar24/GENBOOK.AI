// Minimal SMS provider stub for local development
// Exports a sendSMS function used by the notification processor.
export async function sendSMS(to, body) {
  try {
    console.log(`[SMS Stub] Sending SMS to ${to}: ${String(body).slice(0, 200)}`);
    // In production replace with real provider integration (Twilio, etc.)
    return { success: true };
  } catch (err) {
    console.error('[SMS Stub] Error sending SMS:', err);
    throw err;
  }
}

export default { sendSMS };
