# ALIF LABS — ZATCA readiness report (2026-11-05)

**Readiness: NOT READY for production tax-invoice issuance or ZATCA production onboarding.** This is an implementation status, not a statement that ZATCA has assessed this software.

## Present functionality

- Basic seller/company registration details in Company Settings and 15-digit VAT format validation.
- Bilingual A4-style PDF print view and basic five-tag TLV QR generation when seller VAT is entered.
- Current backend computes VAT at a fixed 15% for manual invoice lines, and accepts some post-tax adjustments.
- JWT sessions, company-specific Google spreadsheets, and operational audit rows.

None of these proves official Fatoora clearance, reporting acceptance, or Phase 2 compliance.

## Missing or unverified required items

- Confirm every required standard and simplified invoice type, Arabic data field, VAT category, seller/buyer identifiers, credit/debit note data, discounts and tax rounding.
- Tamper-resistant invoice counter and previous-invoice hash chaining, issued invoice archiving and durable immutable audit logs (Google Sheets alone is not sufficient proof).
- Appropriate issuance/transaction date fields and consistent timestamps; reject prohibited post-issue changes. Server-side issue time and customer service date are distinct.
- UBL 2.1 XML construction, ZATCA data dictionary and invoice schema validation.
- Secure EGS key storage, cryptographic stamps and signatures, CSID certificate lifecycle and per-company isolation.
- Compliance API test suite, Sandbox validation, Production CSID onboarding.
- Standard B2B clearance before issuance and simplified B2C reporting, error queues, timeout handling, retry and ZATCA responses retained.
- Credit/debit note correction workflows compliant with invoice issuance and ZATCA processing.
- Evidence from official SDK validation, sandbox API tests, accounting review and authorized taxpayer verification.

## Why live tax invoice creation is blocked

The Worker rejects `POST /api/records/Invoices` unless `ALLOW_TAX_INVOICE_ISSUANCE=true`, which should **not** be enabled for this unverified project. The current browser print preview is not evidence of an officially cleared invoice. The invoice PDF has no misleading certification or developer-warning sentence, but the absence of that sentence is not certification.

For each future tenant, capture legal company name (Arabic/English), VAT number, CR, registered address and authorized Fatoora onboarding details. Never share a signing identity or CSID across tenants.

Official references:
- Phase 1 preparation: https://zatca.gov.sa/en/E-Invoicing/PreparingYourBusiness/Phase1/Pages/How-to-prepare.aspx
- E-invoicing implementation resolution: https://zatca.gov.sa/en/E-Invoicing/Introduction/LawsAndRegulations/Documents/E-Invoicing%20Implementation%20Resolution_EN.pdf
- ZATCA specifications: https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/E-Invoice-specifications.aspx

Do not claim ZATCA certification, instant approval, production readiness or official provider registration without actual authority onboarding and evidence.
