# Raj Infra — Invoice / Products development build

## Included
- Products sidebar and product create/edit form, backend Products worksheet auto-creation, SKU duplicate checks.
- Invoice Builder with editable multiline descriptions, product selection, manual quantity/rate, 15% VAT calculation, client creation popup and draft print preview.
- Backend invoice item validation, finalized-invoice edit restrictions, hashed-password-only login, request-size limit and sanitized internal server errors.
- Products added to Apps Script setup.

## IMPORTANT — NOT PRODUCTION-READY OR ZATCA-COMPLIANT
- QR generation, bilingual certified PDF, amount-in-words, and actual Save & Print PDF are NOT implemented in this build. The preview uses browser print and is explicitly a draft.
- Existing source still uses three brand workspaces; this upgrade preserves that behavior to avoid destructive migration.
- Cloudflare WAF rate limiting, MFA, durable login throttling, security headers on static assets, session revocation and full security penetration tests are not configured.
- Do not deploy to production with real financial data until security review, build and end-to-end testing are complete.
- Products SKU uniqueness is best-effort on Google Sheets and subject to concurrent-write races.
- The invoice preview seller identity uses the current brand name; it does not include a verified seller VAT number or valid ZATCA QR.

## Setup
1. Backup existing Google Sheets and deployed Worker.
2. Run setupDatabase() in the existing spreadsheet if needed, or let the Worker create the Products tab when accessed.
3. Configure secrets using `wrangler secret put` and hashed users in USERS_JSON.
4. Set ALLOWED_ORIGIN to the exact application origin; configure Cloudflare WAF rate limits for /api/login.
5. Install dependencies and run `npm run build`, `npm test` in an internet-enabled environment.
6. Test products, invoice draft saving, client creation, permissions, and print layout before deployment.
