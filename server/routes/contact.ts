import express from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../supabase.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, reason, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields: name, email, message' });
    }

    // 1) Store in Supabase
    const { error: insertError } = await supabase
      .from('contact_messages')
      .insert({ name, email, reason, message });
    if (insertError) {
      console.error('Failed to insert contact message:', insertError);
      // continue to try sending email but report partial failure
    }

    // 2) Send notification email
    let emailSent = false;
    let previewUrl: string | null = null;
    let emailError: string | null = null;
    try {
      let transporter;
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
      } else {
        const test = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: test.user, pass: test.pass },
        });
      }

      const to = 'helpgenbook@gmail.com';
      const subject = `New Contact from ${name} (${reason || 'General'})`;
      const html = `
        <h2>New Contact Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Reason:</strong> ${reason || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap">${message}</pre>
      `;

      const info = await transporter.sendMail({
        from: 'GENBOOK.AI <no-reply@genbook.ai>',
        to,
        subject,
        html,
      });
      emailSent = true;
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    } catch (e: any) {
      emailError = e?.message || String(e);
      console.error('Email send failed:', emailError);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ok: true, dbStored: !insertError, emailSent, previewUrl, emailError });
  } catch (err: any) {
    console.error('Contact route error:', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

export default router;
