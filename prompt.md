Report content follows. No project files were modified; the Markdown file was not written because you explicitly prohibited file changes.

Reviewed the running implementation at `http://127.0.0.1:3017/` against [F1Stories](https://f1stories.gr/), in this order: **390×844, 1440×1000, 768×1024**. Inspected both themes, all 13 analysis views, table scrolling, a chart tooltip, expanded statistics, empty results, and loading with a simulated response delay.

Side-by-side screenshots: [mobile](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-mcjWjO/edbffb15-166e-49d2-95d0-0094cc06f413.png), [desktop](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-jXYrnR/f90315ec-ab73-46af-b3ce-31c7754b9973.png), [tablet](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-26lsWs/de1392e2-90da-4e95-aa3d-91a817023b48.png).

**Verdict:** BetCast borrows the identity convincingly at the token level. The fonts, restrained surfaces, square controls, and 22/32/48px gutters belong. Its composition and chart presentation still suggest a separately built dashboard. The strongest remaining tells are repetitive setup bands, automatic chart legends, unexplained annotations, and desktop tables carried onto mobile.

No genuine pill overload, rounded-card overload, gratuitous gradients, or widespread alignment breakage was visible.

## P0 — Visually broken

No findings warrant P0. The defects below are specific and reproducible, but the inspected application remains navigable.

## P1 — Strongly hurts the F1Stories identity

### BC-01 — Mobile spends almost its entire opening screen on setup

- **ID:** BC-01
- **PRIORITY:** P1
- **VIEWPORT:** 390px; secondary effect at 768px.
- **OBSERVED:** The plot starts around document y=730. Before it: three BetCast identifiers, introductory copy, three filters, two helper statements, five KPIs, an analysis label, a “Προβολή” label, a selector, and another chart title.
- **WHY IT LOOKS WRONG:** The screen reads as successive dashboard configuration bands. The main visual content barely enters the first viewport.
- **REFERENCE TO F1STORIES:** The reference establishes its principal story and image immediately; section labels support that hierarchy.
- **ROOT CAUSE / COMPONENT:** Page introduction, scope bar, metrics, and analysis heading each reserve independent vertical space.
- **EXACT RECOMMENDED CHANGE:** Remove the redundant `01 / BETCAST` eyebrow beneath the branded header. Remove the generic scope explanation. Put the analysis label and selector in one mobile row without a separate “Προβολή” line. Reduce intervening section gaps to 16px.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** At 390×844, the default plot begins by y=600, exposing at least 240px of chart area; controls retain their current legibility and height.

### BC-02 — The header identifies the publisher but removes its navigation

- **ID:** BC-02
- **PRIORITY:** P1
- **VIEWPORT:** 390px, 1440px, 768px.
- **OBSERVED:** Desktop offers only “Data Hub” and the theme button. Mobile removes “Data Hub” and has no menu.
- **WHY IT LOOKS WRONG:** This feels like an external utility wearing the publisher’s logo. The navigation habits established on F1Stories disappear.
- **REFERENCE TO F1STORIES:** F1Stories has desktop destination links and a clearly framed hamburger at mobile/tablet widths.
- **ROOT CAUSE / COMPONENT:** Standalone `AppContent` header and the hidden mobile `.header-context`.
- **EXACT RECOMMENDED CHANGE:** Reuse the reference’s destination navigation and responsive menu treatment, marking BetCast as the current destination. Retain the BetCast identifier without replacing navigation with it.
- **FILES LIKELY INVOLVED:** `src/App.js`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** The same primary destinations are accessible at all three widths; mobile has a visible menu control; the active destination is clear.

### BC-03 — Mobile tables hide the information people came to read

- **ID:** BC-03
- **PRIORITY:** P1
- **VIEWPORT:** 390px and 768px.
- **OBSERVED:** At 390px, the results table initially shows `#`, week, bet number, and part of the description. Outcomes and profit are off-screen. Scrolling right removes row identity. Kelly initially hides both Kelly percentage and recommended stake. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-06N8F0/4bc1672b-f3bb-479a-a5ff-667001f8e9e8.png).
- **WHY IT LOOKS WRONG:** This is directly recognizable as a desktop spreadsheet placed inside a narrow viewport.
- **REFERENCE TO F1STORIES:** The reference reorganizes mobile content around its primary subject rather than preserving desktop column order.
- **ROOT CAUSE / COMPONENT:** Shared wide `.data-table`, unchanged column priority, and unpinned identifying columns.
- **EXACT RECOMMENDED CHANGE:** Below 1100px, prioritize description and profit in the results table; move the three identifiers after those columns and allow description wrapping. Pin the identifying column during horizontal scrolling. For Kelly, place odds range, suggested stake, and Kelly percentage first. Place the scrolling instruction above each table.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** At 390px, a bet and its profit can be read together without horizontal scrolling. Kelly’s range and suggested stake are initially visible. Row identity remains visible when accessing secondary columns.

### BC-04 — Week comparison requires remembering one screen while reading another

- **ID:** BC-04
- **PRIORITY:** P1
- **VIEWPORT:** 390px; alignment issues also visible at 768px.
- **OBSERVED:** Mobile stacks week A, a detached delta block, then week B. Tablet puts delta values beside the week heading rather than beside their matching metrics. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-wsavyJ/ae4ec74a-e85f-4e3f-9a0c-63b9b7af5f94.png).
- **WHY IT LOOKS WRONG:** A comparison is presented as three independent text blocks. Equivalent values have no shared baseline.
- **REFERENCE TO F1STORIES:** The reference uses proximity and alignment to connect related information; these blocks disconnect it.
- **ROOT CAUSE / COMPONENT:** `R_compare` lays out whole week summaries instead of corresponding metrics.
- **EXACT RECOMMENDED CHANGE:** Use one compact comparison table: metric, week A, week B, difference. Put selectors in their corresponding column headers. Use explicit Greek wins/losses labels instead of `W / L`.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** Each metric’s two values and difference share a row at 390px and 768px. No scrolling between week summaries is necessary.

### BC-05 — Category charts display bars without their category names

- **ID:** BC-05
- **PRIORITY:** P1
- **VIEWPORT:** 390px.
- **OBSERVED:** Profit by odds displays five bars but only three range labels. Expected value repeats this omission. Odds distribution drops labels while rotating the remaining ones diagonally. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-wVybtV/76b31a8a-3785-435c-b172-cd62854fcfb6.png).
- **WHY IT LOOKS WRONG:** The chart preserves its geometry by sacrificing its meaning. Readers must infer categories or interrogate individual bars.
- **REFERENCE TO F1STORIES:** Labels on the reference identify visible content directly. Its editorial identity depends on readable information, not merely visual shape.
- **ROOT CAUSE / COMPONENT:** Automatic X-axis tick suppression and long range labels.
- **EXACT RECOMMENDED CHANGE:** For the five-category charts, show every tick using compact two-line ranges. For the denser distribution chart, provide a horizontally scrollable plot with every category labeled and a visible scrolling cue above it.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** Every categorical bar/group has a readable category label at 390px; no overlapping text or reliance on hover.

### BC-06 — Cumulative ROI exposes chart implementation details

- **ID:** BC-06
- **PRIORITY:** P1
- **VIEWPORT:** 390px confirmed; shared chart implementation.
- **OBSERVED:** The legend contains `ROI%`, raw `roi`, and an unlabeled dashed entry. Hovering week 6 displays `43.33%` twice and an additional `0%`. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-NfSb3b/90a0222b-9824-4a54-b7ac-a6492adf12c0.png).
- **WHY IT LOOKS WRONG:** Rendering layers masquerade as distinct measurements. This is the clearest remaining chart-library default.
- **REFERENCE TO F1STORIES:** Raw field names and unexplained duplicate values break the reference’s edited, reader-facing presentation.
- **ROOT CAUSE / COMPONENT:** `R_cumROI` exposes the area, duplicate line, and zero baseline to legend/tooltip generation.
- **EXACT RECOMMENDED CHANGE:** Render one explicit ROI tooltip entry. Exclude the overlay and baseline from tooltip payload presentation. Remove the redundant single-series legend.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`.
- **ACCEPTANCE CRITERIA:** Week 6 shows one labeled ROI value. No raw `roi`, empty legend key, or baseline value appears at any viewport.

## P2 — Noticeable polish issues

### BC-07 — Several legends are empty-looking labels with reserved whitespace

- **ID:** BC-07
- **PRIORITY:** P2
- **VIEWPORT:** 390px; shared chart configuration.
- **OBSERVED:** Weekly profit’s “Κέρδος/Ζημία” lacks a visible swatch, while “Budget” has a line. Profit by odds, weekly ROI, and stake analysis retain isolated, centered metric labels beneath their plots. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-yBvIts/702b11ed-b822-4746-9c51-4f6e6f144399.png).
- **WHY IT LOOKS WRONG:** These look like incomplete legends and duplicate information already supplied by titles, axes, or captions.
- **REFERENCE TO F1STORIES:** Supporting labels are attached to content and serve a clear purpose.
- **ROOT CAUSE / COMPONENT:** Uniform automatic legends, including cell-colored bars without a useful series-level marker.
- **EXACT RECOMMENDED CHANGE:** Remove legends from single-measure bar charts. Give weekly profit an explicit legend distinguishing profit/loss bars from the budget line. Use rectangular swatches for bar series.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** Every remaining legend key visibly matches a plotted mark. Removed legends release their reserved vertical space.

### BC-08 — The doughnut floats in a presentation-sized void

- **ID:** BC-08
- **PRIORITY:** P2
- **VIEWPORT:** Primarily 1440px; also 768px.
- **OBSERVED:** A roughly 200px doughnut sits centrally inside a 1344px-wide panel, with small annotations far above and a legend far below. “Μ.Ο. Νικών: 3.06” does not identify the average as odds. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-xTpmgC/70eb12fb-df37-4a85-90a8-ae8d8847ea8d.png).
- **WHY IT LOOKS WRONG:** The chart, annotations, and legend appear unrelated. Most of the section is unused canvas.
- **REFERENCE TO F1STORIES:** Its asymmetric desktop composition places supporting information next to a focal element.
- **ROOT CAUSE / COMPONENT:** Fixed pie radii inside the universal full-width chart wrapper.
- **EXACT RECOMMENDED CHANGE:** Give this view a compact layout: doughnut beside outcome counts and average odds at tablet/desktop widths; stack those elements tightly on mobile. Rename the averages to explicitly include “απόδοση”.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** The chart and its explanatory values read as one group. No 1344px-wide empty stage surrounds a 200px mark.

### BC-09 — Expected-value annotations look like unedited diagnostic output

- **ID:** BC-09
- **PRIORITY:** P2
- **VIEWPORT:** 390px and 768px.
- **OBSERVED:** English `Implied %` / `Actual %` keys accompany Greek content. Beneath them, five colored range/value fragments wrap into uneven rows without a label explaining the values. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-bIRtXD/d38e138c-d04e-48be-95de-54bd330d9765.png).
- **WHY IT LOOKS WRONG:** Readers must decode both language and meaning. The fragments resemble debug statistics.
- **REFERENCE TO F1STORIES:** Its Greek explanatory copy gives technical content a consistent editorial voice.
- **ROOT CAUSE / COMPONENT:** `R_ev` uses English series names and an unlabeled wrapping `.streaks-row`.
- **EXACT RECOMMENDED CHANGE:** Rename the series in Greek. Present the differences as aligned range/value rows labeled “Διαφορά πραγματικής − υπονοούμενης πιθανότητας”, with percentage-point units.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** Every annotation has an explicit meaning and unit. Mobile values align predictably rather than wrapping as loose fragments.

### BC-10 — Red and green silently change meaning between views

- **ID:** BC-10
- **PRIORITY:** P2
- **VIEWPORT:** 390px; shared chart/table behavior.
- **OBSERVED:** Profit charts use red/green for negative/positive money. Win-rate bars and Kelly win percentages use those same colors below/above 50%, without explaining that threshold.
- **WHY IT LOOKS WRONG:** A low win percentage visually reads as a financial loss even when the underlying bets can be profitable.
- **REFERENCE TO F1STORIES:** Accent and supporting colors have recognizable roles; technical views need equally stable semantics.
- **ROOT CAUSE / COMPONENT:** `R_winRate` and Kelly percentage cells apply success/error styling to an unexplained 50% test.
- **EXACT RECOMMENDED CHANGE:** Use a single neutral series color for win-rate bars and ordinary text for Kelly win percentages. Reserve profit/loss colors for monetary signs and explicit win/loss outcomes.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`.
- **ACCEPTANCE CRITERIA:** A 33% win rate does not automatically receive loss styling. Red/green has a consistent, stated interpretation.

### BC-11 — Empty results initially look like a real zero balance

- **ID:** BC-11
- **PRIORITY:** P2
- **VIEWPORT:** 390px; reproducible with `?from=99&to=99`.
- **OBSERVED:** Budget becomes `0.00€` and ROI becomes green `0.0%`; the no-results explanation appears much farther down. The selects show “Όλες” while the summary says weeks 99–99. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-vhSSdY/3a86e77d-2eac-4cab-ac7b-7656e20b92e7.png).
- **WHY IT LOOKS WRONG:** Missing data is presented as an actual result, and visible controls contradict the active period.
- **REFERENCE TO F1STORIES:** Context belongs adjacent to the information it explains.
- **ROOT CAUSE / COMPONENT:** Empty selections still render normal KPI values; unavailable URL filter values lack a matching visible option.
- **EXACT RECOMMENDED CHANGE:** Show neutral dashes for unavailable monetary/rate metrics and place the empty-period message next to the filters. Represent unavailable selected weeks explicitly, with the existing clear action adjacent.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** An empty selection cannot be mistaken for a zero balance. Controls and period summary agree.

### BC-12 — The footer repeats branding instead of completing the site shell

- **ID:** BC-12
- **PRIORITY:** P2
- **VIEWPORT:** 390px, 1440px, 768px.
- **OBSERVED:** BetCast stacks a large brand line, copyright, “Powered by…” credit, another F1 Stories link, and social icons. Privacy and terms links present on the reference are absent.
- **WHY IT LOOKS WRONG:** Repeated attribution makes it resemble a standalone project footer.
- **REFERENCE TO F1STORIES:** The reference separates copyright/social information from a quieter utility-link row.
- **ROOT CAUSE / COMPONENT:** Independent footer markup in `AppContent`.
- **EXACT RECOMMENDED CHANGE:** Consolidate branding and attribution into one compact block. Follow the reference’s copyright/social and utility-row arrangement, linking to its existing privacy and terms pages.
- **FILES LIKELY INVOLVED:** `src/App.js`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** The footer has one principal brand statement, recognizable utility navigation, and consistent grouping at all three widths.

### BC-13 — Bookmaker rendering alternates between polished assets and raw text

- **ID:** BC-13
- **PRIORITY:** P2
- **VIEWPORT:** 1440px and 768px; horizontally scrolled mobile table.
- **OBSERVED:** Some cells show bright white logo tiles, while multiple others show lowercase `stoximan`. A later row displays a proper Stoiximan logo. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-QEXCWA/ca523590-3df4-4313-b8e6-7426c0af8816.png).
- **WHY IT LOOKS WRONG:** The same column oscillates between branding and fallback data. White tiles also outweigh surrounding result text in dark mode.
- **REFERENCE TO F1STORIES:** Its partner assets are presented as a coordinated set.
- **ROOT CAUSE / COMPONENT:** `BookmakerLogo`, alias normalization, and independently sized asset wrappers.
- **EXACT RECOMMENDED CHANGE:** Normalize `stoximan` to the existing Stoiximan asset. Standardize logo containers and optical height; use a controlled contrasting backing only where needed for asset legibility.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** All observed Stoiximan variants render consistently. No bookmaker treatment dominates the table’s financial results.

### BC-14 — Loading placeholders describe a different layout

- **ID:** BC-14
- **PRIORITY:** P2
- **VIEWPORT:** 390px, under a simulated response delay.
- **OBSERVED:** Loading shows two large filled rectangles and a footer starting around y=734. The loaded layout instead has filters, text KPIs, selector bands, and a considerably later footer. The title also shifts vertically. [Evidence](/var/folders/93/72vmg86164ggkvnttj9f7kp40000gp/T/chrome-devtools-mcp-et1Zo8/0d0df8a4-c7df-4b19-9799-0601f2fcdb6e.png).
- **WHY IT LOOKS WRONG:** The rectangles suggest dashboard cards that never arrive, then the page visibly changes structure.
- **REFERENCE TO F1STORIES:** The established visual language uses open typography and deliberate rules rather than large anonymous panels.
- **ROOT CAUSE / COMPONENT:** Separate loading markup with generic `.skeleton-stat` and `.skeleton-chart` blocks.
- **EXACT RECOMMENDED CHANGE:** Preserve the loaded page’s header, title position, filter area, metric arrangement, and chart allocation during loading. Use short text/value placeholders within those regions.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** Loading completion does not relocate the title or substantially reposition the footer. Placeholders correspond to actual content geometry.

## P3 — Micro-polish

### BC-15 — The light-theme icon resembles a loading indicator

- **ID:** BC-15
- **PRIORITY:** P3
- **VIEWPORT:** 390px, 1440px, 768px.
- **OBSERVED:** The light-theme header icon consists of tiny disconnected rays without a central sun disc.
- **WHY IT LOOKS WRONG:** At normal size it looks unfinished or busy, rather than like a deliberate theme control.
- **REFERENCE TO F1STORIES:** Its theme glyph has a recognizable silhouette and comparable visual weight to adjacent controls.
- **ROOT CAUSE / COMPONENT:** `ThemeIcon` supplies the rays but no central circle.
- **EXACT RECOMMENDED CHANGE:** Add the missing sun circle and match the reference control’s optical size and centering.
- **FILES LIKELY INVOLVED:** `src/App.js`, `src/App.css`.
- **ACCEPTANCE CRITERIA:** At 100% zoom, the icon reads immediately as a sun in all three viewports.

### BC-16 — Number formatting changes between neighboring analytical views

- **ID:** BC-16
- **PRIORITY:** P3
- **VIEWPORT:** 390px and 768px; shared formatting.
- **OBSERVED:** Currency appears as `374.00€`, `93.5€`, `0€`, `92.98€`, and `+44€`. Comparison percentages mix whole numbers and two decimal places.
- **WHY IT LOOKS WRONG:** Precision changes look accidental and make tables and comparison blocks less orderly.
- **REFERENCE TO F1STORIES:** Consistent typography and metadata treatment provide an editorial finish; BetCast’s numbers need the same discipline.
- **ROOT CAUSE / COMPONENT:** View-specific formatting in KPI, Kelly, comparison, and tooltip rendering.
- **EXACT RECOMMENDED CHANGE:** Use shared display formatters: two decimals for detailed currency values, one for percentages, consistent signs and unit spacing. Keep compact axis ticks as an explicit exception.
- **FILES LIKELY INVOLVED:** `src/components/BetCast.jsx`.
- **ACCEPTANCE CRITERIA:** Equivalent metrics use identical precision and unit placement across summaries, tables, comparisons, and tooltips.