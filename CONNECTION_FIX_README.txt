RAJ INFRA V2 - LIVE URL CONFIGURATION FIX
Live URL: https://raj.ani-infra.workers.dev/

FIXES APPLIED IN wrangler.toml:
  name = "raj"
  ALLOWED_ORIGIN = "https://raj.ani-infra.workers.dev,http://localhost:5173"

IMPORTANT: Do not overwrite or change Worker secrets accidentally.
The target Worker is raj under Cloudflare account workers.dev subdomain ani-infra.
Check that your Cloudflare deployment workflow uses the SAME Cloudflare account
and has access to the Worker named raj.

REQUIRED WORKER SECRETS (configure under Cloudflare > Workers & Pages > raj > Settings > Variables and Secrets):
  AUTH_SECRET
  USERS_JSON
  SERVICE_ACCOUNT_JSON
  SPREADSHEET_ID
OPTIONAL:
  BRANDS_JSON

After deploying, open:
  https://raj.ani-infra.workers.dev/api/health
Expected: {"ok":true}
Then attempt login. If login fails, open browser DevTools > Network > /api/login
and inspect the HTTP status and response:
  403 Origin not allowed -> wrong ALLOWED_ORIGIN or deployed old version
  500 Backend secrets are not configured -> set all four required secrets on raj
  401 Invalid credentials -> USERS_JSON credentials mismatch
  Google authentication failed -> invalid service account, key, or API settings
  Google Sheets ... failed -> spreadsheet sharing/ID/tab/permission issue

Do not paste secrets into chat or commit them to GitHub.
Keep a backup of the live Worker and spreadsheet. Deploy to staging first if possible.
Existing Sheets records with blank brand_id remain hidden until properly assigned.

This package changes only wrangler.toml and adds this guidance file.
No application logic, user accounts, or database contents are changed.
