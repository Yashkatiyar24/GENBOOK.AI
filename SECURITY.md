## Security Policy

### Supported Versions
Only the latest main branch and the most recent tagged release receive security patches.

### Reporting a Vulnerability
Please email security@genbook.ai with details. Include:
1. Affected endpoint or component
2. Reproduction steps / PoC
3. Expected vs actual behaviour
4. Impact assessment (confidentiality / integrity / availability)

You will receive an acknowledgement within 2 business days. We target fixes within 14 days for High/Critical issues.

### Handling Sensitive Data
- PHI / PII should never be logged. (Logger scrubbing TODO)
- Avoid sending secrets to Sentry. (PII scrubbing TODO)
- Environment secrets are loaded only at process start.

### Roadmap (Hardening Items)
- [ ] Add logger redaction for tokens / keys / emails
- [ ] Add Content Security Policy reporting endpoint
- [ ] Implement automated dependency vulnerability scanning (e.g. GitHub Dependabot / npm audit in CI)
- [ ] Add dynamic application security tests (DAST) in staging
- [ ] Add per-tenant rate limiting and abuse detection heuristics

### Encryption
All transport leverages HTTPS (enforced at edge / hosting layer). Database encryption at rest is provided by the managed Postgres provider (Supabase / underlying cloud). Field‑level encryption for especially sensitive medical data to be added prior to handling production PHI.
