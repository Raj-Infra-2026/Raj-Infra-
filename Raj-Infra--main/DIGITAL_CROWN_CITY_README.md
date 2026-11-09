# ALIF LABS — Digital Crown City Edition

The public landing, login, registration and registration-success pages now use the approved cinematic **Digital Crown City** signature piece. The previous Canvas-based geometric skyline and liquid-metal concept are removed.

## Visual design
- Realistic approved city concept image is in `public/media/digital-crown-city.webp`.
- A 12-second, seamless, muted, looping H.264 cinematic camera-motion sequence is in `public/media/digital-crown-city.mp4`.
- Fine light sweeps, subtle luminous rings and interactive pointer parallax appear on desktop. These are browser CSS effects, not a realtime physical 3D simulation.
- Video pauses when the browser tab is hidden or its scene scrolls out of view. The still image is a fallback when autoplay is blocked or reduced motion is preferred.
- Public theme is **dark by default**, with a light/dark toggle remembered in localStorage.
- Mobile adapts the layout and reduces heavy decorative animation.

## Dashboard preservation
All existing tenant branding, workspace navigation, collapsible Tools & Insights, profile details, roles, invoices, authentication and backend isolation were retained from the preceding Option 5 project. No worker business logic was modified in this edition.

Note: A separate branch name appears beneath the signed-in email only if the session includes a `branch_name` or `branch` value; otherwise the company name is the fallback. The current backend does not independently record branch assignments.

## Deploy
1. Backup your live repository and Worker configuration. Do not upload secrets to GitHub.
2. Upload the **contents** of the `ALIF-LABS` folder to the repository root.
3. Run `npm install`, then `npm run build`. The Vite build copies both media assets from `public` into `dist/media`.
4. Deploy to a staging Worker with your existing environment secrets and verify `/`, `/login`, `/register`, and a complete client login.
5. Verify that `https://YOUR-DOMAIN/media/digital-crown-city.webp` and `.mp4` load, and confirm both themes and a mobile viewport.

## Verification performed
- Multi-tenant backend tests: passed (`npm test`).
- JSX syntax parsing: passed for `src/main.jsx` and `src/BusinessModules.jsx`.
- Worker JS syntax: passed.
- `ffprobe` verified the MP4 is 12 seconds.
- Frontend production build NOT verified in this environment because package installation could not reach npm registry.

This build retains existing ZATCA-related safeguards and does not represent official invoicing certification.
