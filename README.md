# landing-page
A landing page for my website

## Security Baseline

- `index.html` is HTML-only (no inline `<style>` or inline `<script>`).
- Styling is served from `styles.css`.
- Interactivity is served from `app.js`.
- CSP is enforced from `/_headers` without `unsafe-inline`.

## Verification Checklist

- Run `wrangler pages dev .` and confirm the page renders and terminal commands still work.
- Open browser devtools and confirm there are no CSP violations.
- Validate headers with `curl -I https://<your-domain>`.
- Re-run external scans:
  - SecurityHeaders
  - Mozilla Observatory
  - SSL Labs
  - CSP Evaluator

## Control Plane Hardening

- GitHub: enable branch protection, secret scanning, push protection, and Dependabot.
- Cloudflare: enable Always Use HTTPS, TLS 1.3, DNSSEC, CAA, and managed WAF rules.
