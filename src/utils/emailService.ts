// NOTE: This file is executed in the browser bundle.
// Do NOT import server-only modules (nodemailer, fs, path, etc.) here.
// Instead, provide a safe stub for client-side usage.

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

// Client function hitting local/serverless email API
export async function sendEmail(options: EmailOptions) {
  // Use backend-mounted email route; allow separate backend via VITE_BACKEND_URL
  const apiBase = (import.meta as any)?.env?.VITE_BACKEND_URL ? String((import.meta as any).env.VITE_BACKEND_URL).replace(/\/$/, '') : '';
  const url = `${apiBase}/api/email/send-welcome`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        template: options.template,
        // Map expected template variables
        user_first_name: options.context?.user_first_name,
        confirm_url: options.context?.confirm_url || options.context?.login_url,
        app_name: options.context?.app_name || 'GENBOOK.AI',
        redirect_to: options.context?.redirect_to,
        app_origin: options.context?.app_origin,
      }),
    });

    if (!res.ok) {
      const err = await safeJson(res);
      console.warn('[emailService] Email API responded with error:', err);
      return { messageId: 'client-fallback', previewUrl: null } as any;
    }

    return await res.json();
  } catch (e) {
    console.warn('[emailService] Email API not reachable; falling back to no-op.', e);
    return { messageId: 'client-fallback', previewUrl: null } as any;
  }
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return { status: res.status, statusText: res.statusText }; }
}

// Example usage:
// await sendEmail({
//   to: 'user@example.com',
//   subject: 'Welcome to Genbook AI!',
//   template: 'welcome-email',
//   context: {
//     user_first_name: 'John',
//     login_url: 'https://app.genbook.ai/login',
//     help_center_url: 'https://help.genbook.ai',
//     privacy_policy_url: 'https://genbook.ai/privacy',
//     terms_url: 'https://genbook.ai/terms'
//   }
// });
