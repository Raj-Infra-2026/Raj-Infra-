# Raj Infra Atelier V3

## Changes
- Manager cannot rename existing clients, including direct PATCH requests; admin can.
- Manager cannot change the client identity or client name on existing sales documents; admin can.
- Staff can create and read, but not edit.
- Three different dashboard signature sculptures for admin, manager, and staff.
- New jade, ivory, copper and role-specific palette; redesigned login sculpture.
- Animated branded transition screen for sign-in and navigation (~0.85–1.25 seconds), with reduced-motion support.
- Unified clients across all sales documents.

## Install
`npm install` then `npm run dev` for local development. Build with `npm run build`; deploy with `npx wrangler deploy` after confirming your Cloudflare secrets are preserved.

## Secrets
Set AUTH_SECRET, USERS_JSON, SERVICE_ACCOUNT_JSON and SPREADSHEET_ID in Cloudflare; never commit secret values. Back up your original Worker and spreadsheet before deployment.

## Limitations
This is a code update, not a live-tested production release. Google Sheets concurrency and financial document workflows need further validation. The existing user passwords are plaintext in USERS_JSON and should be replaced with a safer authentication design before production.
