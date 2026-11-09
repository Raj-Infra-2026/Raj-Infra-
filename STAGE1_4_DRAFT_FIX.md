# ALIF LABS Stage 1.4 — Safe Draft Save and XML Download

- New invoice defaults to Draft; POST accepts only Draft for invoices.
- PATCH cannot transition a draft invoice into issued/active/paid status.
- Existing non-Draft invoices remain locked by the original backend check.
- Save and Save Draft & Print now persist draft records only.
- Invoice draft PDFs have a prominent non-official label and no QR.
- Open a saved Draft invoice in Edit mode to see **Download XML Draft**. This calls the existing authenticated, tenant-scoped GET /api/zatca/draft-xml/:invoiceId endpoint.
- XML generation supports only basic 15% VAT without adjustments/discounts; it is unsigned and not approved by ZATCA.
- Never set ALLOW_TAX_INVOICE_ISSUANCE=true as a workaround.
- Replace the repository with this full project, preserving your Cloudflare secrets and deployment settings. Test with dummy data before using with customers.
- Stage 1.4 does not implement production issuance, cryptographic signing, clearance, reporting, or onboarding.
