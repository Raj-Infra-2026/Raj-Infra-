# Raj Infra — Ember Edition (integrated project)

This archive is a complete copy of the uploaded Raj Infra React/Vite + Cloudflare Worker project with its original folder structure. No file relocation required.

## What changed
- `src/main.jsx`: Role-aware layout class and Rising Flame artwork replacing the old orbit/kinetic artwork.
- `src/style.css`: Brick red, fire orange, charcoal, ivory styling, hover states, responsive adjustments and differentiated Admin/Manager/Staff dashboard treatments.

## What was preserved
Original authentication, API calls, module workflows, Google Sheets integration, Worker source, permissions and deployment configuration were not intentionally modified.

## Test locally
```
npm install
npm run build
npm run dev
```

## GitHub upload
Extract this archive and open `Raj-Infra--main`. Upload its **contents**, including the `src`, `worker`, `scripts` folders and root config files, to the **root** of your GitHub repository, not inside an additional `Raj-Infra--main` folder. Make a backup first. GitHub's browser uploader may not preserve empty folders, which is fine. Do not upload `node_modules` or credentials.

## Important
This is an integrated redesign, not a backend migration. Cloudflare deployment still depends on your existing Worker secrets and domain settings. Review and test locally before replacing production code. The Rising Flame is a lightweight CSS dimensional illustration, not a complete Three.js mesh; full mouse-driven 3D sculpture can be added later after design approval.
