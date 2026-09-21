# Repository cleanup report

## Baseline

- Source working tree: `main`, HEAD `23349478308776a2096edb6320badd70ccd502e7`, initially matching `origin/main`.
- Initial `git status`: only untracked `artifacts/visual-rework/reference-desktop.png`.
  Its contents were preserved and SHA-256 checked afterward; it is now covered by the audit-output ignore rule.
- Node `v26.9.0`, npm `11.19.1` on macOS.
- `npm ci`: passed, 1,419 packages installed. Existing npm audit summary:
  **60 findings: 14 low, 14 moderate, 29 high, 3 critical**. No audit fix or upgrade performed.
- `npm test -- --watchAll=false`: passed, one suite / two tests. Existing warning:
  `ReactDOMTestUtils.act` is deprecated in favor of `React.act`.
- `npm run build`: compiled successfully; no build/lint warning in this run.
  Older visual reports mention Browserslist freshness warnings, but those did not reproduce here.
- npm emitted existing deprecations for CRA transitive packages: workbox-google-analytics,
  workbox-cacheable-response, w3c-hr-time, svgo, stable, sourcemap-codec,
  rollup-plugin-terser, rimraf, q, inflight, glob, domexception, eslint, abab,
  @humanwhocodes/object-schema, @humanwhocodes/config-array, and Babel proposal
  plugins for numeric separators, optional chaining, class properties, private
  methods, nullish coalescing and private-property-in-object.
  npm also reported install scripts not covered by local allowScripts for
  core-js, core-js-pure and fsevents. Installation still exited successfully.
- The browser CLI emitted a Node experimental localStorage warning; this is a tool
  warning, not an application console error.
- Production browser baseline: 63 real current-season bets / 14 weeks and 96
  previous-season bets; 52 chart-state checks and 78 viewport/theme checks.
  No unexpected application console/page errors.
- Historical `verify.cjs` fails at `tableScroll > 0`: current mobile table width
  and scroll width are both 346px, so horizontal scrolling is unnecessary.
  This predates cleanup. An external temporary copy recorded the obsolete assertion
  as a warning so the remaining baseline and post-cleanup checks could run.
  The retained script's assertion and all Jest tests were preserved.

## Repository structure before

| Area | Role / finding |
| --- | --- |
| `src/` | React application, themes, styles, Recharts views, sheet service, Jest tests; seven unused image copies/template assets. |
| `public/` | Authoritative CRA HTML and public assets; two manifest icons incorrectly duplicated the 1024px master. |
| Root HTML, manifest, icons and `static/` | Mixed obsolete source templates and stale copied/generated deployment output; not source inputs. |
| `artifacts/visual-rework/` | 73 tracked files: 70 generated screenshots/reports/CSV captures, plus three authored audit tools. |
| `.idea/` | Five tracked generic WebStorm configuration files; other local workspace metadata was already ignored. |
| Root design reports / `prompt.md` | Completed agent/design work, stale screenshot links, and superseded recommendations. |
| `package.json`, `package-lock.json` | CRA scripts, dependency definitions and reproducible lockfile; retained unchanged. |
| `.gitignore` | CRA defaults; missing full IDE and visual-audit output exclusions. |
| `README.md` | Embedding guidance plus CRA boilerplate; missing explicit install and actual Pages publishing instructions. |
| Tests | `src/App.test.js` has two chrome/embed tests; `src/setupTests.js` configures jest-dom. No separate lint script. |
| Deployment | `predeploy` builds, `gh-pages -d build` publishes; no tracked `.github` Pages workflow. |

## Removed from main

Only **SAFE TO REMOVE** material was removed. Authored tools classified **MUST KEEP**
were moved, not discarded. Uncertain candidates remain, listed below.

Evidence shared by the per-path inventory:

1. Searched imports, requires, literal URLs, source/tests/public files, scripts,
   package configuration, README and the design reports. Runtime image references
   resolve through `PUBLIC_URL` to `public/` assets. No application consumer reads
   `artifacts/`, root assets, `src/logo*`, or `src/assets/bookmakers/`.
2. Inspected installed CRA `config/paths.js`: HTML is `public/index.html`, entry is
   `src/index`, public assets are `public/`, output is `build/`. `scripts/build.js`
   copies the public folder. No custom build-path setting is tracked.
3. Compared SHA-256 values, the fresh baseline build, local `gh-pages` tree, remote
   branch metadata/tree, and GitHub Pages settings. Root `asset-manifest.json`
   names old `main.6261cac6.css` / `main.be70381b.js` bundles; fresh output has
   different current bundles. Root HTML still contains `%PUBLIC_URL%` and no
   injected bundles: it is an obsolete template, **not** falsely classified as an
   exact copy of compiled HTML. Root manifest also differs from current public metadata.
4. Root favicon matches the historical local `gh-pages` favicon, while
   `public/favicon.ico` was explicitly replaced by commit `31dd446` and remains
   the authoritative icon. Neither root file is used by the current build.
5. The only artifact consumers were historical documentation and the audit tools.
   Durable documentation was consolidated; tools now write/read the ignored audit
   directory. Historic captures are recoverable from Git, not treated as live fixtures.
6. Final build comparison verifies the exact same file set and SHA-256 for every
   output except the two intentionally resized manifest PNGs.

| Path | Classification | Decision, reason and evidence |
| --- | --- | --- |
| `.idea/.gitignore` | F — IDE / LOCAL STATE | SAFE TO REMOVE from index: generic WebStorm module/VCS/ESLint defaults; no unique shared configuration. Local file preserved. |
| `.idea/betting-visualizations.iml` | F — IDE / LOCAL STATE | SAFE TO REMOVE from index: generic WebStorm module/VCS/ESLint defaults; no unique shared configuration. Local file preserved. |
| `.idea/inspectionProfiles/Project_Default.xml` | F — IDE / LOCAL STATE | SAFE TO REMOVE from index: generic WebStorm module/VCS/ESLint defaults; no unique shared configuration. Local file preserved. |
| `.idea/modules.xml` | F — IDE / LOCAL STATE | SAFE TO REMOVE from index: generic WebStorm module/VCS/ESLint defaults; no unique shared configuration. Local file preserved. |
| `.idea/vcs.xml` | F — IDE / LOCAL STATE | SAFE TO REMOVE from index: generic WebStorm module/VCS/ESLint defaults; no unique shared configuration. Local file preserved. |
| `BETCAST_VISUAL_CRITIQUE.md` | D / E — HISTORICAL DESIGN / AGENT REPORT | SAFE TO REMOVE after consolidation: read in full; durable palette, behavior and BC-01–16 guidance preserved in docs/visual-design.md. Git history retains old reports. |
| `BETCAST_VISUAL_REWORK.md` | D / E — HISTORICAL DESIGN / AGENT REPORT | SAFE TO REMOVE after consolidation: read in full; durable palette, behavior and BC-01–16 guidance preserved in docs/visual-design.md. Git history retains old reports. |
| `artifacts/visual-rework/before-1440.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/before-390.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/before-768.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/capture-results.json` | G — GENERATED AUDIT REPORT | SAFE TO REMOVE: captured tokens/check results, not configuration; consumed only as audit evidence. Durable design guidance consolidated. |
| `artifacts/visual-rework/capture.cjs` | A — SOURCE | MUST KEEP: relocated to `scripts/visual-audit/capture.cjs`; authored audit tool, not generated output. |
| `artifacts/visual-rework/comparison-desktop.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/comparison-mobile.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/comparison.html` | A — SOURCE | MUST KEEP: relocated to `scripts/visual-audit/comparison.html`; authored audit tool, not generated output. |
| `artifacts/visual-rework/dark-1440-default.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-1440-dense.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-1440-empty.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-1440-table.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-1440-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-390-default.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-390-dense.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-390-empty.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-390-table.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-390-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-768-default.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-768-dense.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-768-empty.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-768-table.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/dark-768-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/desktop-tooltip.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/downloads/betcast_current_export.csv` | G — GENERATED EXPORT | SAFE TO REMOVE: verify.cjs writes the downloaded CSV; application fetches sheets and never reads this local export. |
| `artifacts/visual-rework/hub-1440.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/hub-390.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/hub-768.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/hub-dark-1440-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/hub-dark-390-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/hub-dark-768-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/hub-dark-tokens.json` | G — GENERATED AUDIT REPORT | SAFE TO REMOVE: captured tokens/check results, not configuration; consumed only as audit evidence. Durable design guidance consolidated. |
| `artifacts/visual-rework/hub-light-1440-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/hub-light-390-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/hub-light-768-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/hub-light-tokens.json` | G — GENERATED AUDIT REPORT | SAFE TO REMOVE: captured tokens/check results, not configuration; consumed only as audit evidence. Durable design guidance consolidated. |
| `artifacts/visual-rework/light-1440-default.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-1440-dense.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-1440-empty.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-1440-table.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-1440-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-390-default.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-390-dense.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-390-empty.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-390-table.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-390-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-768-default.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-768-dense.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-768-empty.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-768-table.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/light-768-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/mobile-loading.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/mobile-pie.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/mobile-tooltip-checks.json` | G — GENERATED AUDIT REPORT | SAFE TO REMOVE: captured tokens/check results, not configuration; consumed only as audit evidence. Durable design guidance consolidated. |
| `artifacts/visual-rework/mobile-tooltip.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/production-1440.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/production-390.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/production-768.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/production-smoke.json` | G — GENERATED AUDIT REPORT | SAFE TO REMOVE: captured tokens/check results, not configuration; consumed only as audit evidence. Durable design guidance consolidated. |
| `artifacts/visual-rework/retry-error.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-1440.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-390.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-768.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-dark-1440-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-dark-390-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-dark-768-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-dark-tokens.json` | G — GENERATED AUDIT REPORT | SAFE TO REMOVE: captured tokens/check results, not configuration; consumed only as audit evidence. Durable design guidance consolidated. |
| `artifacts/visual-rework/stories-light-1440-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-light-390-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-light-768-viewport.png` | G — GENERATED AUDIT SCREENSHOT | SAFE TO REMOVE: viewport/state/publication capture, not a runtime fixture; only audit reports/viewer refer to it. History retains exact old imagery; new captures may differ with live data. |
| `artifacts/visual-rework/stories-light-tokens.json` | G — GENERATED AUDIT REPORT | SAFE TO REMOVE: captured tokens/check results, not configuration; consumed only as audit evidence. Durable design guidance consolidated. |
| `artifacts/visual-rework/verification-results.json` | G — GENERATED AUDIT REPORT | SAFE TO REMOVE: captured tokens/check results, not configuration; consumed only as audit evidence. Durable design guidance consolidated. |
| `artifacts/visual-rework/verify.cjs` | A — SOURCE | MUST KEEP: relocated to `scripts/visual-audit/verify.cjs`; authored audit tool, not generated output. |
| `asset-manifest.json` | C / H — GENERATED BUILD / DEPLOYMENT OUTPUT | SAFE TO REMOVE: old hashed webpack output; referenced only by its stale manifest/maps. CRA emits fresh equivalents under build/. |
| `favicon.ico` | H — STALE DEPLOYMENT ASSET | SAFE TO REMOVE: identical to local historical gh-pages icon, superseded by public/favicon.ico (commit 31dd446); root is not a Pages source. |
| `index.html` | A / H — OBSOLETE TEMPLATE / DEPLOYMENT COPY | SAFE TO REMOVE: obsolete root template/metadata, not identical to fresh build. CRA exclusively uses public/index.html and public/manifest.json; Pages serves gh-pages. |
| `logo.png` | C / H — COPIED DEPLOYMENT ASSET | SAFE TO REMOVE: byte-identical public source copy; CRA copies public/, deployment reads build/, neither reads this root copy. |
| `logo192.png` | C / H — COPIED DEPLOYMENT ASSET | SAFE TO REMOVE: byte-identical public source copy; CRA copies public/, deployment reads build/, neither reads this root copy. |
| `logo512.png` | C / H — COPIED DEPLOYMENT ASSET | SAFE TO REMOVE: byte-identical public source copy; CRA copies public/, deployment reads build/, neither reads this root copy. |
| `manifest.json` | A / H — OBSOLETE TEMPLATE / DEPLOYMENT COPY | SAFE TO REMOVE: obsolete root template/metadata, not identical to fresh build. CRA exclusively uses public/index.html and public/manifest.json; Pages serves gh-pages. |
| `prompt.md` | D / E — HISTORICAL DESIGN / AGENT REPORT | SAFE TO REMOVE after consolidation: read in full; durable palette, behavior and BC-01–16 guidance preserved in docs/visual-design.md. Git history retains old reports. |
| `robots.txt` | C / H — COPIED DEPLOYMENT ASSET | SAFE TO REMOVE: byte-identical public source copy; CRA copies public/, deployment reads build/, neither reads this root copy. |
| `src/assets/bookmakers/bet365.svg` | A — UNUSED SOURCE ASSET | SAFE TO REMOVE: byte-identical public/bookmakers counterpart; no imports/requires; BookmakerLogo uses PUBLIC_URL/bookmakers URLs. |
| `src/assets/bookmakers/bwin.svg` | A — UNUSED SOURCE ASSET | SAFE TO REMOVE: byte-identical public/bookmakers counterpart; no imports/requires; BookmakerLogo uses PUBLIC_URL/bookmakers URLs. |
| `src/assets/bookmakers/interwetten.svg` | A — UNUSED SOURCE ASSET | SAFE TO REMOVE: byte-identical public/bookmakers counterpart; no imports/requires; BookmakerLogo uses PUBLIC_URL/bookmakers URLs. |
| `src/assets/bookmakers/novibet.svg` | A — UNUSED SOURCE ASSET | SAFE TO REMOVE: byte-identical public/bookmakers counterpart; no imports/requires; BookmakerLogo uses PUBLIC_URL/bookmakers URLs. |
| `src/assets/bookmakers/stoiximan.svg` | A — UNUSED SOURCE ASSET | SAFE TO REMOVE: byte-identical public/bookmakers counterpart; no imports/requires; BookmakerLogo uses PUBLIC_URL/bookmakers URLs. |
| `src/logo.png` | A — UNUSED SOURCE ASSET | SAFE TO REMOVE: identical to public/logo.png; no imports/references; header uses PUBLIC_URL/logo.png. |
| `src/logo.svg` | A — UNUSED TEMPLATE ASSET | SAFE TO REMOVE: default React SVG; no source, test, public, build, deployment or documentation consumer. |
| `static/css/main.6261cac6.css` | C / H — GENERATED BUILD / DEPLOYMENT OUTPUT | SAFE TO REMOVE: old hashed webpack output; referenced only by its stale manifest/maps. CRA emits fresh equivalents under build/. |
| `static/css/main.6261cac6.css.map` | C / H — GENERATED BUILD / DEPLOYMENT OUTPUT | SAFE TO REMOVE: old hashed webpack output; referenced only by its stale manifest/maps. CRA emits fresh equivalents under build/. |
| `static/js/453.4abb8e4f.chunk.js` | C / H — GENERATED BUILD / DEPLOYMENT OUTPUT | SAFE TO REMOVE: old hashed webpack output; referenced only by its stale manifest/maps. CRA emits fresh equivalents under build/. |
| `static/js/453.4abb8e4f.chunk.js.map` | C / H — GENERATED BUILD / DEPLOYMENT OUTPUT | SAFE TO REMOVE: old hashed webpack output; referenced only by its stale manifest/maps. CRA emits fresh equivalents under build/. |
| `static/js/main.be70381b.js` | C / H — GENERATED BUILD / DEPLOYMENT OUTPUT | SAFE TO REMOVE: old hashed webpack output; referenced only by its stale manifest/maps. CRA emits fresh equivalents under build/. |
| `static/js/main.be70381b.js.LICENSE.txt` | C / H — GENERATED BUILD / DEPLOYMENT OUTPUT | SAFE TO REMOVE: old hashed webpack output; referenced only by its stale manifest/maps. CRA emits fresh equivalents under build/. |
| `static/js/main.be70381b.js.map` | C / H — GENERATED BUILD / DEPLOYMENT OUTPUT | SAFE TO REMOVE: old hashed webpack output; referenced only by its stale manifest/maps. CRA emits fresh equivalents under build/. |

## Generated output

The source of truth is now `src/` plus `public/`. CRA generates `build/index.html`,
`build/asset-manifest.json`, hashed `build/static/` bundles/maps/licenses, and copies
public assets into `build/`. `/build` remains ignored. Root `/static/` and
`/asset-manifest.json` are additionally ignored to prevent accidental recommits.
The generated deployment branch remains separate and unchanged.

Only `/artifacts/visual-rework/` is newly ignored, rather than indiscriminately
ignoring possible future fixtures elsewhere under `artifacts/`. Screenshots,
JSON results and downloaded CSVs belong there locally. Authored capture/verification
scripts and comparison viewer live in `scripts/visual-audit/`. Their output paths
were adjusted for relocation and the private `/tmp/betcast-ui-audit` module fallback
was replaced with normal `puppeteer-core` resolution; the existing environment
variable remains supported. No Puppeteer dependency was added to the application.

## Asset cleanup

SHA-256 `9e7e0e5dbe0e3309eafceb020b25f617b71d8667831f337d2e3ec39aff24deb4`
identified **seven identical 1,555,500-byte, 1024×1024 PNGs**:
root `logo.png`, `logo192.png`, `logo512.png`; the same three public names;
and `src/logo.png`.

| Asset / group | Before bytes | After bytes | Treatment |
| --- | ---: | ---: | --- |
| `public/logo.png` | 1,555,500 | 1,555,500 | Unchanged master and header artwork. |
| `public/logo192.png` | 1,555,500 | 33,642 | Resampled to 192×192 with native `sips`. |
| `public/logo512.png` | 1,555,500 | 210,242 | Resampled to 512×512 with native `sips`. |
| Three root PNGs + `src/logo.png` | 6,222,000 | 0 | Unused copies removed. |
| `src/assets/bookmakers/*.svg` | 16,259 | 0 | Five identical public counterparts retained. |
| `src/logo.svg` | 2,632 | 0 | Unreferenced CRA React template artwork. |
| Root `favicon.ico` | 3,870 | 0 | Stale deployment copy removed. |
| `public/favicon.ico` | 15,342 | 15,342 | Existing multi-size production icon retained exactly. |
| `public/bookmakers/*.svg` | 16,259 | 16,259 | All runtime bookmaker assets retained exactly. |
| All non-audit image assets | 10,942,862 | 1,830,985 | **9,111,877 bytes removed (83.3%).** |

The two public manifest icons alone save **2,867,116 bytes (92.2%)** and retain the
same artwork, alpha and aspect ratio. Inspected original and resized artwork.
No header logo optimization/redesign was attempted. `public/manifest.json` and
`public/index.html` still reference the same required filenames.

Also found exact duplicate screenshot pairs: `before-1440.png` / `production-1440.png`
and `before-768.png` / `production-768.png`; these were generated audit output.
Root `robots.txt` was byte-identical to the retained public source.

## Agent/design artifacts

- `BETCAST_VISUAL_CRITIQUE.md`: all BC-01–BC-16 items were marked complete.
  Preserved their accepted behavior in `docs/visual-design.md`; removed root report.
- `BETCAST_VISUAL_REWORK.md`: completed historical implementation/QA report with
  some descriptions superseded by the critique fixes. Preserved the palette,
  typography, responsive intent, interactions, audit prerequisites and limitations.
- `prompt.md`: a prior visual critique response, not an active build input or
  developer instruction file. Its BC-01–BC-16 recommendations were already completed;
  contains temporary absolute screenshot links. Consolidated and removed.
- Added concise `AGENTS.md`; README gains only setup, actual publishing, source
  layout, and the design-doc link. Existing embedding guidance remains intact.

## IDE/local artifacts

All five tracked `.idea` files were generic project/module/VCS mappings, default
ESLint enablement or local ignore entries. ESLint configuration is already in
`package.json`; there was no unique shared code style or run configuration to keep.
Used `git rm --cached -r .idea` so local IDE files, including personal workspace
state, remain on disk. Added `/.idea/` to `.gitignore`.

Preserved the user's initially untracked reference image byte-for-byte. Temporary
verification tooling, logs, screenshots and CSVs from this cleanup live outside the
repository under `/tmp/betcast-hygiene/`. No new generated evidence is committed.

## Source-code hygiene

No application JS/JSX, CSS, calculations, data format, URL handling, or tests were
changed. Hashes of every remaining `src/` file match baseline. Removed only unused
source images whose public replacements are explicitly referenced.

The reference/dead-file scan found no tracked `.bak`, `.old`, `.orig`, `.tmp`,
`*_copy.*`, patch/log files or empty files. No abandoned component or large obsolete
commented block was established. Existing development-only sheet diagnostics and
error/fallback logging were retained because they explain data/chunk failures;
removing them offers little hygiene benefit. No broad refactor or import reshuffle.

## Dependencies

**Removed dependencies: none.** `package.json` and `package-lock.json` are byte-identical
to baseline; no version upgrade or lockfile churn.

| Dependency | Evidence / decision |
| --- | --- |
| `react`, `react-dom` | MUST KEEP: React entry point, components and root renderer. |
| `recharts` | MUST KEEP: chart components in BetCast. |
| `react-scripts` | MUST KEEP: CRA start/test/build toolchain. |
| `gh-pages` | MUST KEEP: confirmed current publishing mechanism. |
| `@testing-library/react` | MUST KEEP: imports in App tests. |
| `@testing-library/jest-dom` | MUST KEEP: imported by setupTests. |
| `web-vitals` | MUST KEEP: dynamic import in reportWebVitals, imported/called by index.js. Callback currently absent; removing this hook exceeds file-only cleanup. |
| `@testing-library/user-event` | PROBABLY SAFE / HUMAN REVIEW: no direct import found in current two tests. Retained as existing test tooling rather than introducing dependency/lockfile changes for a small uncertain benefit. |

Existing npm vulnerability/deprecation findings are recorded, not repaired through
out-of-scope dependency upgrades.

## Deployment

SOURCE BRANCH:
`main`

BUILD OUTPUT:
`build/`

DEPLOYMENT MECHANISM:
`npm run deploy` / `gh-pages`

DEPLOYMENT BRANCH:
`gh-pages`

**Unchanged.** `predeploy` remains `npm run build`; `deploy` remains
`gh-pages -d build`; `homepage` remains `.`; installed `node_modules/.bin/gh-pages`
is present. CRA produces all HTML, manifest, icons, bookmaker files and bundles.

Read-only `gh api repos/georgiosbalatzis/BetCastVisualisation/pages` returned
`build_type: legacy`, source `{branch: gh-pages, path: /}`, and
`https://georgiosbalatzis.github.io/BetCastVisualisation/`.
No alternate deployment system or tracked Pages workflow was found.
`npm run deploy` was **not run**. Nothing was published, committed or pushed.

## Other branches

- `gh-pages`: preserved. Local/ref snapshot `ee33966` is older than the remote
  `62946beb20e94cfa472ae6fe3ba42d7140c06846` observed with `git ls-remote`.
  Inspected both local tree and remote tree read-only; current remote output has
  `bookmakers/`, icons/manifests and `static/`. No branch checkout, manual edit,
  fetch/ref update or branch deletion was performed.
- `favicon-logo`: exists remotely at `2517f2c09de1cb49e0d937844c957c0f411e7173`;
  no local branch/ref was present. Its tip is an ancestor of main, and main history
  includes merge `1f2ede9` for that branch. Appears historical/already merged, but
  retained; remote branch cleanup is out of scope.

## Verification

Commands were run from the repository unless shown otherwise:

| Command / check | Baseline | After cleanup |
| --- | --- | --- |
| `git status`; `git branch --show-current` | Main; one unrelated untracked image | Main; only documented cleanup changes |
| `npm ci` | Pass | Pass after deleting local build output; same warnings/audit summary |
| `npm test -- --watchAll=false` | 1 suite / 2 tests pass | 1 suite / 2 tests pass; same act warning |
| `npm run build` | Compiled successfully | Compiled successfully; identical bundle names and gzip sizes |
| `node --check scripts/visual-audit/capture.cjs` | Not applicable before relocation | Pass |
| `node --check scripts/visual-audit/verify.cjs` | Not applicable before relocation | Pass |
| `git diff --check`; `git diff --cached --check` | Clean starting tree | Pass |
| SHA-256 comparison of all build files | Saved baseline inventory | Identical file set; only logo192.png/logo512.png differ |
| Public/build copy and manifest checks | Public assets present | All manifest icons/bundles exist; public files copied byte-for-byte |
| Hash comparisons of retained source, package/lockfile, favicon/master, user screenshot | Saved baseline inventory | Unchanged |

Exact browser execution:

```sh
python3 -m http.server 3031 --bind 127.0.0.1 --directory build
PUPPETEER_MODULE=/tmp/betcast-hygiene/tools/node_modules/puppeteer-core node /tmp/betcast-hygiene/baseline/verify.cjs
PUPPETEER_MODULE=/tmp/betcast-hygiene/tools/node_modules/puppeteer-core node /tmp/betcast-hygiene/after/verify.cjs
```

The temporary copies derive from the original tracked audit script, replace origin
port 3017 with 3031, and replace only the stale touch-scroll assertion with a
recorded warning plus client/scroll-width measurement. They write evidence under
`/tmp`, without weakening the retained script or changing the application/tests.
Puppeteer was installed only in `/tmp/betcast-hygiene/tools`, using
`npm install --prefix /tmp/betcast-hygiene/tools --no-audit --no-fund puppeteer-core`.

Both baseline and post-cleanup runs completed:

- **52 chart-state checks**: all 13 views, normal data, weeks 2–4, week 3 alone,
  and an empty out-of-range filter.
- **78 viewport/theme checks**: all 13 views at 390×844, 768×1024 and 1440×900,
  both light and dark; no document-level horizontal overflow.
- Real sheet data loaded (63 current-season / 96 previous-season bets); no sample
  fallback accepted. Season switching, deliberately failed request and Retry passed.
- Filter controls matched the expected real-data bet count; chart selection worked
  by pointer and keyboard; desktop table sorting worked with Enter/Space.
- Chart tooltip displayed the expected bet/currency values; theme toggle passed.
  The desktop tooltip screenshot is **byte-identical before/after** and was inspected.
- Link copied through the real browser clipboard with chart/range/week/comparison
  state; previous-season link retained its season parameter.
- Copied embed URL opened and reloaded with its selected chart, filters, explicit
  light theme and hidden outer chrome intact.
- Share clipboard fallback passed. Native-share payload/success/cancellation were
  simulated with browser API stubs; no external share recipient was contacted.
- CSV downloaded four week-3 rows with the existing euro-unit headers. Baseline and
  post-cleanup exports are **byte-identical**.
- **Zero unexpected console/page errors** in either run; intentionally injected
  failed data requests were isolated from that count. The sole audit warning is
  the pre-existing mobile-scroll expectation described above.

No physical device, non-Chromium engine or actual publication was exercised.
The optional historical audit script is not claimed to pass unmodified.

Final review covers every deletion in the inventory above, the two image
replacements, ignore/docs changes, and relocated audit tools. No CSS/UI/business
logic changes, package upgrades, lockfile churn or generated build files are included.

## Before / After

| Measure | Before | After |
| --- | ---: | ---: |
| Source-control file set | 130 files | 33 files after committing this change |
| Logical source-control payload | 29,978,170 bytes | Approximately 2.74 MB, including this report |
| Working tree on disk, including dependencies/build and `.git` | Approximately 421 MiB | Approximately 399 MiB |
| Stale root templates/deployment output | 15 files / 8,128,229 bytes | 0 |
| Tracked generated audit evidence | 70 files | 0; three authored tools retained elsewhere |
| Non-audit image asset payload | 10,942,862 bytes | 1,830,985 bytes |

The proposed source-control set excludes deleted paths and ignored local files and
includes the new docs/tools. `git ls-files` alone still includes unstaged deletion
entries before commit. On-disk numbers vary with npm caches and builds and are
approximate; Git object history remains about 28 MiB. This does not rewrite history
or reclaim historical binary blobs from existing clones.

## Remaining cleanup candidates

- **PROBABLY SAFE / HUMAN REVIEW:** `@testing-library/user-event` has no current
  direct import; retain until a deliberate test-dependency decision.
- **MUST KEEP:** optional visual-audit source tools. Their historical mobile-scroll
  assertion needs a separate update to reflect the compact mobile table. The
  comparison viewer requires newly supplied external publication reference captures.
- **MUST KEEP:** full-resolution `public/logo.png`, favicon, bookmaker assets,
  web-vitals hook, test infrastructure and deployment tooling; verified consumers
  or ongoing engineering value.
- **PROBABLY SAFE / HUMAN REVIEW:** public manifest advertises favicon sizes
  64/32/24/16, while current ICO contains 16/32/48. This pre-existing metadata mismatch
  was left unchanged to keep favicon behavior outside the cleanup.
- **HUMAN REVIEW:** dependency vulnerabilities/deprecations require a separately
  scoped maintenance effort; no CRA migration or upgrade was attempted.
- **MUST KEEP:** unrelated local reference image and IDE workspace files. Now ignored,
  never deleted. Remote branch deletion remains outside this task.
