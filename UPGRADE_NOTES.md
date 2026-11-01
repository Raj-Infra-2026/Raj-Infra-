# Raj Infra — Invoice Layout Upgrade

Base: user-supplied Raj-Infra--main(3).zip.

## Changes made
- Invoice print table now contains only Item #, Description, Quantity, Rate, Total.
- Description is the wide column, supports line breaks and longer specifications.
- Invoice editor now supports multiline descriptions; SKU/Brand remain in product data.
- Added validation for invalid quantities, negative or non-finite rates.
- Improved invoice print table pagination and mobile editor styling.
- Existing login/USERS_JSON and Worker authentication logic were NOT changed.
- Existing Products, Client, Invoice and Delivery Note modules retained.

## Important limitations
- The browser print dialog provides Save as PDF; it is not a dedicated server-side PDF generator.
- Existing QR code is a preliminary VAT TLV implementation, NOT certified ZATCA Phase 2 compliance.
- Live Cloudflare and Google Sheets integrations have not been tested in this environment.
- The wider proposed SaaS workflow (conversion links, approvals, payments) is NOT implemented in this release. It requires schema and UI planning before safely modifying existing customer records.
- Keep a backup of your deployed Worker and Google Sheets before release.
