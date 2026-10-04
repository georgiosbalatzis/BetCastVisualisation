# Priority 5D — BetCast interaction audit

Audited 2026-10-04 on `main`. This is interaction/accessibility hardening within
BetCast. No sibling repository, deployment, package, product architecture, betting
calculation, data source, theme contract, typography role or token value changed.

## Inventory and measurements

Dimensions below are CSS pixels, measured in production Chrome. Before these
changes, the visible control rectangle was also its actual hit rectangle. Native
picker menus do not enlarge the initial HTML select target. Measurements use the
same captured live-sheet fixture, loaded fonts and reduced motion before/after.
There are **seven native selects** and **three sharing buttons**. Sharing uses
visible text, not icon-only buttons. The table's CSV action is the only export.

| Control | Desktop visible / hit rectangle | Touch before → after | Usage / decision |
| --- | --- | --- | --- |
| Season | 120×40 | At 390: 107.33×40 → 107.33×44, visible and hit | Primary shared native filter; desktop retained |
| From week | 120×40 | At 390: 107.34×40 → 107.34×44 | Primary shared native filter; desktop retained |
| To week | 120×40 | At 390: 107.33×40 → 107.33×44 | Primary shared native filter; desktop retained |
| Analysis / metric / strategy view | 266.69×40 at 1440 | At 390: 244.14×40 → 244.14×44; at 320: 185.41×40 → 185.41×44 | Grouped native selector for all 13 views; preserve label access on mobile |
| Table week | 145×40 | 145×40 → 145×44 | Native event/week filter; options, URL state unchanged |
| Compare week A | 359.94×36 at 1440 | At 390: 86.16×36 → 86.16×44; at 320: 60.95×36 → 60.95×44 | Native select with existing `aria-label`; desktop retained |
| Compare week B | 359.94×36 at 1440 | Same as A | Native select with existing `aria-label`; desktop retained |
| Κοινοποίηση | 68.77×36 | Visual stays 68.77×36; hit 68.77×36 → 68.77×44 | Primary mobile share action; transparent extension |
| Link | 22.16×36 | Visual stays 22.16×36; hit 22.16×36 → 44×44 | Narrowest sharing control; transparent extension |
| Embed | 37.98×36 | Visual stays 37.98×36; hit 37.98×36 → 44×44 | Transparent extension; copied iframe unchanged |
| Open BetCast in an embed | Text link, 36px minimum block height | Hit becomes at least 44×44; visible geometry retained | Uses the same `.text-action` treatment |
| Range reset | 66.06×19 | Visible 66.06×19 → 66.06×24; hit → 66.06×44 | 24px box leaves clearance above transparent extension; no overlap with selects |
| Highlighted-week reset | 66.06×36 | Visual retained; hit → 66.06×44 | Same transparent extension |
| Table × reset | 33.20×40 | → 44×44, visible and hit | Existing meaningful `aria-label` retained |
| CSV | 74.23×40 | → 74.23×44, visible and hit | Native button; download icon remains centered |
| Retry | 91.73×40 | → 91.73×44, visible and hit; 320px actual touch activation verified | Same retry handler; real previous-season recovery tested |
| Empty-period reset | 129.55×40 | → 129.55×44, visible and hit; 320px actual touch activation verified | Existing reset-all handler retained |
| Pagination previous / next | 36.88×40 | → 44×44 | Existing accessible names and native `disabled` behavior retained |
| Ten sortable desktop headers | 41px high; widths 56.98–467.16 at 1440 | Retained | Entire cells are targets; desktop table hidden below 1100; inset focus retained |
| Masthead brand | 149.92×44 desktop; 124.64×44 at 390 | Unchanged | Global home link |
| Global nav, seven destinations | 75px high; widths 42.14–78.02 at 1440 | Mobile menu links span menu width, ≥52px high | Already adequate, well spaced; unchanged |
| Theme / mobile menu | 44×44 | Unchanged | Named icon buttons; menu hidden from desktop tab sequence |
| Statistics disclosure | 53px high, full content width | Unchanged | Native `summary`, keyboard operable |
| Six sponsor links | 167.55–167.56×109.5 at 1440; 94×81.5–98 at 390 | Unchanged | Named external links; images are not separate tab stops |
| Footer wordmark / index / legal links | ≥44px high | Unchanged | Wordmark 103.22×44; index widths 45.38–89.55; legal 110.28×44 / 68.86×44 |
| Five footer social links | 44×44 | Unchanged | Existing accessible icon names retained |

There are no bookmaker selectors, separate race selectors, custom selects,
interactive numeric summary metrics, row actions, chart legend toggles or dialog
launchers. Bookmaker logos, result/Kelly rows, metric values and legends are
read-only. Weekly-profit/win-rate/ROI chart regions retain their existing point
selection and tooltip behavior; native table-week selection provides the existing
  keyboard filtering path. No new chart tab stops were introduced. The existing
fullscreen-close branch has no reachable opening control; it was left untouched.

## Select and share decisions

The primary selects are important on mobile. They have 12px gaps and sufficiently
wide boxes; raising their height by 4px does not change wrapping. At 320px the
scope filters already occupied two rows before this pass; that wrap is retained.
Comparison selects need 8px more height, without changing table widths, selected
values, options or alignment. All seven remain native. On a fine-pointer tablet
viewport (768px), the analysis selector remains 40px. On a touch-capable 1440px
viewport, it becomes 44px. The responsive rule is:

```css
@media (max-width: 639px), (any-pointer: coarse)
```

The share group's original visible gap is 16px. Centered transparent pseudo-elements
expand only the touch/compact targets. After expansion, the actual target gaps
are approximately 5.08px (Share–Link) and 2.07px (Link–Embed), with no overlap.
The visible labels, underlines, positions and toolbar dimensions remain identical.
The expanded corner points resolve to their own button through `elementFromPoint`;
actual taps outside the visible rectangles activate the correct action. Sharing
has no icon to recenter and no hover tooltip or disabled/pending visual state to
preserve. A pending native-share promise was exercised without changing behavior.

## Names, focus, keyboard and disabled states

The mobile analysis label previously used `display:none`, leaving the native
combobox unnamed in Chrome's accessibility tree. It now uses clipped, visually
hidden text, retaining the existing Greek label and association. All other selects
were already labeled. Share/Link/Embed/CSV use visible names. Theme, menu, table
reset, pagination and social icon controls already had meaningful accessible
names; no redundant ARIA was added and no tooltip was used as a sole name.

The global focus contract remains **2px accent / 5px offset**. The table exception
remains **2px / −3px inset**, and mobile-menu/surface exceptions remain unchanged.
The new audit passed 1,636 individual focus/contrast checks across representative
states, including ancestor scrollport clipping and focus-induced page overflow.
All ten sortable desktop headers expose visible inset focus; Enter/Space sorting
passes. Actual Tab workflows have 49 desktop stops and 33 mobile stops in the
unfiltered table view, in DOM order: shell → shared filters → analysis → CSV/table
filter → desktop sorting → enabled pagination → sharing → details → sponsors →
footer. There is no keyboard trap or decorative Recharts stop. CSV remains beside
the table, rather than being reordered to follow sharing.

The clipboard fallback previously removed its textarea and left focus on the
body. It now restores the invoking element with `preventScroll:true`, and removes
the temporary textarea in `finally`, including copy failures/exceptions. Modern
clipboard and native-share behavior and all payloads are unchanged.

Pagination retains native `disabled`; disabled actions are omitted from Tab order
and cannot move past the last page. Previously opacity `.45` lowered disabled
arrow contrast to approximately **1.91:1 light / 2.83:1 dark**. Disabled buttons now
use existing muted text at full opacity and a dashed border, giving **5.45:1 light
/ 8.85:1 dark**, with the same geometry and disabled conditions. Enabled controls
retain their existing hover/focus treatments.

## Responsive and geometry evidence

Before/after full-page budget, dense-odds, comparison and table captures, plus
top/menu/footer captures, cover **1440, 1280, 768, 390, 375 and 320** in light/dark.
The 768px matrix uses touch emulation; fine-pointer compactness is checked
separately. Every one of the 13 views is also measured at each width/theme:
**156 before/after geometry, data and ink comparisons**.

All chart-internal SVG geometry, paths, series colors/opacities, metrics, table
text and comparison values match. All region widths and header heights match.
At 1440/1280, all measured region geometry matches exactly. Twelve desktop
full-page captures (budget, dense chart and week comparison across both widths
and themes) are pixel-identical; four table captures differ by only 190 pixels,
all within the existing disabled previous-page button. Top/footer auxiliary
captures can also have small logo rasterization differences between browser
sessions; the source image, shell styling and bounds did not change.

| View / device | Scope height increase | Analysis-heading height increase | Chart-panel height increase | Footer Y increase |
| --- | --- | --- | --- | --- |
| All views, mouse desktop 1440/1280 | 0 | 0 | 0 | 0 |
| Budget, touch 768/390/375 | 4 | 4 | 0 | 8 |
| Budget, touch 320 | 8 (two existing filter rows) | 4 | 0 | 12 |
| Comparison, touch 768/390/375 | 4 | 4 | 8 | 16 |
| Comparison, touch 320 | 8 | 4 | 8 | 20 |
| Table, touch 768/390/375 | 4 | 4 | 12 (CSV, filter, pagination) | 20 |
| Table, touch 320 | 8 | 4 | 12 | 24 |

Share visual and toolbar geometry stay unchanged; only hit geometry expands.
Plot dimensions are unchanged, with no chart compression. There is no new label
wrap, page-level overflow or filter wrap. The normal view's filtered-range reset
adds 5px to its small context row only when present. Comparison cells retain
their existing responsive text wrapping. Deferred `Metric` copy is untouched.

## Validation and preservation

- Jest: **45 tests / 3 suites**, including three new fallback success/failure/
  exception cleanup and focus tests. The pre-existing React `act` deprecation
  warning remains; no package was upgraded.
- ESLint on application source and both new browser audits; `git diff --check`;
  production CRA build; canonical token guard: passed.
- Existing chart audit: **52 chart states / 78 viewport checks**, real current
  data (72 bets), native filters, Enter/Space sorting, tooltips, link copy, native
  sharing stub/failure, embed URL/theme/reload, CSV (four week-3 rows), retry and
  previous-season data (96 bets): passed against the final build.
- Existing shell: **10 viewport/theme checks**; existing theme audit: **25
  checks**, including migration/prepaint/storage/query override/OS changes: passed.
- Existing token browser audit: **130 final-layout snapshots**, canonical computed
  values, text contrast, focus/clipping, geometry/series equality: passed using a
  fresh final-layout baseline. Its original zero-geometry-change assertion is
  preserved. Priority 5's intentional sizing differences are separately compared
  against the original layout by `interactions.cjs`.
- New interaction matrix: **156 comparisons / 48 representative accessibility
  states / 272 target-box checks**, testing every target corner against the real
  DOM, plus 1,636 focus/contrast checks. Minimum tested enabled-control text
  contrast **5.45:1**, minimum focus contrast **5.35:1**.
- New functional flows: **12 width/theme touch workflows**, two full keyboard
  workflows, successful and failed clipboard fallback focus, transparent-area
  share/link/embed/reset taps, pending native sharing, first/last disabled
  pagination, keyboard CSV with all 72 rows/BOM/current filename, empty-state
  recovery, 320px live retry recovery, coarse-desktop/fine-tablet checks.
  Desktop pointer hover preserves share geometry. Six additional Kelly-table
  focus checks at 1440/390/320 in both themes preserve the wrapper's outward
  2px/5px focus without clipping or overflow.

No existing tests were weakened. Browser harness setup waits for initial fonts,
the existing 100ms chart-scroll timer and completed retry data, and removes its
own request-interception listener when finished. These are test synchronization
details, not changes to application retry, chart or font behavior.

The only application JavaScript change is fallback cleanup/focus restoration.
`googleSheetService.js`, chart renderers/inks, filter/sort/calculation handlers,
share URL/iframe/native payload builders, CSV formatter/filename and theme code
have no changes. Token and typography values are unchanged. No dependency,
request, observer or chart rendering work was added. Production gzip increase:
**157 bytes CSS, 41 bytes total JS** relative to the fresh baseline build.

Changed files: `src/App.css`, `src/components/BetCast.jsx`,
`src/components/BetCast.test.jsx`, `scripts/visual-audit/interactions.cjs`,
`scripts/visual-audit/interaction-flows.cjs`, this report and the browser-audit
instructions in `docs/visual-design.md`.

## Reproduction and completion

Use the existing external Puppeteer/Chrome prerequisites and serve the production
build on port 3017. Capture the original layout before changing it:

```sh
PUPPETEER_MODULE=/absolute/path/to/puppeteer-core node scripts/visual-audit/interactions.cjs before
# Apply interaction changes and rebuild.
PUPPETEER_MODULE=/absolute/path/to/puppeteer-core node scripts/visual-audit/interactions.cjs after
PUPPETEER_MODULE=/absolute/path/to/puppeteer-core node scripts/visual-audit/interaction-flows.cjs
```

Ignored evidence is in `artifacts/visual-rework/interactions/`: original/final
JSON, before/after screenshots, per-control visual/hit geometry comparison,
functional flows and desktop pixel comparison. It is not source or deployment
output to commit. The fixture is captured live and frozen only inside the audits.

**Priority 5D is complete.** Remaining sub-44px controls are intentional mouse
desktop controls: 40px native selects/actions, 36px comparison selects/text
actions, 19px inline range reset, compact pagination/× reset and 41px sortable
headers. Header navigation uses narrower text widths with 75px height and wide
gaps. On compact/touch layouts the changed primary controls provide ≥44px targets;
desktop sortable headers remain broad full-cell targets in the desktop-only table.

For the final Priority 5 cross-product audit, include real iOS/Android native
pickers and share dialogs, hybrid pointer devices, narrow embeds, keyboard shell
transitions, disabled-state contrast and the preserved scrollport focus
exceptions. Chromium emulation verifies DOM geometry and event routing; it does
not replace physical-device, Safari or OS share-sheet testing. No deployment,
commit or PR was performed.
