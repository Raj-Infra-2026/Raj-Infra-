# Raj Infra V2 — Unified Workspace (No Brands)

One workspace for all existing Google Sheets records, with three role-specific visual themes:
- Admin: Graphite Pulse
- Manager: Obsidian Aurora
- Staff: Ivory Atelier

All roles have light/dark mode. The brand selector, Brand One/Two/Three, BRANDS_JSON and brand-based record filtering have been removed. **Existing records with empty or nonempty brand_id are visible** subject to role permissions. No migration is required.

## Deployment

1. Back up the live Worker configuration and Google Sheets before deploying.
2. Upload the repository contents (not the outer folder) to GitHub.
3. Confirm Cloudflare is deploying Worker `raj` from `wrangler.toml` with `npm run deploy`.
4. Verify secrets `AUTH_SECRET`, `USERS_JSON`, `SPREADSHEET_ID`, `SERVICE_ACCOUNT_JSON` remain configured for Worker `raj`. `USERS_JSON` needs `username`, `role`, and either a hashed password or legacy `password`; `brands` is no longer required.
5. No need to run `setupDatabase()` on existing populated spreadsheets. It is additive and retains the original nine-column format. Column B is preserved but unused for access checks.
6. Test `/api/health`, login, Clients, and read/create/edit permissions in a staging environment before updating production.

## Role permissions

- Admin: read, create, update, archive.
- Manager: read, create, update. Existing client names are locked from manager editing.
- Staff: read and create.

## Existing limitations

The health endpoint only verifies the Worker is responding. Google Sheets read/write access requires correct credentials and spreadsheet sharing. Document PDFs are browser print previews. No complete accounting, push notifications, or production 3D scene yet. The AuditLogs sheet is optional for reading, but recommended for event history; audit write failures are reported as warnings.

## Local commands

```sh
npm install
npm test
npm run build
npm run deploy
```

Keep credentials out of GitHub.

## Products / Invoices / Delivery Notes update

See [DEPLOY_AND_TEST.md](DEPLOY_AND_TEST.md) for the new Products worksheet, document builders, invoice calculations, bilingual A4 browser PDF printing, role permissions and deployment verification. Existing seven worksheet schemas remain unchanged.
