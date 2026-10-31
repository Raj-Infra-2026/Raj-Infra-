LOGIN RESTORED
Existing USERS_JSON with username, password, role, brands works as before. No Node.js or password hash generator required.
Only login compatibility was changed in worker/index.js; invoice/products changes retained.
Deploy updated Worker and keep existing Cloudflare secrets unchanged.
Plaintext passwords in secrets are less secure than password hashes; consider migrating later with approval.
This is a development build and not yet production security audited or ZATCA compliant.
