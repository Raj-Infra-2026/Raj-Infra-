# Actual uploaded PDF QR audit (10 November 2026)

The PDF QR decodes as a Base64-encoded TLV payload with exactly tags 1–8.

| Tag | Length | Content |
|---|---:|---|
| 1 | 36 | Al Asset Paths Digital Solutions LLC |
| 2 | 15 | 300000000000003 |
| 3 | 20 | 2026-11-10T09:53:13Z |
| 4 | 7 | 3061.30 |
| 5 | 6 | 399.30 |
| 6 | 32 | binary SHA-256 of raw unsigned draft XML |
| 7 | 64 | binary ECDSA P-256 signature |
| 8 | 65 | uncompressed P-256 public key |

**Verified defects:** Invoice PDF displays Saudi document time 12:36, while QR timestamp 09:53:13Z corresponds to 12:53:13 Saudi. The preview QR generator used the moment of QR creation, not the document date/time. This update aligns the timestamp with the document's Saudi time.

**Other findings:** Buyer VAT displayed in the PDF does not have a Saudi 15-digit VAT format. The new draft XML helper checks this for B2B when supplied. The XML helper previously ignored the B2B/B2C `kind` parameter and always built standard invoices; fixed.

**Unresolved by design:** Tags 6–8 are from a browser-generated P-256 key and raw XML digest, not ZATCA's canonical XML/XAdES/secp256k1 signing process. Tag 9 and authorized ZATCA certificate are missing. These cannot be declared valid, and the third-party yellow Phase 2 warning may remain. This is NOT a production tax issuance solution.

**No ZATCA submission or tax issuance is enabled.**
