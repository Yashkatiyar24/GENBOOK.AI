# GENBOOK.AI Deployment Guide

This document describes how to deploy the API server and Email server for GENBOOK.AI, configure environments, security, and deliverability. Payments/Stripe are out of scope here.

## 1) Prerequisites
- Node 18+
- PostgreSQL provided by Supabase
- Domain/DNS access for email (SPF/DKIM/DMARC)

## 2) Environment Variables
Create a `.env` from `.env.example` and populate:

- Supabase (frontend and email server)
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY (server-only)
- API CORS
  - ALLOWED_ORIGINS (comma-separated list; include your production app domains and localhost during dev)
- Email server
  - EMAIL_API_PORT (default 8787)
  - EMAIL_FROM (e.g., "GENBOOK.AI <no-reply@genbook.ai>")
  - SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS (prod)
  - In dev, SMTP credentials are not required (Ethereal is used automatically)
- Monitoring (optional)
  - SENTRY_DSN

See `.env.example` for a complete list and defaults.

## 3) Security Hardening (already enabled)
- CORS allowlist via `ALLOWED_ORIGINS` in `server/index.ts` and `server/emailServer.mjs`.
- Security headers with Helmet in `server/index.ts`.
- Rate limits:
  - API: `POST /api/contact` (5 req/min/IP)
  - Email: `/api/send-welcome` and `/api/send-reset` (5 req/min/IP)
- Basic request validation for email and contact endpoints.

## 4) Health Checks
- API: `GET /health` → `{ status: "ok" }`
- Email: `GET /health` → `{ ok: true, service: "email" }`
Use your uptime provider (e.g., Betterstack, UptimeRobot) to monitor these endpoints.

## 5) Email Deliverability (Production)
1. Choose an email provider (SES, Resend, SendGrid, Mailgun).
2. Verify sending domain and configure DNS:
   - SPF (TXT): include your provider
   - DKIM (CNAME/TXT): as provided by your vendor
   - DMARC (TXT): e.g., `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com`
3. Set `EMAIL_FROM` to a verified from-address at your domain.
4. Test via the email server endpoints and verify inbox placement.

## 6) Supabase RLS (Multitenancy)
Audit and enforce RLS policies for tenant isolation across these tables:
- appointments, contacts, user_settings, user_profiles, family_members, contact_messages (and any other domain tables)
Ensure only the owning tenant can read/write their rows, with least-privilege rules. Keep policies in migrations for reproducibility.

## 7) Running Locally
- Install dependencies: `npm install`
- Start Vite dev server: `npm run dev`
- Start Email server (separate terminal): `npm run email:dev`
- Test:
  - API: `curl -s http://localhost:3001/health`
  - Email: `curl -s http://genbookai.tech/health`

## 8) Deploying
- API server: host on your Node runtime (Render/Heroku/Fly/EC2). Ensure env vars and reverse proxy pass `Origin` headers for CORS.
- Email server: deploy as a separate Node process or service; expose only the needed POST/GET endpoints.
- Configure your proxy/CDN for HTTPS, HTTP/2, and caching of static assets (frontend).

## 9) Observability
- Sentry: set `SENTRY_DSN` and confirm initialization in `server/index.ts` (already minimal). Optionally add the request/trace handlers.
- Logs: API includes lightweight request ID logging. Pipe stdout/stderr to your log shipper (e.g., CloudWatch, Logtail, Datadog).

## 10) Notes on Vite 7 Upgrade
- Project uses Vite 7 as part of security remediation. If dev server config/plugins need adjustments, see Vite 7 migration notes.

## 11) Post-Deployment Checklist
- [ ] Health endpoints green in monitoring.
- [ ] CORS allowlist correct for prod domains.
- [ ] Emails deliver and pass SPF/DKIM/DMARC.
- [ ] RLS policies verified (no cross-tenant access).
- [ ] Error tracking receiving events from API and client.
- [ ] Backups/restore plan documented for Supabase.
