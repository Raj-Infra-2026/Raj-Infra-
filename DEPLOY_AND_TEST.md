# Raj Infra V2 — Products, Invoices and Delivery Notes

## Scope

This update starts from the previous **No Brands / Unified Workspace** source. Existing dashboard designs, permissions, Cloudflare Worker name `raj`, original seven tables, and original record API paths remain in place. The product **brand** field is only a product attribute; it is not a workspace selector.

## Deploy safely

1. Back up the GitHub repository and Google Spreadsheet first.
2. Upload all ZIP contents to the **root** of the existing GitHub repository. Do not upload the outer folder as an extra nested level.
3. Keep the existing Cloudflare Worker `raj` and its secrets: `AUTH_SECRET`, `USERS_JSON`, `SPREADSHEET_ID`, `SERVICE_ACCOUNT_JSON`. Do not commit secrets to GitHub.
4. Deploy with the existing GitHub-to-Cloudflare build/deploy workflow or run `npm ci` (if a lockfile is available) / `npm install` and `npm run deploy` using an environment with internet access.
5. Open `https://raj.ani-infra.workers.dev/api/health` and confirm `{"ok":true}`. This only checks API routing, not Google Sheets credentials.
6. Log in as Staff, open **Products**. The Worker will check for a worksheet named `Products` in the **same** spreadsheet and create it, with headers, if missing. The service account needs spreadsheet editor access.
7. Create a product, refresh, and verify it appears in the **Products** worksheet. Attempt a duplicate SKU and verify it is rejected.
8. Open **Invoices**, select a client, select a product, enter quantity and rate. Save, reopen, and print. Confirm the row and `data_json` appear in the existing `Invoices` worksheet.
9. Open **Delivery Notes**, choose **New Delivery Note**, enter sender details, save and print. Confirm in the existing `DeliveryNotes` worksheet.
10. Verify legacy Clients, Quotations, Purchase Orders, Vendors and other modules are still accessible.

## Products worksheet schema (A:G)

`id | product_name | product_brand | sku | created_at | updated_at | status`

- Created automatically by the backend upon first Products request; the optional Apps Script setup also creates it if missing.
- The Worker refuses to overwrite an existing Products tab if the headers differ.
- SKU uniqueness is checked case-insensitively against current active products. Google Sheets is not transactional: simultaneous competing writes cannot be guaranteed unique under high concurrency. For high-volume deployments, use a transactional database.
- Product deletion is soft deletion (`status=Deleted`), preserving old invoice line snapshots.

## Invoice builder

- Uses the original `Invoices` worksheet (A:I). New fields, seller/buyer snapshots and product line details are saved inside the existing `data_json` column I. No columns are removed or reordered.
- Subtotal = sum(quantity × unit rate), VAT = 15%, grand total = subtotal + VAT, calculated again on the backend.
- Document numbers use `INV-YYYY-<UUID-prefix>` and `DN-YYYY-<UUID-prefix>` to avoid predictable duplicate sequences; they are not ZATCA invoice sequence compliance guarantees.
- **Preview PDF** opens a printable A4 HTML preview. **Save & Print PDF** saves successfully to Google Sheets **before** opening the populated print preview. Choose *Save as PDF* in your browser's print dialog. This is browser-based PDF export, not a separate PDF file storage service.
- The bilingual English/Arabic print layout uses browser text rendering, RTL markup and an embedded QR generator (MIT licensed). A TLV QR is generated only if the seller's VAT number is 15 digits. This is **not** a certification of ZATCA compliance. E-invoicing obligations, phase-two integration, invoice schema, mandatory fields and cryptographic requirements must be reviewed separately.
- Previously saved invoices and delivery notes have **View / Print** in their table rows.

## Delivery Notes

- The Delivery Notes button reads **New Delivery Note**.
- Sender company name, CR, VAT, address, phone and email are editable per delivery note.
- Products, quantities, units, remarks, reference, receiver details and bilingual A4 print view are supported.

## Local verification performed

- `node tests/worker-smoke.mjs` — legacy backend routes and role permissions.
- `node tests/products-invoices.mjs` — Products sheet creation, headers, CRUD, SKU duplication, invoice VAT, delivery note storage and old clients.
- JSX parsed with TypeScript's TSX parser, QR matrix generation smoke test.

**Not verified here:** a full `npm run build` (dependencies unavailable in the offline runtime), real Cloudflare deployment, live Google Sheets read/write, and physical browser print/PDF rendering. Test on staging before replacing production.
