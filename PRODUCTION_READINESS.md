## Production Readiness (Initial Checklist Implemented)

This document tracks minimum steps taken to move toward a sellable SaaS baseline.

### Added In This Commit
- LICENSE file (explicit MIT)
- Basic environment variable validation (`server/utils/env.ts`)
- Readiness endpoint `/ready` (DB + queue check)
- Global API rate limit (default: 300 req / 5 min / IP) + existing granular limit for contact form
- Content Security Policy via `helmet` with conservative defaults
- Process level error handlers for `unhandledRejection` & `uncaughtException`
- Security & readiness documentation stubs

### Still Outstanding (High Priority Before Launch)
- Formal threat model & STRIDE review
- Comprehensive RLS audit for all new tables (usage counters, billing, analytics)
- Add integration & load tests (baseline p95 latency, saturation point)
- Implement SLOs (e.g. 99.9% availability, <300ms p95 for core booking API)
- Centralized logging & alerting rules (Sentry + Prometheus alerts)
- Webhook signature negative test suite
- Data retention & privacy policy documents
- Backup / restore runbook (verify PITR)
- Automated dependency & container vulnerability scanning in CI

### Medium Priority
- Structured audit log table w/ tamper-evident hash chain
- Field-level encryption for sensitive medical metadata
- Rate limit tuning & per-tenant quotas
- API key issuance & revocation (if public API planned)
