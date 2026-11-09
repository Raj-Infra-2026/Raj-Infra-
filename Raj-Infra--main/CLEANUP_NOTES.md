# ALIF LABS Clean Project
Source: Raj-Infra--main(6).zip

This is a cleanup of the supplied version, NOT a functional rollback.
Removed root-level duplicate source, historical instructions, and unused files.
Kept active React files, Cloudflare Worker, setup scripts, QR dependencies,
automated tests, and existing ZATCA-related code to avoid altering functionality.

IMPORTANT: The existing Worker still includes a tax-invoice issuance gate.
Do not assume this package restores unrestricted invoice saving.
Keep production secrets in Cloudflare; do not commit them to GitHub.
Deploy to a staging environment and test before replacing production.
