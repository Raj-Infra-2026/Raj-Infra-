# ALIF LABS — Manual staging deployment checklist

## 1. Make a NEW, EMPTY master Google Spreadsheet

Create a spreadsheet named `ALIF LABS — Master Registry`. Do not use your former one-company customer database as the master registry (both contain a tab named `Clients` with **different** schemas).

In the master spreadsheet: **Extensions > Apps Script**. Paste the contents of `scripts/alif-master-setup.gs` into the script editor. This is a spreadsheet-bound project.

In **Project Settings > Script properties**, set `SERVICE_ACCOUNT_EMAIL` to the `client_email` inside your service-account JSON. This account must be allowed to edit spreadsheets shared by your approving Google account. The service account does not need to own the spreadsheet.

Run `setupAlifMaster()` once and authorize it; then run `installAlifTriggers()` and authorize Drive and Sheets access. Confirm Apps Script shows two installed triggers: an edit trigger and a scheduled reconciliation trigger. Keep the spreadsheet private. Manually test them with an actual registration.

Master `Clients` columns (A:M):

`tenant_id | company_name | owner_name | email | password_salt | password_hash | phone | status | spreadsheet_id | created_at | provision_state | provisioned_at | provision_error`

When you change `Pending` to `Active` in column **H**, Apps Script generates a separate tenant spreadsheet, creates all required tabs, and fills `spreadsheet_id` and `provision_state=Ready`. In case of errors, examine column **M**, Apps Script execution logs, and the service account sharing permissions. Retry happens approximately every five minutes.

## 2. Configure the Worker (secrets, not in GitHub)

Use a **separate staging Worker**. In its Cloudflare secrets/environment configure:

- `AUTH_SECRET` — a strong randomly generated secret (at least 32 random bytes).
- `SERVICE_ACCOUNT_JSON` — the complete service-account JSON.
- `MASTER_SPREADSHEET_ID` — the new master spreadsheet ID.
- `ALLOWED_ORIGIN` — change the value in `wrangler.toml` to your exact deployed ALIF LABS HTTPS origin, not a wildcard. Include `http://localhost:5173` only for local development.

No `USERS_JSON`, brand setting, or shared `SPREADSHEET_ID` is used by the new login architecture. Do not commit sensitive credentials or service-account files.

The Worker still needs access to the master spreadsheet: share the **master** with the service-account email as Editor, and confirm the service account can read the master `Clients` worksheet. The Apps Script shares each individual tenant sheet automatically after approval.

## 3. Test the whole flow

1. Open public `/register`, submit a real company test account; verify a new Pending master row with a hashed password and blank spreadsheet ID.
2. Verify pending login is blocked.
3. Change status H to Active; verify provisioning completes and the new spreadsheet includes `Clients, Quotations, Invoices, DeliveryNotes, ClientPOs, Vendors, PurchaseOrders, AuditLogs, CompanySettings`.
4. Login as that owner, create a test customer, refresh and verify it exists **only** in the corresponding tenant spreadsheet.
5. Repeat with a second company; verify no cross-company records appear in search, dashboard or records APIs.
6. Suspend the first account and verify access is blocked.
7. Test duplicate email registration, incorrect password, mobile browser layout, and expired sessions.
8. Confirm that Product catalogue endpoints are disabled and the old business spreadsheets have not been modified.
9. Confirm new tax invoice creation is blocked until official compliance and onboarding are complete.

The offline test is `node tests/multi-tenant.mjs`.

## 4. Production gates (not yet fulfilled)

- [ ] Correct DNS, domain branding and HTTPS
- [ ] Live end-to-end staging test of Google Apps Script provisioning
- [ ] Build verified (`npm run build`) on a networked workstation / CI
- [ ] Login/registration anti-abuse protection (Cloudflare WAF/Turnstile), password recovery, email verification
- [ ] Privacy policy, data processing agreement, backup/restore drill, support and incident procedures
- [ ] Google Sheets quota, concurrent writes, duplicate registrations and operational recovery load testing
- [ ] Formal ZATCA Phase 1 verification with a qualified tax/technical reviewer
- [ ] ZATCA Phase 2 integration and sandbox tests, when required by the tenant
- [ ] Clear handover of ongoing admin responsibilities and service-account ownership

**Do not enable `ALLOW_TAX_INVOICE_ISSUANCE=true` as a shortcut.** In this baseline the tax-invoice engine has not been proven compliant. This flag is a protective stop, not a certification switch.
