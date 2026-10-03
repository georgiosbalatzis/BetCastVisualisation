# BetCast design tokens — Priority 4B

The canonical source is **`georgiosbalatzis/f1StoriesPage/styles/editorial.css`**.
The contract is `f1StoriesPage/docs/design-tokens.md`; its resolved snapshot is
`docs/design-tokens.json` in that repository. BetCast locally mirrors the core
contract in `src/App.css`. It is independently buildable and never fetches tokens,
imports another repository, or uses the homepage night/reading variants.

Synced 2026-10-03 from the **current local Priority 4A implementation**, main-site
HEAD `2523a16a9de82d463428f4d9b46aeb226c840637` (Establish canonical F1Stories
visual token contract). Source CSS and manifest match that revision; their SHA-256
hashes are recorded in this repository's [local snapshot](design-tokens.json).

## Mirrored core and compatibility aliases

| Canonical token | Light | Dark | Existing BetCast name |
| --- | --- | --- | --- |
| `--bg-base` | `#f2eee4` | `#1b1a19` | `--bg` |
| `--bg-surface` | `#e9e3d6` | `#242321` | `--surface` |
| `--bg-surface-alt` | `#dfd9ca` | `#2e2c29` | `--surface-raised` |
| `--text-primary` | `#20251f` | `#eee8db` | `--text` |
| `--text-secondary` | `#5b6256` | `#b6bbac` | `--text-muted` |
| `--border` | `#c8c8b9` | `#4b5146` | `--border`, `--grid` |
| `--accent` | `#a82e1c` | `#ff775f` | `--accent` |
| `--signal` | `#ed4c32` | `#ed4c32` | brand/current indicators |

Aliases are declared on both theme scopes so inherited root aliases cannot retain
resolved dark values in a light subtree. Accent remains the readable interaction
color; signal marks brand/current state and does not mean betting loss.
`--accent-hover` and `--accent-contrast` mirror the canonical helper values.
`--radius` aliases canonical `--radius-control: 2px`.

The former light border/grid were `#bcb9ae` / `#d4d0c5`; other core light colors
already matched. The former dark generic page/surface/raised/text/muted/border/
accent were `#181a1c`, `#222426`, `#2c2e30`, `#eee7dc`, `#bcb8b0`, `#47494a`,
`#ff826b`. None now drives generic UI.

## Surface-aware and product exceptions

- The statistics and sponsor strips retain fixed canonical paper `#e9e3d6` and
  ink `#20251f`, with light secondary/accent foregrounds. Scoped text aliases
  resolve on these surfaces. Dark-page accent is not applied to fixed paper.
- The footer uses canonical ink/paper, inverse metadata `#c0bfb2` and
  `--border-inverse: rgba(233, 227, 214, 0.18)` in both themes. Its former dark
  homepage charcoal `#17191b` is removed.
- The light masthead and statistics rules use a 20% ink derivative. Hover washes
  and social hover borders derive from their local text/paper tokens; they are
  decorative, not accessible indicators by themselves.
- White `#fff` behind bookmaker assets is retained for brand readability. All
  bookmaker/sponsor artwork, chart geometry, gradients and opacity are unchanged.
- IBM Plex Sans / Barlow Condensed and their existing fallback stacks remain.
  No named main-site fallback is copied without its font-face declarations.
- Existing square/flat surfaces, 1px rules, 2px controls, circular theme icon,
  dense 40px controls and 44px shell targets retain their established geometry.

Exact data-series colors are preserved separately from generic UI:

| Local semantic token | Light | Dark | Meaning |
| --- | --- | --- | --- |
| `--chart-accent` | `#a82e1c` | `#ff826b` | Budget/cumulative ROI/high milestone |
| `--chart-muted` | `#5b6256` | `#bcb8b0` | Neutral categories, rolling average, initial/zero references |
| `--chart-reference` | `#20251f` | `#eee7dc` | Budget comparison/reference series |
| `--success` | `#276846` | `#70bd91` | Profit/win/positive data |
| `--error` | `#ad322c` | `#f17b75` | Loss/negative data |

The three old dark literals above each remain **once**, exclusively in their
chart-token declarations. Chart text, axes, grids and tooltip chrome use generic
UI tokens. The budget legend uses the same reference ink as its series.
The fixed paper statistics panel uses light-theme success/error foregrounds;
its former pale dark-theme foregrounds had only 1.75:1 / 2.10:1 contrast there.
The scoped replacements achieve 5.21:1 / 5.02:1 and preserve green/red meanings.

Default focus is 2px accent with 5px offset. Light masthead focus uses ink;
light footer focus uses paper; paper panels use light accent. Sponsor focus keeps
its existing tighter 2px offset and mobile-menu focus its -5px inset. Sortable
headers use a -3px inset to prevent clipping by the table scrollport. These
outlines do not affect layout. Border tokens are structural, not sole focus cues.

## Raw-color inventory

Scope: literal hex/rgb/hsl occurrences in production `src/` CSS/JS/JSX, excluding
tests, documentation, token manifests, generated output and dependency files.
All occurrences are in `src/App.css`; application JS contains no raw colors.
Definitions with multiple consumers count once, not once per rendered use.

| Classification | Before | After |
| --- | ---: | ---: |
| A. Generic UI/core and fixed-surface primitives | 47 | 26 |
| B. Betting/data semantic definitions | 4 | 12 |
| C. Logo/media backing | 1 | 1 |
| D. Unused legacy/duplicate declarations | 6 | 0 |
| **Total occurrences** | **58** | **39** |
| **Unique literals** | **35** | **27** |

Before B includes success/error; chart inks borrowed A's generic tokens. After B
includes explicitly separated chart inks and fixed-paper success/error mappings.
Before D includes unused raised/hover/contrast definitions; their canonical
replacements remain documented primitives. The aim is semantic ownership, not
eliminating all literals. Public HTML's static `#111113` browser theme-color and
raw colors inside brand SVG assets are separate media/metadata exceptions and
remain unchanged; the pre-paint script and theme contract are untouched.

## Local validation

`npm run check:tokens` compares CSS against the checked-in expected manifest,
including aliases, fixed-paper helpers, preserved data inks and default focus.
It has no dependency or network requirement and does not require the main-site
repository. It detects local drift, not upstream changes: future syncs must read
the canonical source and update this snapshot and provenance together.

The optional `scripts/visual-audit/tokens.cjs` uses the same external Chrome and
puppeteer-core prerequisites as the existing browser audits. Serve a production
build on port 3017, then run:

```sh
PUPPETEER_MODULE=/path/to/puppeteer-core node scripts/visual-audit/tokens.cjs before
# Apply token changes and rebuild, then:
PUPPETEER_MODULE=/path/to/puppeteer-core node scripts/visual-audit/tokens.cjs after
```

`AUDIT_URL` can point the baseline at an isolated original build. Captures and
JSON go to ignored `artifacts/visual-rework/tokens/`. Both runs reuse a captured
real-data fixture and timestamp, disable animation and hold app scripts until the unchanged webfonts load
(Recharts caches its initial tick measurements). Offscreen lazy images are
explicitly decoded before capture. They compare all 13 views at 1440/1280/768/390/375 in light/dark:
boxes, fonts, spacing, border widths, radii, SVG paths, series colors/opacities and
metrics. The after run checks computed core tokens, sampled text contrast and
focus clipping, plus explicit light/dark and auto under both OS editions.

## Guidance for Priority 4C / 4D

For Telemetry and Ghost Car, read the then-current core source and classify
surface/text/grid/tooltip values separately from telemetry series, drivers,
comparison cars, track markers and status meanings. Mirror tokens locally;
resolve compatibility aliases on every theme scope. Preserve existing chart/car
inks unless their migration is explicitly approved. Retain their typography,
layout, stacking, theme resolution/pre-paint/storage and Race Desk hierarchy,
including Ghost Car's compact loaded-mobile exception. Verify light near-zero
changes, intentional dark palette changes, fixed-surface focus and clipped
scrollports with frozen data and computed geometry. Reuse the local guard pattern
without copying BetCast's betting-specific aliases or semantic colors. Distribution
automation and localization remain separate priorities.

## Validation of this sync (2026-10-03)

Priority 4B is complete for the local implementation. No deployment or commit
was made. Only the following BetCast files changed: `src/App.css`, the
`CHART_COLORS` references in `src/components/BetCast.jsx`, `package.json`,
`docs/visual-design.md`, this document, `docs/design-tokens.json`,
`scripts/check-tokens.cjs` and `scripts/visual-audit/tokens.cjs`.

- Jest: 42 tests / two suites passed. Existing Testing Library `act` deprecation
  warning remains; dependencies were not changed.
- ESLint, production build, token guard and `git diff --check`: passed.
- Existing browser suites: 52 chart checks, 78 viewport checks, 10 shell checks,
  25 theme checks, and 24 capture states passed, without runtime errors or page
  overflow. Shell/capture checks were repeated after the inset focus correction.
- Sharing/copy/native-share/failure, embed theme/reload/isolation, CSV, keyboard
  sorting, selector navigation, tooltips, filters, retry and current/previous-year
  flows passed with actual fetched data (72 current / 96 previous-year rows).
- New frozen-data comparison: all 130 view/theme/width combinations passed exact
  geometry, series-ink/opacity and metric assertions. This compares 23,978 sampled
  geometry records and 970 series elements. Initial font-timing noise was resolved
  by loading the unchanged fonts before Recharts mounts, without weakening checks.
  Lazy images are decoded before capture to avoid blank offscreen sponsor strips.
- Computed primitives, contrast and focus passed in 14 scenarios: the ten
  viewport/theme combinations plus explicit light/dark and auto under OS
  light/dark. Stored `auto` remains `auto`. Existing browser theme checks cover
  migration, first paint, query isolation and live OS changes.
- 2,884 sampled text/background checks passed; minimum was 4.94:1. All 526 tested
  focus targets had visible 2px outlines and no scroll-container clipping.
  These are sampled Chromium checks, not a claim of exhaustive accessibility
  certification or physical-device/cross-browser coverage.
- Light screenshots changed 0–1.20% of pixels (maximum RGB-channel difference
  greater than 2), attributable to canonical rules/grid, the product signal dot,
  inverse separator/focus mappings. No layout
  change was found. Dark screenshots intentionally change canvas, surface, text,
  border/accent and footer colors; exact series inks and geometry remain stable.
- Desktop/mobile comparisons and the paper statistics panel were visually reviewed.
  The original table-header focus clipping and pale status text on fixed paper
  were corrected. Ordinary geometry and all assets were preserved.
- Production CSS grew approximately 315 bytes gzip; JS is effectively unchanged
  (main -2 bytes, analysis chunk +3 bytes in CRA's report). Guards/audits are not
  included in the app bundle. No new runtime work or dependency was introduced.

Generated evidence is in `artifacts/visual-rework/tokens/`: `comparison.html`
provides a before/after viewer, `before.json` / `after.json` record geometry and
accessibility checks, and `pixel-comparison.json` records the visual measurements.
The existing suites write their usual evidence under `artifacts/visual-rework/`.
ThemeContext, HTML/pre-paint, data services, business calculations, chart/data
layout, copy, shell structure and Race Desk exclusion remain unchanged. No other
product repository was modified. Localization (including existing English labels),
shared-token distribution automation and product-specific visualization/accessibility
work remain separate from this convergence pass.
