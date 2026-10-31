RAJ INFRA — CLIENT PROFILE UPGRADE
Source: Raj-Infra--main(2).zip (uploaded October 28, 2026)

Implemented:
- Dedicated client form for all roles (same form; existing backend role restrictions retained).
- Title-case name entry, status Active/Inactive only, reference and amount hidden from Clients table and removed from client form.
- Required email format validation for any email domain (not ownership verification).
- Country-code phone selection for Saudi Arabia, India, UAE, US, UK, Pakistan, Bangladesh, Egypt and generic Other.
- Required address, optional Google Maps link, button to open Google Maps and optional reverse geocoding for links exposing coordinates using OpenStreetMap Nominatim. Full address cannot be reliably auto-filled from every Google Maps URL without an integration. Manual entry remains available.
- Save client and professional A4 print profile. Existing saved client profiles can be printed from Clients table.
- Server-side client email, phone, status, address validation; preserves other business modules.

Upload: extract ZIP, upload CONTENTS of Raj-Infra--main folder to repository root; preserve existing Cloudflare secrets.
IMPORTANT: npm install/build and live Worker/Sheets integration were not fully verified in this environment. Test in a staging branch before production deployment.
