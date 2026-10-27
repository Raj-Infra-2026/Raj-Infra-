# Raj Infra Premium — Starter Project

This is a **new standalone starter** based on the requirements discussed in chat, **not a patch of your existing GitHub source**. Back up the existing repository before replacing anything. No secrets are included.

## Included
- Animated premium login and overview dashboard; responsive layout and reduced-motion support.
- Unified single-business workspace (no Brand 1/2/3 selectors or brand filtering).
- Clients, Quotations, Invoices, Delivery Notes, Client POs, Vendors, Purchase Orders basic list/create flows.
- Client records shared by ID across all sales document forms; client lookup refreshed every 30 seconds and on window refocus.
- Cloudflare Worker with HMAC SHA-256 authentication and Google Sheets service account API.
- Admin/manager/staff permissions for basic CRUD API.

## Local setup
1. Install Node.js 20+.
2. `npm install`
3. `npm run dev` (frontend only; API proxy expects local Wrangler on port 8787).
4. In another terminal, `npx wrangler dev` (configure development secrets separately).

## Google Sheets
Create a spreadsheet with tabs named exactly: `Clients`, `Quotations`, `Invoices`, `DeliveryNotes`, `ClientPOs`, `Vendors`, `PurchaseOrders`.
Each tab must use the same header columns A:I:
`id | brand_id | reference | name | status | amount | date | updated_at | extra_json`
Column B is reserved for compatibility with the old layout but is unused. Existing records are not automatically migrated.
Share the sheet with the service account `client_email` as Editor.

## Cloudflare secrets
Set the following on the **raj-infra** Worker under Settings > Variables and Secrets:
- `AUTH_SECRET`: strong random secret
- `USERS_JSON`: JSON array with `username`, `password`, `role` fields (admin/manager/staff); no brand fields required
- `SERVICE_ACCOUNT_JSON`: complete Google service-account JSON
- `SPREADSHEET_ID`: spreadsheet ID only
Never put these in GitHub. `ALLOWED_ORIGIN` is set in wrangler.toml; update it if using a custom domain.

Build: `npm run build`; deploy: `npx wrangler deploy`.

## Important limitations
This is a functional **starter/prototype**, not a completed ERP. It does NOT yet include: PDF generation, payment workflows, accounting ledger, edit UI, vendor selectors on purchase orders, search-as-you-type client selector, client detail snapshot policies, audit trail, secure password hashing, concurrency control, ZATCA e-invoicing, or comprehensive testing. It uses plaintext passwords in Cloudflare secret JSON to match the previous prototype; replace this authentication approach before production. Google Sheets is not a transactional database. Do not use with real financial data until these are implemented and verified.

The `keep_vars` option requires compatible Wrangler configuration and should be checked against the deployed Wrangler version. Do not overwrite a working production Worker before confirming secrets and sheet compatibility.


## Excellence v2 additions
- Edit existing clients, quotations, invoices, delivery notes, vendor records and purchase orders.
- Manager can edit client master records, but cannot change the client ID or client name assigned to an existing sales document; backend enforces this. Admin can change the assigned client. Staff can create and read but cannot edit.
- Refreshed animated signature sculpture on login and dashboard, including reduced-motion support.
- Shared client lookup remains available in sales document creation and editing; updates are refreshed on an interval.
- The `brands` field in existing USERS_JSON is ignored by this unified-business backend.
- Keep all Cloudflare secrets outside this ZIP. Do not deploy until you back up your live application and test against a copy of your Google Sheet.
- This is not a complete accounting solution or production-grade invoicing system.
