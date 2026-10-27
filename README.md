# Raj Infra — Obsidian V4

Complete visual redesign of the prior Raj Infra Atelier V3 starter. This is a standalone React/Vite + Cloudflare Worker + Google Sheets project, not a patch applied to your live GitHub repository.

## Changes
- No blue UI: graphite, antique gold, forest green, terracotta, and cream.
- Distinct CSS 3D art for Admin (kinetic rings), Manager (glass botanical bloom), and Staff (floating geometric totem).
- New login architectural sculpture, redesigned navigation, records, cards and forms.
- Custom animated branded loading transition (approx. 0.85–1.1s on page transitions/sign-in).
- Manager cannot rename an existing client. The client name field is read-only in UI; the Worker rejects a changed name in PATCH requests. Manager also cannot change an existing document's client ID or document name. Staff has no edit permission; admin can edit.
- Client directory shared across quotations, invoices, delivery notes and client purchase orders. Automatic refresh every 30 seconds and on tab focus.

## Run locally
1. `npm install`
2. `npm run dev`
3. Configure the backend secrets on Cloudflare, then build using `npm run build` and deploy using `npx wrangler deploy` after checking the Cloudflare deployment settings.

## Secrets (NEVER commit values)
`AUTH_SECRET`, `USERS_JSON`, `SERVICE_ACCOUNT_JSON`, `SPREADSHEET_ID`. Keep secrets in Cloudflare production environment. For `USERS_JSON`, each account should have `username`, `password`, and `role` (`admin`, `manager`, `staff`).

## Existing Google Sheet tabs
`Clients`, `Quotations`, `Invoices`, `DeliveryNotes`, `ClientPOs`, `Vendors`, `PurchaseOrders`. Existing data schema columns A:I retained.

## Safety and known limitations
Back up the existing project and Google Sheets before deployment. This is not production certified: browser/live Google Sheets integration not tested in this environment. Google Sheets is not transaction-safe for concurrent editing; document/PDF/accounting workflows are not complete. Current user passwords are stored as plaintext in USERS_JSON; migrate to password hashing/managed identity before real production use. Avoid uploading service account JSON into the ZIP or repository.
