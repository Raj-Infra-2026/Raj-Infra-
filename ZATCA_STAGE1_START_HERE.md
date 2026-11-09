# ALIF LABS — Stage 1.1: Tenant-scoped XML preview

This package adds a protected backend route for previewing **unsigned development XML** from a saved invoice draft. It does **not** issue tax invoices or connect to FATOORA.

## API

`GET /api/zatca/draft-xml/{invoiceId}?kind=standard`

Use the normal company-owner Bearer token. The backend resolves the tenant from the token, loads only that tenant's invoice, and accepts only invoices with `status=Draft`. `kind` may be `standard` or `simplified`. Response includes `status: UNSIGNED_DEVELOPMENT_DRAFT`, `xml`, and an explicit warning. No Google Sheet writes occur.

## Limitations

- The current app blocks new invoice creation until a proper draft/issuance separation is implemented; this route works on existing Draft invoices only.
- The draft XML generator is intentionally incomplete: no full mandatory Saudi address/tax breakdown, ICV, PIH, compliant QR, signature, or clearance/reporting.
- Adjustments and discounts are rejected rather than silently creating inconsistent XML.
- Do not submit these drafts to ZATCA or use them as original tax invoices.
- No live ZATCA credentials are needed.

## Checks

Run `node --check worker/index.js`, `node tests/zatca-xml-draft.mjs`, and `npm test`.

## Next engineering milestone

Implement compliant full UBL schema, full tax/allowance calculation and schema validation, then cryptographic signing, FATOORA onboarding, API submission, and integration tests.
