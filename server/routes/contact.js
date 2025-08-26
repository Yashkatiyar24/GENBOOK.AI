import express from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../supabase.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, reason, message } = req.body || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Basic sanitization
    const safe = (s) => String(s).toString().slice(0, 10_000);
    const safeName = safe(name).trim();
    const safeEmail = safe(email).trim();
    const safeReason = reason ? safe(reason).trim() : null;
    const safeMessage = safe(message).trim();

    // Store in Supabase
    const { error: insertError } = await supabase
      .from('contact_messages')
      .insert({ name: safeName, email: safeEmail, reason: safeReason, message: safeMessage });
    if (insertError) {
      console.error('Failed to insert contact message:', insertError);
    }

    // Send email
    let emailSent = false;
    let previewUrl = null;
    let emailError = null;
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
      const subject = `New Contact from ${safeName} (${safeReason || 'General'})`;
      const html = `
        <h2>New Contact Submission</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Reason:</strong> ${safeReason || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap">${safeMessage}</pre>
      `;

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'GENBOOK.AI <no-reply@genbook.ai>',
        to,
        subject,
        html,
      });
      emailSent = true;
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    } catch (e) {
      emailError = e?.message || String(e);
      console.error('Email send failed:', emailError);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ok: true, dbStored: !insertError, emailSent, previewUrl, emailError });
  } catch (err) {
    console.error('Contact route error:', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

export default router;
