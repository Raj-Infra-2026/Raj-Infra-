# Invoice Date & Time — Pre-ZATCA Workflow

Invoice Builder provides editable Invoice Date and Invoice Time (Saudi Arabia) fields.

- Timezone: Asia/Riyadh (UTC+03:00).
- The same date/time are saved in the Google Sheets record as `date`, `invoice_time`, and `invoice_timestamp`.
- Invoice PDF shows the selected date and time.
- VAT QR tag 3 uses the saved `invoice_timestamp` in ISO-8601 with +03:00.
- Audit `created_at` is separate from the editable business timestamp.
- The Worker validates the fields and derives the timestamp on save.
- Older invoices retain a fallback to their creation timestamp until edited.
- This is NOT ZATCA Phase 2 compliant issuance. Once ZATCA is integrated, issued timestamps must be locked and auditable.

Deploy frontend and Worker together. Test saving, reopening, printing and scanning an invoice.
