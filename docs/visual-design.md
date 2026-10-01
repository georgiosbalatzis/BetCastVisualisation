# BetCast visual conventions

The application adapts F1 Stories typography, warm palettes, thin rules, and
restrained controls to an analytical interface. The authoritative implementation
is `src/App.css`, `src/components/SiteMasthead.jsx`,
`src/components/SiteFooter.jsx`, and `src/components/BetCast.jsx`.
This document consolidates durable guidance from the completed visual rework and
BC-01–BC-16 critique; the historical reports remain available in Git history.

## Visual system

- IBM Plex Sans for Greek interface text and numbers; Barlow Condensed for branding.
- Dark page/surface: `#181a1c` / `#222426`; text/muted: `#eee7dc` / `#bcb8b0`;
  accent: `#ff826b`.
- Light page/surface: `#f2eee4` / `#e9e3d6`; text/muted: `#20251f` / `#5b6256`;
  accent: `#a82e1c`.
- Shared CSS variables also color Recharts. Preserve thin rules, restrained 2px
  control corners, tabular numbers, and 22/32/48px mobile/tablet/desktop gutters.
- Budget and ROI lead the summary. A grouped native selector exposes 13 analysis
  views; sharing sits below the visualization and CSV belongs beside the table.

## Existing behavior to preserve

| Prior finding | Accepted behavior |
| --- | --- |
| BC-01 | Compact mobile setup; analysis selector beside heading; plot begins around y=600 at 390×844. |
| BC-02 | Publication destination navigation, mobile menu, and current BetCast marker. |
| BC-03 | Responsive results/Kelly tables prioritize subject, profit, stake, and Kelly percentage. |
| BC-04 | Week comparison aligns both values and their difference in one row, with Greek outcome labels. |
| BC-05 | Category labels remain readable; dense odds plots scroll with a visible cue. |
| BC-06 | Cumulative ROI tooltip shows one ROI value, excluding internal layers and baseline. |
| BC-07 | Legends identify meaningful series; weekly profit distinguishes bars from Budget line. |
| BC-08 | Compact doughnut/outcome layout; average odds have explicit labels. |
| BC-09 | Expected-value labels are Greek; probability differences have percentage-point units. |
| BC-10 | Financial/outcome colors do not imply an unexplained 50% win-rate threshold. |
| BC-11 | Empty periods use neutral unavailable metrics, matching filter state and a clear action. |
| BC-12 | Global F1Stories colophon, section index, social and legal links. |
| BC-13 | Bookmaker aliases, including `stoximan`, resolve to consistent public assets. |
| BC-14 | Loading placeholders retain the main content regions and geometry. |
| BC-15 | Theme control has a recognizable sun with a central disc. |
| BC-16 | Equivalent monetary/rate values use consistent display precision and units. |

Preserve keyboard sorting, table/plot touch behavior, reduced-motion support,
tooltip readability, both themes, season/week filtering, URL state, embed resize
messages, explicit embed theme on reload, link sharing, and CSV formatting.

## Optional historical browser audit tools

`scripts/visual-audit/capture.cjs` and `verify.cjs` retain the authored browser
automation from the visual rework. They are separate from the Jest suite and
require an externally installed `puppeteer-core` module and Google Chrome at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
They use `http://localhost:3017`; serve a fresh production build there first:

```sh
npm run build
python3 -m http.server 3017 --directory build
# In another terminal; use the absolute path to your installed module:
PUPPETEER_MODULE=/path/to/node_modules/puppeteer-core node scripts/visual-audit/capture.cjs
PUPPETEER_MODULE=/path/to/node_modules/puppeteer-core node scripts/visual-audit/verify.cjs
```

Outputs go to ignored `artifacts/visual-rework/`, including captures, JSON results,
and CSV downloads. The relocated `comparison.html` viewer reads screenshots there;
its publication reference captures must be supplied separately. Audit tools do not
run during build or deployment and add no application dependency.

`verify.cjs` checks horizontal table scrolling only when the table actually
overflows; the compact mobile table is also valid when it fits. Assertions depend
on live sheet data, browser behavior, and clipboard permissions. Native sharing is
tested with a stub, not an external recipient. Chromium emulation does not replace
physical-device or cross-browser testing.

The focused shell audit uses the same prerequisites and production server:

```sh
PUPPETEER_MODULE=/path/to/node_modules/puppeteer-core node scripts/visual-audit/shell.cjs
```

It checks 1440, 1280, 768, 390 and 375px in both themes, global link destinations,
current-page state, minimum target heights, keyboard menu/focus behavior, theme
persistence, resize dismissal, overflow and embed isolation. Screenshots and
`shell-results.json` are written to `artifacts/visual-rework/shell/`.

## Public images

`public/logo.png` is the unchanged 1024×1024 master. The masthead uses the existing
`public/logo192.png` derivative at 38px desktop / 32px mobile.
`public/logo192.png` and `public/logo512.png` contain the same artwork resized to
their manifest dimensions. On macOS, regenerate them without redesigning the logo:

```sh
sips -z 192 192 public/logo.png --out public/logo192.png
sips -z 512 512 public/logo.png --out public/logo512.png
```

Keep `public/favicon.ico` and `public/bookmakers/`: HTML and runtime URLs use them.

## Global shell parity — Priority 1

Reference audited on 2026-10-01: `georgiosbalatzis/f1StoriesPage` commit
`1d8d725c57b29763422b1a5b26ccdfbfa04419f6`, specifically
[`partials/nav.html`](https://github.com/georgiosbalatzis/f1StoriesPage/blob/1d8d725c57b29763422b1a5b26ccdfbfa04419f6/partials/nav.html),
[`partials/footer.html`](https://github.com/georgiosbalatzis/f1StoriesPage/blob/1d8d725c57b29763422b1a5b26ccdfbfa04419f6/partials/footer.html),
[`styles/editorial.css`](https://github.com/georgiosbalatzis/f1StoriesPage/blob/1d8d725c57b29763422b1a5b26ccdfbfa04419f6/styles/editorial.css),
and the shared-nav CSS/JS, live homepage and `/standings/`.

The masthead follows the canonical seven-item order, with BetCast current.
It is fixed, 75px desktop / 67px below 992px plus the bottom rule; shell gutters
are 48/32/22px. Chart scroll offsets account for the fixed header. The product
hero, charts, tables, calculations, data sources and content tokens are unchanged.
The colophon follows the canonical brand/mission, section index, copyright,
five social destinations and legal row. Source/README authorship is unchanged.

Intentional adaptations:

- No race countdown: BetCast has no race schedule service. The canonical countdown
  owns schedule fetching, caching, country mappings, fallback calendar and timers;
  importing that subsystem is outside this shell pass. No stale static race is shown.
- No cookie-settings button: BetCast has no analytics/consent manager for it to
  control. Both canonical legal destinations remain available.
- BetCast links stay in the current tab because they point to this application;
  YouTube and social destinations retain external-tab behavior and safe `rel` values.
- The dark masthead uses the shared editorial/standings charcoal. The footer keeps
  the homepage charcoal in dark mode. Surfaces are flat, using the existing fonts,
  logo artwork and inline social/theme SVGs rather than loading the main site's CSS
  or icon sprite at runtime.
- `betcast_theme`, explicit URL themes, system preference and embed behavior are
  preserved. Theme-key unification remains Priority 2.

Validation: four Jest tests, ESLint, production build, ten shell viewport/theme
checks, and the existing 52 chart / 78 viewport checks passed. The browser audit
also covered live sheet data, filters, sorting, tooltips, CSV, sharing, embeds and
retry. Main-site and BetCast header/menu/footer captures were visually compared.
The existing Testing Library emits a React `act` deprecation warning; dependencies
were not changed in this pass.
