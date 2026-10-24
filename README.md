# Business Operations — React + Cloudflare Workers + Google Sheets

An initial **working CRUD starter** for three brands. **Not a production accounting, ZATCA or VAT-compliant invoicing system.** No paid database is required, subject to provider free-tier limits.

## Included
- Username/password login with 3 example accounts and server-enforced roles
- Brand selector with server-enforced brand isolation
- Dashboard counts and simple totals
- Clients, quotations, invoices, delivery notes, client POs, vendors and purchase orders
- Search across saved records, invoice status tabs, edit and status changes
- Browser print-to-PDF **drafts only**
- Google Sheets CRUD through a Cloudflare Worker, using a Google service account
- Google Drive link field for client POs (automatic uploads NOT implemented)

## 1. Prerequisites
Install Node.js LTS and Git. Create free accounts for GitHub, Cloudflare and Google Cloud. Free plans have quotas; Google Cloud may require billing verification for some services. Do not commit credentials.

## 2. Create Google Sheet
1. At sheets.google.com create a new spreadsheet, e.g. `Business Operations Database`.
2. Choose **Extensions > Apps Script**, paste `scripts/setup-sheets.gs` and run `setupDatabase` (approve permissions).
3. Confirm these 7 tabs exist: `Clients`, `Quotations`, `Invoices`, `DeliveryNotes`, `ClientPOs`, `Vendors`, `PurchaseOrders`.
4. Copy the spreadsheet ID from its URL between `/d/` and `/edit`.
5. In Google Cloud Console, create/select a project, enable **Google Sheets API**.
6. Under **IAM & Admin > Service Accounts**, create a service account, then create a **JSON key** (if your organization allows key creation). Keep the JSON secret. If key creation is disabled by organizational policy, this starter's authentication method won't work without modification.
7. Share the Google Sheet with the service account's `client_email` as **Editor**. Do not publish the Sheet publicly.

## 3. Run API locally
```bash
npm install
cp .dev.vars.example .dev.vars
```
Edit `.dev.vars`: `SPREADSHEET_ID`, `SERVICE_ACCOUNT_JSON` (complete JSON in one quoted line, preserving escaped `\\n` in private_key), `AUTH_SECRET` (strong random string), and `USERS_JSON` (replace all example passwords). These are server-side secrets. Then:
```bash
npx wrangler dev --port 8787
```
In a second terminal:
```bash
npm run dev
```
Open `http://localhost:5173`. The Vite proxy forwards `/api` to the Worker.

## 4. Upload to GitHub
From inside this folder:
```bash
git init
git add .
git commit -m "Initial business operations starter"
git branch -M main
```
Create a **private** empty repository on github.com, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
**Important:** `.dev.vars`, `.env` and service-account keys are ignored. Check `git status` before pushing.

## 5. Deploy Worker to Cloudflare
In Cloudflare dashboard, create a Workers project or run:
```bash
npx wrangler login
npm run deploy:worker
```
Copy the `https://...workers.dev` API URL. In Cloudflare **Workers & Pages > your Worker > Settings > Variables and Secrets**, add these **encrypted secrets**:
- `SPREADSHEET_ID`
- `SERVICE_ACCOUNT_JSON`
- `AUTH_SECRET`
- `USERS_JSON`

Update `ALLOWED_ORIGIN` in `wrangler.toml` to your final Cloudflare Pages site origin (e.g. `https://your-site.pages.dev`) and redeploy. During local testing you can use comma-separated origins: `http://localhost:5173,https://your-site.pages.dev`.

## 6. Deploy frontend to Cloudflare Pages
1. Cloudflare dashboard > **Workers & Pages > Create > Pages > Connect to Git**.
2. Authorize GitHub and select your repository.
3. Framework: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Add a **build-time environment variable** `VITE_API_URL` set to the deployed Worker base URL, e.g. `https://brandflow-api.your-account.workers.dev` (no `/api` suffix).
5. Deploy and visit the Pages URL. Update Worker `ALLOWED_ORIGIN` to match this exact origin, redeploy Worker.
6. Confirm login, brand access, record creation, search, and reload persistence.

## Roles and brand access
`USERS_JSON` contains an array of `{username,password,role,brands}`. Roles: `admin` (create/edit/archive), `manager` (create/edit), `staff` (create/view). Staff edit buttons are disabled. Set the actual brand access list for each user. Change display names in `src/main.jsx` `BRANDS`. **Do not place passwords in React source.**

## Current limitations / production checklist
- Authentication uses password secrets in Worker configuration and HMAC session tokens held in browser sessionStorage; suitable for controlled demos, **not** a hardened identity platform. Add proper identity management, password hashing, MFA, reset, rate limiting and session revocation for real clients.
- Sheets is not transactional; concurrent edits can overwrite each other. Unique UUIDs avoid simple ID collisions but not concurrent row updates. Implement locking/version checks or migrate to a transactional database before real multi-user financial operations.
- Document entries currently have free-text line items, not normalized product rows, inventory, tax calculations, or payment ledger.
- Invoice `Payment done` changes a status only; **does not create an auditable payment transaction**.
- PDFs use the browser print dialog and are **drafts**, not official tax invoices.
- Google Drive upload, proforma invoices, SKU/inventory, complete accounting, VAT reporting and ZATCA integration are **not implemented**.
- No automated backups. Set up regular protected exports, recovery tests and retention rules before real use.
- Audit trail and fine-grained permission rules are not implemented.
- For official Saudi invoicing, validate ZATCA obligations with a qualified specialist before deployment.
- Google Sheets API requests can be slow and are quota-limited; dashboard loads all seven tables.
- Do not use this starter for sensitive production customer data without security review.
