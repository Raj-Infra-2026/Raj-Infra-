# ALIF LABS — Cinematic Public Portal

This update changes only the public landing, sign-in, and registration presentation in `src/main.jsx` and `src/style.css`.

- Default public theme: Dark graphite / liquid silver / electric blue.
- Light theme: top-right sun/moon toggle. Preference saved under `alif-public-theme` in localStorage.
- Motion: animated metallic vector A, tracing line, rotating orbits, drifting ambient lights, cursor-responsive symbol, reveal transitions.
- Accessibility: reduced-motion support; responsive mobile layout.
- No new runtime dependencies, external video files, third-party assets, or changes to API authentication callbacks.
- Workspace theme is separate and unchanged.

## Deployment
Upload contents of `ALIF-LABS/` to the existing GitHub repository root. Do not delete the existing repo or Cloudflare bindings. Build with `npm install && npm run build`; deploy using your existing Cloudflare workflow. Verify landing page, sign-in, registration, and light/dark toggle in staging before production.

## Testing
`node tests/multi-tenant.mjs` passed. A full Vite build was attempted but npm dependency installation timed out in this environment; frontend compilation and live browser behavior remain unverified.

## Scope caution
This update does not change the existing invoice issuance restrictions or ZATCA backend logic in the baseline project.
