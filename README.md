# Raj Infra V2 — Part 1 (integrated upload-ready source)

**This ZIP is an integrated Part 1 release, not the entire final V2 roadmap.** It contains the original project architecture (React/Vite, Cloudflare Worker, Google Sheets) and a new frontend with three independent role-specific themes. No existing data or deployed website has been modified.

## What's included in Part 1

- **Admin → Graphite Pulse**, **Manager → Obsidian Aurora**, **Staff → Ivory Atelier**. Each supports a distinct light and dark mode, with saved preference.
- New sidebar, header, responsive navigation, premium hover animations, role-specific dashboard content, keyboard focus styles, reduced-motion support, and an animated lightweight **SVG** Raj Ascent signature (not a true Three.js 3D mesh).
- Horizontal snap carousels for action shortcuts and document highlights; mouse/touch scrolling and arrow controls.
- Three-brand switcher with server-side brand filtering; permitted brands configured in `USERS_JSON`.
- `Ctrl + K` / `⌘ + K` search overlay with Worker-backed, brand-scoped results.
- Pending/unpaid record notification drawer (derived from existing data; not real-time push notifications).
- Basic invoice workflow board with server-side status updates for admin/manager (no drag-and-drop yet).
- Basic document line-item editor, server-validated totals, and browser Print/Save as PDF (not branded PDF generation yet).
- Operational analytics from current record counts and recorded document values (not accounting statements).
- Floating shortcuts, local theme/sidebar preferences, guided onboarding, admin-only audit history.
- Worker changes: brand isolation, permission checks, sanitized record input, soft archive for admins, hashed-password support, Google OAuth token caching, and best-effort audit log writes.
- The original seven Sheets tabs are preserved with the same nine columns A:I. A new `AuditLogs` tab is added by the setup script.

## Important: deployment order

1. **Back up** your GitHub repository and **make a copy of the Google spreadsheet** before any deployment. Do not replace production directly without testing.
2. Open your spreadsheet > **Extensions > Apps Script**. Replace the old setup script with `scripts/setup-sheets.gs` and run `setupDatabase()`. It adds missing headers/tabs without deleting existing data.
3. Run `inspectUnassignedBrands()` to count old records without a brand ID. **Existing blank-brand records are intentionally hidden by V2 until you assign their correct brand.** This prevents cross-brand leaks. Do not bulk-assign without verifying which brand each row belongs to.
4. Configure `BRANDS_JSON` to your actual **three brand names and stable IDs**. Example below uses placeholders only.
5. Update `USERS_JSON` so each manager/staff account includes the brand IDs it may access. Admin can access all three.
6. Configure Worker secrets and verify the allowed frontend origin. Deploy first to a **staging Worker** or local environment and test each role before replacing production.
7. Install dependencies, build, and deploy using the commands below.

## GitHub upload — no folder confusion

**This ZIP contains `src/`, `worker/`, `scripts/`, and configuration files at its root.** Extract it, select all extracted contents, and upload those files/folders directly to the **root of your existing GitHub repository**. Do **not** create an extra nested `Raj-Infra-V2-Part1` folder in GitHub. The source entry is `src/main.jsx`, and the backend entry is `worker/index.js`.

Do not upload `node_modules`, `dist`, `.dev.vars`, `.env`, or any service account key. `.gitignore` is provided.

## Development commands

```bash
npm install
npm run test  # offline Worker smoke tests
npm run build
# Terminal A: Cloudflare Worker (requires local secrets)
npm run worker:dev
# Terminal B: Vite frontend, proxies /api to localhost:8787
npm run dev
```

Visit `http://localhost:5173`. A successful login requires configured Worker secrets and a Google Sheet shared with the service account.

Production deployment (only after tests):

```bash
npm run deploy
```

## Worker configuration

The `wrangler.toml` in this package keeps the original Worker name `raj-infra` and its existing deployment origin. **Check these settings before deploying.**

Required secrets (run `npx wrangler secret put SECRET_NAME` separately for each):

- `AUTH_SECRET` — long random signing secret.
- `USERS_JSON` — JSON array of users. Prefer `password_hash` and `password_salt` (see below).
- `SERVICE_ACCOUNT_JSON` — full Google service account JSON, as a Worker secret only.
- `SPREADSHEET_ID` — Google spreadsheet ID.
- `BRANDS_JSON` — optional JSON array with exactly three `{id,name}` entries. Strongly recommended.

Example brand configuration (**replace names/IDs with your real brands**):

```json
[{"id":"BRAND-1","name":"Brand One"},{"id":"BRAND-2","name":"Brand Two"},{"id":"BRAND-3","name":"Brand Three"}]
```

Example user structure (replace with actual values, **do not commit**):

```json
[
  {"username":"admin-example","role":"admin","password_salt":"...","password_hash":"..."},
  {"username":"manager-example","role":"manager","brands":["BRAND-1","BRAND-2"],"password_salt":"...","password_hash":"..."},
  {"username":"staff-example","role":"staff","brands":["BRAND-1"],"password_salt":"...","password_hash":"..."}
]
```

Generate password hashes with `node scripts/hash-password.mjs`. Legacy plaintext `password` entries are accepted **only for migration compatibility**; replace them before production. The included CLI displays password input on screen, so use it privately.

**CORS:** `ALLOWED_ORIGIN` in `wrangler.toml` includes the original Workers URL and local Vite origin. Replace with your actual production domain(s), comma-separated. API calls on the same domain work without an `Origin` header.

## Feature status / not yet finished

| Feature | Part 1 | Later phase |
|---|---|---|
| Three role designs and light/dark | Implemented | Visual QA on real devices |
| Responsive hover, basic carousels | Implemented | Advanced spring physics, role-specific document carousels |
| Raj Ascent signature | Animated SVG | True interactive 3D mesh |
| Brand switcher and isolation | Implemented for assigned records | Safe migration of old unassigned data |
| Search | Live server-side basic search | Indexed search, relevance ranking |
| Notifications | Derived pending/unpaid drawer | Persistent read/unread, push, scheduling |
| Workflow | Basic invoice status controls | Drag/drop, transition rules, cross-document workflows |
| Document builder | Line items, calculations, browser print | Numbering, VAT/legal templates, payment history, branded PDFs |
| Analytics | Current record counts and gross values | Revenue analytics, dates, trend comparisons |
| Audit | Best-effort append on create/edit/archive | Tamper-resistant/transactional audit storage |
| Workspace preferences | Local browser settings | Server-synced per-user preferences |
| Onboarding | Guided help | Contextual tours |
| File uploads / accounting | Not included | Planned |

## Security / data notes

- Existing Google Sheets records with blank `brand_id` are **not visible** in the new UI; carefully assign them to the correct brand before using V2 with real data.
- Sheets writes and audit writes are not atomic; if audit logging fails, the API reports `audit_warning`. Google Sheets is not a tamper-proof audit store.
- The Worker does not yet have distributed rate limiting, CSRF-resistant cookie sessions, or enterprise identity integration. Keep the project in staging until these are addressed for your threat model.
- Search and overview read multiple Sheets tabs and can be slow with large datasets; pagination, caching, and a transactional database may be necessary at scale.
- `BRANDS_JSON` uses placeholder names if not configured. Configure real names before rollout.
- `USERS_JSON` changes will take effect at next login; existing signed sessions may remain valid for up to 8 hours.
- Browser print is not an invoice-compliance solution; validate local legal and tax requirements before issuing commercial documents.
- `package-lock.json` is not included because dependencies could not be fetched in the build environment. Run `npm install` on your computer and commit the generated lockfile after verifying versions.

## Verification checklist

- [ ] All three roles can log in and see only their authorized brands.
- [ ] Admin sees Graphite Pulse, Manager Obsidian Aurora, Staff Ivory Atelier.
- [ ] Each role switches between light and dark mode and the preference persists.
- [ ] Manager cannot rename an existing client or change the client on an existing sales document.
- [ ] Staff cannot edit or archive records; only Admin can archive.
- [ ] A record created in Brand One does not appear when switching to Brand Two.
- [ ] AuditLogs entries appear after creating and editing a record.
- [ ] Search, workflow, browser print, and analytics behave as expected.
- [ ] No credentials are committed to GitHub.
- [ ] Test in a staging deployment before publishing.
