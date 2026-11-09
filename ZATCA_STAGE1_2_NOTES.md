# ALIF LABS — ZATCA Stage 1.2 (development only)

## Changes
- Added local draft-data preflight validation to the authenticated, tenant-scoped `/api/zatca/draft-xml/:invoiceId` endpoint.
- The JSON response now includes `preflight.validationLevel`, `preflight.errors`, and `preflight.warnings`.
- Added tests for required fields, VAT number shape, UUID, date, and invoice lines.

## Not yet supported
- Official UBL XSD / ZATCA Schematron compliance, required address and tax details.
- Cryptographic signature, certificate and invoice hash chain.
- ZATCA QR signature tags, compliance CSID, production CSID, clearance or reporting.
- This package must **not** be used to issue live tax invoices.

## Local checks
Run `node tests/zatca-preflight.mjs`, `node tests/zatca-xml-draft.mjs`, `npm test`.

## Next engineering milestone
Implement the complete official UBL invoice data model and XML elements, then validate using ZATCA SDK against real test fixtures. Preserve tenant-specific security and the production issuance guard.
