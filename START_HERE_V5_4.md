# ALIF LABS V5.4 — QR cryptography demonstration, not tax issuance

This is the full V5.3 project plus an **offline cryptographic QR test workbench**.
The browser invoice preview remains a **draft**. The legacy HTML print preview now also shows the draft QR and a draft watermark. `TAX_ISSUANCE_ENABLED=false`
and the Worker issuance restrictions remain in place.

## Why the official ZATCA scanner shows yellow

The live invoice preview QR contains tags 1–5 only. A QR with tags 1–5 can be
decoded by ordinary QR readers but does not meet ZATCA Phase 2 cryptographic
verification requirements. The warning is legitimate. A locally signed QR with
a self-generated test key also cannot be claimed to have a ZATCA-issued CSID,
valid signed XAdES XML, or authority clearance/reporting. **This package does
not suppress scanner warnings or falsely claim compliance.**

## New V5.4 demonstration files

- `zatca/demo-qr-crypto.py`: generates a test-only TLV QR with binary fields
  1–8, a SHA-256 test XML hash, and ECDSA secp256k1 test signature and public
  key. It uses a fresh ephemeral test key and saves no private keys.
- `tests/demo-qr-crypto-test.py`: verifies tags 1–8 and local signing.
- `zatca/demo-sample/`: test QR image, encoded payload, and explicit validation
  status. **Do not place this sample QR on a customer invoice**: its data is
  independent of any customer invoice.
- `START_HERE_V5_4.md`: this guide.

The test hash uses the **raw sample XML bytes** and is not the canonical
invoice hash required by ZATCA. Tag 9 cannot be produced without the
appropriate ZATCA certificate-related signature. These artifacts are NOT
suitable for Phase 2 issuance or ZATCA submission.

## Run the demonstration

Requires Python 3 and `cryptography`, `qrcode`, and `Pillow` installed:

```
python tests/demo-qr-crypto-test.py
python zatca/demo-qr-crypto.py --xml zatca/demo-sample.xml --out demo-output
```

Inspect `demo-output/DEMO_QR.png` with an ordinary QR scanner. Do not expect
a green Phase 2 status from the official ZATCA app.

## Before an official scanner can show verified Phase 2 status

Implement ZATCA-specific XAdES signature, canonical invoice hash and signing
profile, valid CSID/certificate chain, the correct QR tags, XML validation
using ZATCA's SDK, and the clearance/reporting workflow. Keep backend issuance
disabled until successful tests and authorized taxpayer onboarding.

**Never remove the draft watermark or claim a test QR is a cleared invoice.**
