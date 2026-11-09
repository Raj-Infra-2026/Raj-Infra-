# ALIF LABS V5 — ZATCA integration workspace (NOT production-ready)

**Status: integration development tools. Real Phase 2 onboarding, digital signing, PDF/A-3, SDK validation, and live end-to-end testing are NOT complete.** Do not issue statutory tax invoices from this application yet. The Worker deliberately blocks such issuance; it must only be enabled after authenticated backend signing, chaining, immutable archival and authority response workflow are integrated and tested.

## Existing functionality and current gaps

- `worker/zatca/xml-draft.mjs`: unsigned sample UBL invoice only, NOT valid to submit. Limited 15% VAT and missing multiple required tags/attributes.
- `worker/zatca/draft-validation.mjs`: basic preflight; not the ZATCA SDK.
- `zatca/api-client.mjs`: real ZATCA HTTP API transport for CSID onboarding and signed invoice checks, clearance and reporting. **It does not sign invoices or calculate ZATCA-specific invoice hashes.**
- `zatca/cli.mjs`: manual development/operator gateway. No secrets bundled and no automatic uploads.
- `src/BusinessModules.jsx`: five-tag TLV QR only; it is *not* a Phase 2 cryptographically stamped QR. Real QR must come from the approved XML signing and clearance process.
- `src/pdfDownload.js`: canvas PDF for internal preview, not yet validated bilingual ZATCA invoice output or PDF/A-3 with embedded XML.

## Official mandatory implementation work before live issuance

1. Gather taxpayer's authorized VAT/CR, Arabic legal seller identity, national address, buyer identification, sales tax categories and document transaction types.
2. Choose per-tenant / per-device secure signing credential isolation. Complete CSR generation and OTP-based Compliance CSID enrollment using the ZATCA portal.
3. Generate all required invoice, credit and debit note UBL document types and satisfy the current XML implementation standard, including UUID, invoice counter (ICV), previous invoice hash (PIH), references, addresses and tax subtotals.
4. Implement canonicalized invoice SHA-256 hash, XML XAdES ECDSA signature, cryptographic stamp, and required TLV tags 6–9 using the **official SDK**; do not invent these fields.
5. Pass official local SDK validations, sandbox compliance checks for required invoice types, and production CSID onboarding. Submit standard invoices for clearance before delivering final invoice and simplified invoices for reporting per required timing.
6. Build server-only trusted workflow with atomic immutable sequence management, durable audit and retry/reconciliation handling; bind cleared XML + original QR to stored invoice. Never generate ZATCA QR from user-editable dates.
7. Validate bilingual Arabic invoice presentation and archival against legal requirements; arrange authorized taxpayer production credentials and complete live conformance tests.

## Manual API transport (for *already valid, signed* XML)

Node 20+ is required. Make sure the signing tool / official SDK has produced correct `invoiceHash` (Base64 SHA-256 over ZATCA canonical transform, **not raw XML hash**), `uuid`, and `invoice` (Base64 of signed XML). Example input JSON **schema**:

```json
{"invoiceHash":"<official-SDK-generated-base64-hash>","uuid":"<real-uuid>","invoice":"<base64-of-ZATCA-signed-UBL-XML>"}
```

Set environment variables in your shell or a private secret manager (do not copy `zatca/.env.example` with real values into Git). For example:

```sh
export ZATCA_ENVIRONMENT=sandbox
export ZATCA_CSID_TOKEN='actual-binarySecurityToken'
export ZATCA_CSID_SECRET='actual-secret'
node zatca/cli.mjs compliance-check /secure/path/signed-invoice.json /secure/path/check-response.json
node zatca/cli.mjs clearance /secure/path/signed-standard.json /secure/path/clearance-response.json
node zatca/cli.mjs reporting /secure/path/signed-simplified.json /secure/path/reporting-response.json
```

Onboarding uses `compliance-csid` with `{ "csrBase64": "...", "otp": "..." }` and `production-csid` with `{ "complianceRequestId": 1234 }`; note that the current CLI intentionally redacts returned secrets rather than insecurely serializing them. A proper secret-vault write integration is still required for end-to-end onboarding.

Production requires `ZATCA_ENVIRONMENT=production` and `ZATCA_PRODUCTION_CONFIRMED=I_UNDERSTAND_THIS_SENDS_TO_ZATCA`. Production calls must only be made with taxpayer authorization and valid credentials. `httpStatus:200` alone does not establish clearance; inspect the authority status and validation messages.

## Official references

- https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/TechnicalRequirementsSpec.aspx
- https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/ComplianceEnablementToolbox/Pages/DownloadSDK.aspx
- https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/ComplianceEnablementToolbox/Documents/Developer%20Portal%20User%20Manual.pdf

This project is **not submitted or approved by ZATCA**. Do not suppress Phase 2 scanner warnings by fabricating signatures or issuance dates.
