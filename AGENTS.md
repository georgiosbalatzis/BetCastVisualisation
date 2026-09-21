# BetCast developer guide

BetCast visualizes F1 Stories betting data with React, Create React App
(`react-scripts`), and Recharts. The authoritative source branch is `main`.

- Install: `npm ci`
- Develop: `npm start`
- Test: `npm test -- --watchAll=false`
- Build: `npm run build`
- Publish only when requested: `npm run deploy` (builds, then runs `gh-pages -d build`)
- Deployment branch: `gh-pages`; generated output, never edit it manually.

`src/` contains application code, styles, services, and Jest tests. `public/`
contains the HTML template, favicon, logos, manifest, and bookmaker assets.
`scripts/visual-audit/` contains optional browser audit tools; see
`docs/visual-design.md` for their prerequisites and limitations.

Never commit `node_modules/`, `build/`, `coverage/`, `.idea/`, generated
`artifacts/visual-rework/`, or copied deployment bundles at the repository root.

Preserve chart calculations, betting statistics, data sources, season/week filters,
URL state, sharing/embed behavior, CSV semantics, themes, and responsive tables.
Keep the existing F1 Stories visual identity. Do not migrate CRA, upgrade packages,
or change deployment as incidental cleanup. Preserve unrelated local work.
