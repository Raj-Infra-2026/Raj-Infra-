> **V5.3:** Start with [`START_HERE_V5_3.md`](START_HERE_V5_3.md). Preview/demo invoices work; live ZATCA issuance remains blocked.

# ALIF LABS — Multi-company SaaS

ALIF LABS is a React/Vite website and unified Admin workspace, with a Cloudflare Worker backend and Google Sheets business storage.

## What's implemented in this release

- Public `/`, `/login` and `/register` pages with ALIF LABS identity.
- Registration saved to the master Google Spreadsheet's **Clients** tab with `Pending` status.
- You approve company registrations by setting **status (column H)** to `Active`.
- An installable Google Apps Script approval trigger automatically provisions each company's separate spreadsheet, creates business worksheets and shares it with the Worker service account. A scheduled retry reconciles failed/missed trigger events.
- Once the master `provision_state` column displays `Ready`, the company owner can log in to the single Admin workspace.
- Company-specific spreadsheet access is enforced by backend session-to-tenant mapping. There are no public staff or manager accounts.
- Client, quotation, delivery, vendor, purchase-order, settings and overview functionality remains from the supplied baseline.
- Product catalogue API/navigation is disabled; line items are entered manually.
- New tax-invoice **issuance is disabled by default** until a separate compliance process is completed. This prevents the development invoice builder from being treated as a live ZATCA-integrated system.
- Registration passwords are salted PBKDF2 hashes inside the master Google Sheet, **not plaintext**; this requires no extra database and avoids exposing customer passwords.

## Deployment and integration

Read **DEPLOYMENT.md** and **ZATCA_READINESS.md** before launch.

```bash
npm install
npm test
npm run build
npm run deploy
```

Only the offline integration test was executed in this environment. NPM dependency installation timed out, so a complete Vite production build was **not** verified here.

## Important limitations

- **Not ZATCA-certified or production-ready for live tax invoicing.** Phase 2 XML signing, CSID onboarding, clearance/reporting, cryptographic chaining and official compliance tests are not present.
- The Apps Script trigger and Google APIs need authorization and live verification against your new master spreadsheet. These cannot be configured from the uploaded ZIP.
- This version should be deployed to staging for business acceptance and tenant-isolation testing before being offered to live paying customers. Public registration should have robust anti-abuse protection, backups, monitoring, secure domain/TLS and a privacy policy.
- Only one Admin owner account per registered company is supported.
- Legacy data is not migrated automatically. Keep your original spreadsheets backed up and do not repurpose existing customer `Clients` tabs as the **master registry**.
