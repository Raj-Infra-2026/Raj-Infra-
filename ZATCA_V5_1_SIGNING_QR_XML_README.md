# ALIF LABS V5.1 – ZATCA Phase 2 engineering stages

## IMPORTANT STATUS: NOT SUBMISSION-READY

This release implements *tested local building blocks*, **not complete ZATCA Phase 2 conformance**. ZATCA-specific XAdES XML enveloped signature generation, C14N 1.1, official XSD/Schematron business rules, CSID certificate/trust-chain handling, durable issuance ledger and production onboarding are still incomplete. **Do not issue or submit statutory tax invoices using these local tools**. `worker/index.js` intentionally continues to block final tax issuance. A passing QR decoding test does not eliminate ZATCA's Phase 2 warning.

## Implemented in this stage

1. `worker/zatca/xml-draft.mjs`: expanded namespaced UBL 2.1 XML generator with UUID, actual issue date/time, invoice type (standard/simplified), seller and buyer tax/address data, standard 15% VAT item/tax totals, ICV, PIH, and optional QR reference. **Supported subset only**: SAR, sales invoices code 388, rate 15%, no discounts, exemptions, prepayments, export, credit/debit notes or complex charges. Cannot be called fully UBL/ZATCA-compliant without official validation.
2. `worker/zatca/chain.mjs`: genesis PIH, next counter/hash calculation, strict per-EGS sequence checks and an in-memory **test fixture only**. This is NOT an atomic durable ledger.
3. `zatca/sign-workbench.py`: genuine ECDSA secp256k1 signing and local verification of SHA-256 digest of transformed XML. **Does not produce XAdES** and uses C14N 1.0, not the required exact canonicalization profile; its output is NOT a ZATCA cryptographic stamp. Never ship development test signing results to ZATCA.
4. `worker/zatca/qr-phase2.mjs`: binary Base64 TLV tags 1–8, plus tag 9 for simplified invoices. SHA-256 invoice hash is 32 raw bytes (tag 6), ECDSA P1363 signature 64 bytes (tag 7), 65-byte uncompressed public key (tag 8), real CA cert signature required for simplified tag 9. The QR module **cannot obtain or verify credentials**. It assumes externally verified, correctly signed invoice evidence. Never use fake tag values in production.
5. `worker/zatca/draft-validation.mjs`: strengthened local preflight and explicit warnings. The `zatca/api-client.mjs` transport remains manually invoked for **already valid signed invoices**, not integrated with live issuance.

## Run tests

```bash
npm run test:zatca:local
# python cryptographic workbench prerequisites in an isolated developer environment:
python -m pip install cryptography lxml
python zatca/sign-workbench.py path/to/draft.xml --private-key /SECURE/authorized-secp256k1.pem --out local-crypto-evidence.json
```

**Do not put a real private key, CSID token or certificate secret into the Git repository, ZIP or frontend.** `--out` is create-only and intentionally stores no private key.

## Next stage: official SDK + production readiness (required)

- Implement ZATCA XAdES B-B signature envelope, SignedProperties, transforms, correct C14N 1.1 and all exact digest semantics; independently verify signature and certificate.
- Generate UBL for the required transaction classes with valid business/country rules and national-address requirements. Official ZATCA SDK XSD, Schematron, XML and QR validation must pass per class. The official SDK is the next requested stage, **not performed here**.
- Issue/renew/revoke authorized EGS Compliance/Production CSID, verify CA chain and signing-key ownership; tag 9 only from the actual CA-issued certificate for simplified invoices.
- Use atomic per-taxpayer per-EGS invoice counters/PIH with durable no-delete audit ledger, idempotency, concurrency control, outage retries and ZATCA reconciliation. Google Sheets alone is not a sufficient transactional locking store for that purpose.
- Connect accepted or cleared XML + cryptographic QR into final bilingual readable invoice; implement standard **clearance before delivery** and simplified **reporting within the required timeline**. Archive authority responses and signed evidence. Production API requires authorized taxpayer credentials and explicit opt-in.

Official references:
- https://zatca.gov.sa/en/e-invoicing/systemsdevelopers/pages/e-invoice-specifications.aspx
- https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/Security-Requirements.aspx
- https://www.zatca.gov.sa/ar/E-Invoicing/SystemsDevelopers/Documents/20230519_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards_vF.pdf
