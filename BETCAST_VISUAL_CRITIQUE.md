# BetCast Visual Critique

## BC-01

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px
- **VERIFIED:** The redundant 01 / BETCAST eyebrow and generic scope helper were removed on mobile. The analysis label and selector share one row, and mobile spacing was tightened.
- **ACCEPTANCE:** The default chart wrapper begins at y=600px at 390×844; the selector is inline with the analysis heading; no redundant eyebrow or helper copy is rendered.

## BC-02

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px, 1440px, 768px
- **VERIFIED:** Added the F1Stories destination navigation, marked BetCast as the current destination, and added a responsive menu control for mobile and tablet widths.
- **ACCEPTANCE:** Seven primary destinations are present at all widths; mobile and tablet show a visible menu control; desktop shows the destination navigation; BetCast is marked as the current destination.

## BC-03

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px and 768px
- **VERIFIED:** Responsive result and Kelly tables now prioritize the readable subject/value columns, keep row identity in the same viewport, and expose the full desktop table only at wider widths. A scrolling hint is provided above each table.
- **ACCEPTANCE:** A bet and its profit are visible together without horizontal scrolling; Kelly range, suggested stake, and Kelly percentage are initially visible; row identity remains visible with secondary values.

## BC-04

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px and 768px
- **VERIFIED:** Replaced detached week summary blocks with one aligned comparison table. Week selectors sit in their column headers, and wins/losses use explicit Greek labels.
- **ACCEPTANCE:** Each metric’s week A value, week B value, and difference share one row at both viewports; the comparison fits without scrolling between week summaries.

## BC-05

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px
- **VERIFIED:** Five-category charts now render every range label as a compact two-line tick. The denser odds distribution uses a horizontally scrollable plot with every category labeled and a visible scrolling cue.
- **ACCEPTANCE:** Every categorical bar/group has a readable, non-overlapping label at 390px; no category depends on hover for identification.

## BC-06

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px
- **VERIFIED:** Cumulative ROI now uses one visible area series, a reference baseline, no automatic legend, and a dedicated tooltip containing one ROI value.
- **ACCEPTANCE:** A hovered week shows one labeled ROI value; raw `roi`, empty legend entries, and baseline values are absent from the legend and tooltip.

## BC-07

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px
- **VERIFIED:** Single-measure legends were removed from profit-by-odds, weekly ROI, and stake analysis. Weekly profit now uses explicit green/red bar swatches and a line swatch for Budget.
- **ACCEPTANCE:** The weekly-profit legend keys visibly correspond to plotted bars and line; the three removed legends render no legend wrapper and release their reserved chart space.

## BC-08

- **STATUS:** COMPLETE
- **VIEWPORT:** 1440px, 768px, 390px
- **VERIFIED:** The win/loss doughnut now shares a compact grouped layout with outcome statistics at desktop and tablet widths, stacks tightly on mobile, and labels both averages as odds.
- **ACCEPTANCE:** The chart and explanatory values render as one group; the desktop/tablet layout is capped at 620px instead of surrounding the doughnut with a full-width empty stage.

## BC-09

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px and 768px
- **VERIFIED:** Expected-value series are labeled in Greek, and the range differences are presented as aligned rows under an explicit percentage-point explanation.
- **ACCEPTANCE:** Every annotation has a stated meaning and unit; mobile and tablet rows keep range labels and values aligned without loose wrapping.

## BC-10

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px
- **VERIFIED:** Win-rate bars now use one neutral series color, and Kelly win percentages use ordinary text without red/green threshold styling.
- **ACCEPTANCE:** A 33% win rate does not receive loss styling; profit/loss colors remain reserved for monetary and explicit outcome semantics.

## BC-11

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px (`?from=99&to=99`)
- **VERIFIED:** Empty periods show dashes for summary monetary/rate metrics, an adjacent no-data message, explicit unavailable week options, and the existing clear action.
- **ACCEPTANCE:** Empty selections cannot be mistaken for a zero balance, and controls agree with the displayed period summary.

## BC-12

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px, 768px, 1440px
- **VERIFIED:** Footer attribution is consolidated into one principal block with a separate utility row linking to privacy, terms, and F1 Stories.
- **ACCEPTANCE:** Footer has one principal brand statement, recognizable utility navigation, and consistent grouping at all three widths.

## BC-13

- **STATUS:** COMPLETE
- **VIEWPORT:** 768px and mobile table view
- **VERIFIED:** The `stoximan` variant now resolves to the existing Stoiximan asset, and bookmaker containers share a fixed optical size and controlled light backing.
- **ACCEPTANCE:** Observed Stoiximan variants render consistently, and bookmaker treatment stays bounded within the table cells.

## BC-14

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px loading state
- **VERIFIED:** Loading now preserves the loaded page’s title, filter, metric, analysis heading, and chart regions with text and geometry-matched placeholders.
- **ACCEPTANCE:** Loading placeholders correspond to actual content regions and completion does not require relocating the page title or changing the overall page structure.

## BC-15

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px, 768px, 1440px
- **VERIFIED:** The light-theme control now includes a centered sun disc alongside its rays.
- **ACCEPTANCE:** The icon reads as a sun at normal size across all three viewports.

## BC-16

- **STATUS:** COMPLETE
- **VIEWPORT:** 390px and 768px
- **VERIFIED:** Added shared currency and percentage formatters for the affected stake summary and comparison values, with consistent precision and signs.
- **ACCEPTANCE:** Equivalent affected metrics use consistent precision and unit placement across summaries and comparison output.
