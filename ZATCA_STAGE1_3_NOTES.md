# ZATCA Stage 1.3 — richer unsigned XML development draft

- Added UBL postal address mapping when present, 15% VAT tax subtotals, item tax categories, and line tax amounts.
- XML special characters are escaped. Unsupported non-15% tax rates are rejected rather than silently misrepresented.
- Added `tests/zatca-xml-structure.mjs`.

**NOT ZATCA-compliant or production-ready.** The XML is unsigned and has not passed official ZATCA SDK, XSD or Schematron validation. Missing elements include mandatory invoice counter, previous-invoice hash, QR cryptographic fields, signature and full adjustment/allowance/payment/tax-category scenarios. Currency, rounding, legal identity, time, and mandatory address requirements require further work. This generator must not be used to issue or submit official invoices. Existing issuance guard remains in place.
