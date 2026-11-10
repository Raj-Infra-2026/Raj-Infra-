# ALIF LABS V5.3 — Invoice preview and safe demo workflow

**This is the full project source.** V5.3 permits drafting invoices, previewing/downloading the same A4 bilingual PDF, scanning a basic TLV demo QR, and downloading unsigned draft UBL XML. **It does not issue, clear, or report tax invoices.**

## Files changed from V5.1

- `src/BusinessModules.jsx` — DD/MM/YYYY entry, preview TLV QR, draft-specific buttons/status, draft XML export.
- `src/pdfDownload.js` — redesigned A4 bilingual invoice using a single layout for both Preview and Download; includes logo, QR, detail panels, items, totals, notes, draft marking.
- `src/zatcaPreview.js` — browser download of unsigned draft UBL XML. No submission or signature assertion.
- `worker/index.js` — allows creating **only Draft** invoices; blocks invoice issuance/escalation and rejects forged authority fields; no issuance timestamp is set on drafts.
- `tests/multi-tenant.mjs`, `tests/v53-preview.mjs` — checks for draft/issuance boundaries and basic QR/XML correctness.
- `samples/DEMO_INVOICE_PREVIEW.pdf`, `samples/DEMO_QR.svg` — demonstration assets, not tax invoices.

## Workflow

1. Install project dependencies with `npm install` (a normal network/npm environment is necessary).
2. Configure backend secrets through Cloudflare, not committed files. Preserve existing spreadsheet bindings and security settings.
3. **Important:** inspect `wrangler.toml` before deployment. Its `name` and `ALLOWED_ORIGIN` must match the **existing** Cloudflare Worker and allowed frontend origin; otherwise deploying may create a new Worker or break access. Do not publish credentials.
4. `npm run build`, `npm test`, and `npm run test:zatca:local`.
5. Open Invoices → New Invoice. Fill registered seller company and VAT number, select buyer and items. Use **Preview PDF** (without saving), **Download Draft XML**, or **Save Draft & Download PDF**.
6. Drafts are stored with `status: 'Draft'` and **no** backend issuance time or CSID/clearance metadata. The real issuance endpoint is still blocked.

## What the demonstration QR contains

Tags 1–5 (base64 TLV) encode seller name, seller VAT number, **the true time of QR preview generation**, invoice gross amount, and VAT amount. The PDF separately shows the selected document date (`DD/MM/YYYY`) and document time. These two times are deliberately not conflated. A scanner can decode the standard TLV structure, but ZATCA may show Phase 2 warnings because the QR is neither a signed authority QR nor evidence of clearance.

For an actual seller, enter the correct registered Saudi VAT number (15 digits starting and ending in `3`); incorrect placeholders cannot be made valid by QR formatting. The PDF explains when a demo QR cannot be generated.

The previously developed `worker/zatca` and `zatca/` workbench modules remain available. Their development signing/chain/Phase 2 encoders are **not** connected to customer preview, and must not be represented as cleared data.

## XML limitations

Draft XML is the supported, common 15% Saudi VAT case. It is **unsigned**, has no real issuance chain/PIH/ICV, and contains no ZATCA clearance response. XML download rejects nonzero adjustments because their complete ZATCA tax treatment is not implemented in this demo. See `worker/zatca/xml-draft.mjs` and `zatca/README.md`. Passing this module's structural tests is not an official SDK pass.

## Conditions before production tax issuance

Implement and externally test the exact ZATCA XML rules/XAdES profile, certificate onboarding and key protection, immutable counter/PIH archival, the standard-tax-invoice clearance vs simplified reporting flow, official SDK validation, error/retry management and the final validated QR. Production tax issuance remains **disabled independently of UI buttons and environment flags**. **Do not** turn on issuance or advertise this preview as an approved Phase 2 tax invoice until genuine checks pass.

ZATCA official references:
- [E-Invoice XML specification](https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/E-Invoice-specifications.aspx)
- [Security features implementation standards](https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/Security-Requirements.aspx)
- [Official SDK](https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/ComplianceEnablementToolbox/Pages/DownloadSDK.aspx)
