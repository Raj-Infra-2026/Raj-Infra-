# Invoice date/time and QR update

This build retains the original BLUE Digital City theme.

- Existing invoice date field + one invoice time field (Saudi Arabia UTC+03:00).
- Users with existing update permission can edit saved/issued application invoices.
- On save, the Worker derives `invoice_timestamp` from `date` + `invoice_time`.
- Print/PDF and QR use the same saved invoice timestamp. The QR encodes ISO-8601 (+03:00), while the PDF shows DD/MM/YYYY, hh:mm AM/PM.
- Existing created_at is unchanged. A bounded revision history captures prior record snapshots.
- Existing seller VAT validation for QR remains; the VAT number must be valid to generate a VAT QR.
- The experimental ZATCA issuance gate is removed. This does NOT mean tax-law obligations cease to apply.

Deploy BOTH frontend and Worker. If the old error persists, verify Cloudflare deployed the new Worker and clear stale frontend caches. Test QR using a TLV-capable scanner.
