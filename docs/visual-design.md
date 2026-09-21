# BetCast visual conventions

The application adapts F1 Stories typography, warm palettes, thin rules, and
restrained controls to an analytical interface. The authoritative implementation
is `src/App.css`, `src/App.js`, and `src/components/BetCast.jsx`.
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
| BC-12 | Compact footer attribution and publication utility links. |
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

Known historical limitation: `verify.cjs` assumes that a mobile table must scroll
horizontally. The current compact table fits its viewport, so the
`tableScroll > 0` assertion fails. Preserve this known failure until the audit is
deliberately updated; it is not an application regression. Other assertions depend
on live sheet data, browser behavior, and clipboard permissions. Native sharing is
tested with a stub, not an external recipient. Chromium emulation does not replace
physical-device or cross-browser testing.

## Public images

`public/logo.png` is the unchanged 1024×1024 master and header asset.
`public/logo192.png` and `public/logo512.png` contain the same artwork resized to
their manifest dimensions. On macOS, regenerate them without redesigning the logo:

```sh
sips -z 192 192 public/logo.png --out public/logo192.png
sips -z 512 512 public/logo.png --out public/logo512.png
```

Keep `public/favicon.ico` and `public/bookmakers/`: HTML and runtime URLs use them.
