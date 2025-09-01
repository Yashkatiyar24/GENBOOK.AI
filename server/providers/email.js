// Minimal email provider stub for local development
// Exports a sendEmail function used by the notification processor.
export async function sendEmail(to, subject, html) {
  try {
    console.log(`[Email Stub] Sending email to ${to} - subject: ${subject}`);
    // In production replace with real provider integration (SendGrid, SES, etc.)
    return { success: true };
  } catch (err) {
    console.error('[Email Stub] Error sending email:', err);
    throw err;
  }
}

export default { sendEmail };
