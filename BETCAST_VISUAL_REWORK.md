# BetCast visual rework

Implemented locally; not deployed. This rework translates the current F1 Stories publication into an analytical application while keeping React, Recharts, data sources, and calculations.

## 1. F1 Stories characteristics identified

Inspected the rendered [publication](https://f1stories.gr/), its [Data Hub](https://f1stories.gr/standings/), [production BetCast](https://georgiosbalatzis.github.io/BetCastVisualisation/), and local BetCast at 390, 768, and 1440 px before implementation. Both publication themes were opened. Reference screenshots and computed CSS are in `artifacts/visual-rework/`.

The publication uses typography, open space, numbered section labels, and thin rules for hierarchy. The logo combines its existing image with a condensed wordmark and terminal dot. Navigation is compact. The Data Hub adapts this vocabulary into selectors and data rows rather than repeating the homepage hero. Most controls have square or 2px corners. Shadows and surface elevation play little role.

The rendered body/editorial tokens were used; legacy root variables on the site include older blue colors that do not describe its current appearance.

## 2. Visual translation map

| Decision | Observed F1 Stories system | BetCast translation |
| --- | --- | --- |
| Dark page / surface | `#181a1c` / `#222426` | Same; charts sit on the page, tooltips use the surface |
| Dark text / muted | `#eee7dc` / `#bcb8b0` | Same for interface, values, labels, metadata |
| Dark accent | `#ff826b` | Brand punctuation, selected emphasis, focus, Budget series |
| Light page / surface | `#f2eee4` / `#e9e3d6` | Warm paper palette, not an inverted dark theme |
| Light text / muted / accent | `#20251f` / `#5b6256` / `#a82e1c` | Same functional roles |
| Positive / negative | Semantic outcome colors | Readable muted green/red variants; never unrelated KPI backgrounds |
| Body / interface | IBM Plex Sans | Greek copy, forms, numbers, chart annotations, tables |
| Brand / display | Barlow Condensed | F1 STORIES and BETCAST; Greek interface remains Plex |
| Borders | Thin neutral rules | Section separation, metric columns, table rows |
| Corners / shadows | Restrained, mostly 2px; minimal shadow | 2px controls, no floating metric/chart cards or glows |
| Buttons / links | Quiet outlined controls and underlined text actions | Sharing below the graph; CSV remains beside the table |
| Navigation | Compact publication navigation; mobile adaptation | Brand/home link, Data Hub context, theme control; grouped native chart select |
| Section labels | Small uppercase labels, spacing, numbering | `01 / BETCAST`, `02 / ΑΝΑΛΥΣΗ`, `03 / ΣΤΟΙΧΕΙΑ` |
| Rhythm / gutters | 22px mobile, 32px tablet, 48px desktop; wide bounded content | Same gutters, 1476px maximum including gutters; tighter analytics spacing |
| Icons | Restrained line icons and social SVGs | Existing logo, line theme/download SVGs, existing social icons |

Tokens are consolidated in `src/App.css`. Recharts references the same CSS color variables, avoiding a separate chart palette.

## 3. Major visual problems removed

- Removed colored KPI tiles, emphasized card outlines, nested cards, shadows, decorative background streaks, and the raised tab tray.
- Replaced 13 equally weighted horizontal tabs with a labelled select grouped into performance, betting/probability, and comparison/data families.
- Removed repeated navigation icons and status emoji decoration from the secondary metric presentation.
- Moved sharing and freshness metadata below the visualization.
- Removed chart gradient fills in favor of a light, flat area tint and neutral horizontal grid lines.

## 4. Header changes

The header now reads `F1 STORIES. / BETCAST`, using the existing logo asset and a link back to the publication. Data Hub is available on larger screens. Mobile retains the brand link and one small theme control without adding a menu for unnecessary destinations. Attribution remains in the footer. The footer adopts the publication's dark treatment in both themes.

## 5. Typography changes

Barlow Condensed identifies the product. IBM Plex Sans handles Greek headings, controls, metrics, chart labels, and tables. Values use tabular numerals. Font weights distinguish labels from values without making everything bold. Browser font inspection confirmed that the Greek introductory text renders with the downloaded IBM Plex Sans font, not only its fallback. Existing `display=swap` and system fallbacks remain.

## 6. KPI changes

Budget and ROI lead as two large numbers separated by a rule. Bets, wins, and win percentage form a smaller statistical strip. Desktop aligns both groups in one row; mobile and tablet use two deliberate rows, without an orphan fifth card. The values retain their existing calculations and filtering semantics. Streaks, best/worst weeks, and deviation sit in a disclosure below the analysis.

## 7. Chart and table changes

The chart heading, grouped selector, plot, explanatory caption, and actions form one section. Changing views scrolls to the selector and chart together. Recharts uses the shared theme tokens, 12px ticks, restrained legends, horizontal grid lines, compact bar corners, and editorial annotation tooltips. Monetary axes show euros; captions explain each view's measures. Donut labels sit inside the hole to prevent narrow-screen clipping.

Tables retain all columns and horizontal scrolling, with thin row separators and tabular numeric alignment. Touch scrolling inside tables cannot activate chart swipe navigation. Sorting still supports pointer, Enter, and Space. QA exposed a nested state-update problem that could double-toggle sorting in development; it now updates the column/direction deterministically without changing the comparator.

The empty-data region is visible rather than hidden by the former panel's `hidden` attribute. Loading and error states use the same type, rules, surfaces, and restrained controls. Reduced-motion preference disables chart entrance animation as well as CSS animation and smooth scrolling.

## 8. Mobile — 390 × 844

22px gutters; compact sub-brand header; three aligned shared filters; primary two-column KPIs with a three-value secondary strip; full-width grouped chart select directly above the visualization. Chart selection is visible in the first screen. Tables scroll within their region. Tooltips were exercised near both sides of the plot and remained inside the viewport. The donut label has no external callout to clip.

## 9. Tablet — 768 × 1024

32px gutters. Filters and period metadata fit deliberately; the selector shares a row with the analysis label. The metric area uses two balanced rows instead of a partially filled dashboard grid. Charts receive a 370px plot height.

## 10. Desktop — 1440 × 900

48px gutters align header, main content, rules, and footer. The page is bounded rather than indefinitely stretched. The KPI area is one statistical strip. Chart selection is at the right edge of the analysis heading, with room for a readable plot and legends.

### Five-point self-critique and corrections

1. **Wrong wide-screen gutters:** corrected the theme-token cascade so tablet/desktop actually receive 32/48px padding.
2. **Awkward tablet filter wrapping:** narrowed filter columns and bounded the scope metadata.
3. **Busy chart grid:** removed vertical grid lines and strengthened the primary data trace without adding decoration.
4. **Quiet product identity:** replaced the generic headline with the condensed `BETCAST.` title and a concise Greek description.
5. **Insufficient chart context:** added currency ticks and view-specific measurement captions, retaining the original data semantics.

## 11. Files changed in this rework

- `src/App.css`: replaced the accumulated dashboard styling with the compact editorial token/layout system.
- `src/App.js`: sub-brand header, footer identity, Greek theme names, compact loading fallback.
- `src/components/BetCast.jsx`: composition, KPI strip, grouped selector, chart styling/captions, secondary disclosure, state visibility, table interaction correction, and preservation of explicit embed theme on URL updates.
- `src/components/ErrorBoundary.jsx`: matching error presentation without decorative emoji.
- `src/App.test.js`: updated the existing header assertion to the new linked wordmark and waited for lazy content.
- `artifacts/visual-rework/`: reference/local screenshots, computed reference tokens, browser verification scripts/results, comparison viewer, and captured CSV.
- `BETCAST_VISUAL_REWORK.md`: this report.

The repository already had changes to manifests, font/language HTML, theme initialization, and `prompt.md`; those were preserved. No package, service, calculation, API, framework, or deployment configuration changes were introduced by this rework.

## 12. Verification performed

- `npm run build`: passed.
- `npm test -- --watchAll=false --runInBand`: both existing tests passed after updating the header expectation.
- `git diff --check`: passed.
- Served the compiled `build/` output locally and smoke-tested real data loading and chart selection at 390px; captured the loading state while its data request was paused.
- Actual fetched/cached data: 63 current-season bets over 14 weeks, and 96 previous-season bets. No sample-data fallback was accepted for these checks.
- 52 chart-state checks: all 13 views with normal data, weeks 2–4, week 3 alone, and an empty out-of-range filter.
- 78 viewport checks: all 13 views at all three widths in both themes; no document-level horizontal overflow.
- 24 representative full-page captures: default Budget, table, dense odds-distribution chart, and empty state at all widths in both themes. Inspected screenshots, plus mobile donut and mobile/desktop tooltips.
- Keyboard: header links/theme, season/week controls, native chart selector, sharing actions, disclosure, footer; Enter/Space sorting verified.
- Native mobile touch scroll: table moved horizontally while chart selection remained unchanged.
- Filter controls were operated and their resulting bet count compared with the actual loaded data.
- Link copied to the real browser clipboard; chart, range, highlighted week, and comparison parameters checked. Previous-season link checked separately.
- Copied embed URL opened and reloaded: selected view, filter state, light theme, and hidden outer chrome verified. Explicit theme survives URL state updates.
- CSV download exercised: four rows for highlighted week 3, with euro-unit headers and two-decimal monetary values.
- Share clipboard fallback exercised. Native Web Share payload/success and cancellation feedback tested through an injected browser API stub; an external recipient was not contacted.
- Failed previous-season data requests deliberately injected; Retry succeeded after restoring the real network request.
- No unexpected console/page errors in the functional or capture runs. Deliberately induced network errors were isolated from that count.
- The browser skill guided reference inspection; Puppeteer/CDP drove the repeated matrix, touch input, screenshots, clipboard, and download checks.

Detailed evidence: [functional checks](artifacts/visual-rework/verification-results.json), [capture checks](artifacts/visual-rework/capture-results.json), [mobile tooltip bounds](artifacts/visual-rework/mobile-tooltip-checks.json).

### Screenshots

| Size | Dark | Light |
| --- | --- | --- |
| Mobile | [390 × 844](artifacts/visual-rework/dark-390-viewport.png) | [390 × 844](artifacts/visual-rework/light-390-viewport.png) |
| Tablet | [768 × 1024](artifacts/visual-rework/dark-768-viewport.png) | [768 × 1024](artifacts/visual-rework/light-768-viewport.png) |
| Desktop | [1440 × 900](artifacts/visual-rework/dark-1440-viewport.png) | [1440 × 900](artifacts/visual-rework/light-1440-viewport.png) |

Full-page equivalents use `{theme}-{width}-default.png`. Additional states use `-table.png`, `-dense.png`, and `-empty.png`. See also [mobile donut](artifacts/visual-rework/mobile-pie.png), [mobile tooltip](artifacts/visual-rework/mobile-tooltip.png), and [retry error](artifacts/visual-rework/retry-error.png).

Cross-site review: [comparison viewer](artifacts/visual-rework/comparison.html), [mobile comparison](artifacts/visual-rework/comparison-mobile.png), [desktop comparison](artifacts/visual-rework/comparison-desktop.png). Compare the shared wordmark, warm colors, gutters, rules, section labels and controls; BetCast deliberately keeps an analytics composition rather than reproducing the article hero.

## 13. Remaining compromises and verification limits

- Dense tables intentionally scroll horizontally on phones. Native grouped select menus retain the operating system's popup appearance.
- Desktop uses a grouped native select too: all 13 views are available without a second navigation layer or tab overflow.
- Representative full-page screenshots use reduced motion to avoid animated SVG clipping during automated capture. Normal-motion mobile donut and tooltip views were also rendered and inspected.
- Native sharing opens platform-specific UI; the external share sheet itself was not end-to-end automated. Share continues to share a link, as the existing implementation did. There is no screenshot-sharing feature to claim as tested or newly implemented.
- Existing Browserslist freshness and testing-library `act` deprecation warnings remain; no packages were upgraded.
- QA used Chromium, including mobile viewport/touch emulation. Physical iOS/Android devices and other engines were not tested.
- Live sheet contents and the publication's news imagery will change independently of these captures. Source data/calculation behavior was retained.
