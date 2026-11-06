# ALIF LABS — Option 4 Liquid Metal Flow

- Public home screen: animated chrome liquid ribbon with moving highlights, droplets, glowing orbital halo, cursor parallax. No new npm packages or remote assets.
- Public light/dark theme toggle retained; default dark.
- Authenticated workspace displays company name from the authenticated tenant session, not a hardcoded ALIF LABS brand.
- Admin profile shows login email and branch name if returned by backend, otherwise company name (the current backend does not store branch names).
- Company Settings and Preferences are under Workspace. Tools & Insights is collapsible.
- Tenant-specific data remains backend-isolated; no backend authorization changes.
- ZATCA issuance safeguards remain unchanged.

Before deploying, back up existing repository, install dependencies and build, then test with multiple tenant accounts.
