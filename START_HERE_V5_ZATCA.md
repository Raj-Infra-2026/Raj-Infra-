# ALIF LABS V5 — Complete Source + ZATCA Integration Workspace

This archive contains the complete ALIF LABS source (baseline + V4.3/V4.4/V4.5/V4.6 patches), plus ZATCA API gateway development code and onboarding/validation checklist.

**CRITICAL: THIS SOFTWARE IS NOT YET PHASE 2 COMPLIANT, NOT CLEARED, AND MUST NOT BE USED FOR LIVE TAX INVOICES.** There are no customer-issued certificates, secure ECDSA/XAdES signing workflow, ZATCA SDK validation or final submission response in this archive. The app's invoice POST endpoint fails closed even if ALLOW_TAX_INVOICE_ISSUANCE is set.

## Developer entry points

- `npm install && npm run build` (requires normal npm network/dependencies)
- `npm run test:zatca` (local mock tests only)
- `zatca/README.md` for onboarding, XML, credential and API workflow
- `zatca/cli.mjs` for manual API calls with authentic credentials and already-signed valid XML
- `worker/zatca/xml-draft.mjs` for **development preview only** (unsigned/incomplete)
- `GET /api/zatca/readiness` gives the current non-compliant status to an authenticated tenant

## What must happen before going live

Get taxpayer authorization, authoritative ZATCA onboarding, official certificate, full invoice data models, canonical hash/PIH/ICV, ECDSA signatures and Phase 2 QR tags, official SDK checks and actual clearance/reporting acceptance. Store credentials and signed originals securely, not in browser or Google Sheets. Only afterwards may the worker invoice-issuance flow be replaced with a secure authoritative transaction path.

**Never replace the real issuance timestamp with a backdated user-selected date in the ZATCA QR.** The UI's selected document date is not authority issuance evidence.

See https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/ComplianceEnablementToolbox/Pages/DownloadSDK.aspx
