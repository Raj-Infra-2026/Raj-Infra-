# Invoice Date + Time / QR Sync (Blue Digital City Edition)

- The existing Invoice Date field remains unchanged. One Invoice Time field appears beside it.
- Invoice preview and printable PDF display `DD/MM/YYYY, HH:MM AM/PM` (Saudi Arabia time).
- The VAT QR uses the same selected date/time in ISO-8601 (`YYYY-MM-DDTHH:MM:00+03:00`), as required by its encoding format.
- Saving an edited invoice recomputes `invoice_timestamp` on the Worker, rather than trusting stale QR data. PDF/QR are rendered from the saved record.
- The original `created_at` remains unchanged for audit. Changes are recorded in the existing audit log.
- In pre-ZATCA mode, previously saved invoices can be edited by authorized users. When official tax issuance is enabled, edits to issued invoices remain blocked for compliance.
- Existing `ALLOW_TAX_INVOICE_ISSUANCE` gating on *new* tax invoice issuance is unchanged. This package does not enable or certify ZATCA issuance.
- No golden/orange Crown City assets. Original blue Digital City frontend preserved.

Before deployment: back up GitHub, deploy frontend and Worker together, test saving and re-editing an invoice and decoding QR tag 3. Production frontend build was not run in this environment.
