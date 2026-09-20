# BetCast UI polish tasks

Use this document as the implementation checklist for bringing BetCast in line with the visual language of [F1 Stories](https://f1stories.gr/).

## P0 — Fix correctness and broken interactions

- [x] Fix chart tooltip formatters. Monetary values must display in euros; win rates must display as percentages. Verify `profitByOdds` and `betSize` tooltips, including their labels and decimal formatting.
- [x] Restore the missing Budget series in the weekly profit chart. Use a chart type that supports both bars and lines, or use a clearly labelled reference line where appropriate.
- [x] Fix the Share button. The current implementation expects `window.html2canvas`, but that dependency is not loaded. Add a supported capture path or remove the action until it works. Show success and failure feedback inline instead of relying on an alert.
- [x] Check every chart for correct units, legends, axis labels, empty states, and tooltips with the actual data.

## P1 — Establish the F1 Stories visual system

- [x] Replace the cyan-to-magenta visual treatment with the F1 Stories palette: dark background around `#181a1c`, raised surface around `#222426`, warm text around `#eee7dc`, muted text around `#bcb8b0`, and orange-red accent around `#ff826b`.
- [x] Use neutral cards and surfaces. Reserve green and red for positive/negative betting outcomes; do not use a different saturated gradient for every KPI.
- [x] Add the F1 Stories typography: IBM Plex Sans for interface text and Barlow Condensed for the brand mark. Ensure the chosen web fonts include Greek glyphs and load with a robust fallback.
- [x] Match the editorial treatment: thin rules, restrained borders, minimal shadows, small uppercase section labels with letter spacing, and mostly square or lightly rounded controls.
- [x] Use a single consistent icon style. Replace emoji used as navigation and controls with SVG icons; keep emojis only where they communicate a genuine status such as a win/loss streak.
- [x] Restyle the header as an F1 Stories sub-brand header: logo and BetCast title on the left, compact navigation/context on the right, and one clear theme control. Move the long “Powered by…” text to the footer or a quieter metadata position.

## P1 — Simplify the page hierarchy

- [x] Make the shared filter scope explicit. Put season and week range controls before both the statistics and chart sections, and show the active period in the page state.
- [x] Keep the first screen focused: title, filters, a compact KPI summary, and the selected chart. Move streaks, variance, and secondary details into a lower or collapsible section.
- [x] Consolidate duplicate Link, Embed, and Share controls into one compact action group. Keep the chart-specific action group only when it adds a distinct action.
- [x] Give Budget and ROI the strongest visual emphasis. Reduce the visual weight of less important metrics and avoid leaving an orphaned fifth KPI card on narrow screens.
- [x] Rename or explain mixed-language and abbreviated labels such as `Exp. Value`, `σ`, `P/L`, `4L`, and `Win%`. Keep terminology consistent across cards, charts, tables, and exports.

## P1 — Make navigation and charts work on mobile

- [x] Replace the 13-item horizontal tab strip with grouped chart categories or a labelled select/menu on small screens. The selected view must remain visible after changing tabs.
- [x] Keep chart selection close to the chart and avoid scrolling users through a very tall summary before they can see data.
- [x] Preserve horizontal scrolling for tables without allowing chart swipe gestures to interfere with it.
- [x] Check chart legends, axis labels, tooltip positioning, and pie-chart labels at 390 px, 768 px, and desktop widths.
- [x] Make filters and action buttons wrap predictably without changing their order or meaning.

## P2 — Accessibility and interaction polish

- [x] Set the document language to Greek (`lang="el"`) and ensure all visible controls have clear accessible names.
- [x] Associate every select with a label. Add `aria-sort` to sortable table headers and keyboard support for sorting.
- [x] Complete the tab pattern: connect each tab to its panel with `aria-controls` and `aria-labelledby`, and expose the active panel correctly.
- [x] Add visible `:focus-visible` states that use the F1 Stories accent and verify contrast in both themes.
- [x] Respect `prefers-reduced-motion` by disabling chart/card transitions and animated number effects when requested.
- [x] Ensure loading, error, no-data, and retry states use the same editorial surface and typography as the rest of the page.

## P2 — Data and sharing quality

- [x] Preserve season, chart, week filters, and comparison settings in copied links and embeds.
- [x] Make the embed view inherit or explicitly receive the host theme so it does not visually clash with an F1 Stories page.
- [x] Verify CSV exports use the same labels, decimal conventions, and units shown in the UI.
- [x] Add a visible “last updated” state that does not compete with the page title and remains understandable in Greek.

## Verification checklist

- [ ] Review dark and light themes at 390 px, 768 px, and 1440 px.
- [ ] Test keyboard-only navigation through the header, filters, tabs, chart actions, and table.
- [ ] Test every chart with normal data, no data, filtered data, and a single-week range.
- [ ] Test copied links, embed links, CSV export, screenshot sharing, and retry after a failed data request.
- [ ] Run the production build and existing tests before delivery.
