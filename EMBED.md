# BetCast in articles: implementation brief for Sonnet

Status: proposed implementation plan, based on the local source on 5 October 2026. No application or article changes have been implemented by this document.

## 1. Decision and intended experience

**Make native HTML betting tables the default for F1 Stories articles.** The reader should encounter the article's selections or results directly in the page, in the publication's typography and theme, followed by a link to the matching BetCast analysis. There should be no embedded dashboard around a four-row table.

For interactive charts, offer a separate, deliberately compact **article presentation** of BetCast with automatic iframe height and host theme integration. Keep today's dashboard embed compatible. A fully native interactive chart widget is a later option; it is not required to remove the iframes from the betting-table articles found during this audit.

The distinction matters: improving an iframe's appearance does not remove the iframe. The native table work does remove it; the chart work improves the remaining interactive embeds.

### Deliverables and priority

| Priority | Deliverable | Where it belongs |
| --- | --- | --- |
| P0, required | Native article table, pinned data, matching analysis link | BetCast export contract + F1 Stories article builder |
| P0, required | Migrate representative table articles, then the remaining audited table embeds | F1 Stories source articles |
| P1, recommended | Compact chart/table presentation, reliable height, synchronized article theme | BetCast + F1 Stories host integration |
| P2, optional | Native interactive charts, using shared renderers | Separate follow-up after P0/P1 |

**Implementation boundary:** this repository alone cannot change the HTML surrounding embeds in published articles. P0 is complete only when both sides work together. Produce separate reviewable changes for BetCast and the article site. This brief authorizes no publishing, deployment change, or retirement of the existing site.

## 2. Evidence: what is wrong today

### BetCast code

- `src/App.js` treats `?embed=1` or iframe containment as embedded mode. It hides the masthead, sponsors, and footer, but still mounts the main dashboard component.
- `src/components/BetCast.jsx` defines `EMBED_MIN_HEIGHT = 960`. `buildEmbedSnippet()` copies an iframe with that inline minimum height.
- The embedded dashboard retains the large BetCast heading, season selector, Budget/ROI summary, secondary metrics, 13-view selector, and statistics disclosure. Only the from/to controls and share group are hidden. That is too much interface for a focused article insert.
- `src/App.css` mostly changes embed padding to `20px`; it does not define an article-specific composition.
- The child posts `{ type: 'betcast:resize', height }` with `postMessage(..., '*')`. A host must receive that message and apply a height. Merely emitting it cannot resize the iframe.
- The measured `mainContentRef` is absent in the component's loading return; `App.js` also has a separate lazy-loading skeleton. Loading, errors, and loaded content need a consistent measurement boundary.
- `week` is `highlightedWeek`. The table intersects it with the from/to-filtered rows; the summary metrics use `filteredData` before that intersection. A week-specific table can therefore sit below season-wide headline numbers. Preserve dashboard semantics, but do not reproduce that ambiguity in the native article block.
- URL writers reconstruct the query string. Any new presentation/theme parameter must be added explicitly to parsing, serialization, and relevant link builders, or it will disappear after mount.
- `DATA_SOURCES` currently exposes `current` and `lastYear`, not immutable year IDs. `current` permits generated sample data when fetching fails. Published snapshots must never mistake this fallback for actual betting records.

### Article-site code, inspected read-only

The neighboring local checkout is `../f1StoriesPage`. Paths below are relative to that checkout and must be rechecked against its current branch before implementing.

- `blog-module/blog-entries/20261002J/source.txt` requests `viz=dataTable&week=16&embed=1&theme=dark` with `min-height:960px`.
- The generated `article.html` wraps it in `.embed-container.embed-iframe` and preserves those attributes. The adjacent standings iframe is a different product and is outside this brief.
- `blog-module/blog/article-script.js` has Tyres-specific theme handling but no BetCast resize listener in the inspected source.
- `blog-module/build/embeds.js` recognizes raw iframe blocks and delegates rendering to `embed-render.js`; it is the right place to add a typed BetCast block.
- `blog-module/build/embed-render.js` sanitizes iframe attributes and restricts raw widget HTML. Do not bypass or loosen those restrictions to insert a chart bundle.
- Article styling is in `blog-module/blog/article-editorial.css` and `article-styles.css`. The host theme is exposed through `document.documentElement`'s `data-theme`; BetCast uses body classes and its own theme provider.

The source scan found these 13 BetCast iframe articles, all requesting `dataTable`:

| Article directory | Existing scope |
| --- | --- |
| `20260502J` | `from=4&to=4` |
| `20260523J` | Unbounded |
| `20260606J` | `week=6` |
| `20260613J` | `week=7` |
| `20260627J` | `week=8` |
| `20260704J` | `week=9` |
| `20260719J` | `from=10&to=10` |
| `20260725J` | `from=11` |
| `20260822J` | `from=12` |
| `20260905J` | `from=13&to=13` |
| `20260912J` | `week=14` |
| `20260924J` | `from=15&to=15`, explicit light theme |
| `20261002J` | `week=16`, explicit dark theme |

These are local-source findings, not a visual inspection of production. Re-run the inventory before migration; do not assume every production article matches this checkout.

## 3. Solutions considered

| Approach | What improves | Cost or limitation | Decision |
| --- | --- | --- | --- |
| Reduce iframe height/add borders | Slightly tidier box | Can clip content; dashboard chrome and scroll problems remain | Insufficient |
| Focused iframe with host adapter | Reuses all current charts; little calculation risk | Still a separate document; needs parent integration | P1 for interactive views |
| Native static HTML table | Natural article flow, native theme, selectable text, works without JS, no BetCast runtime on the article | Data refresh becomes an explicit editorial operation | P0 default for actual table use |
| Native client-side React widget | No iframe, natural height, interactive charts | Requires separate bundle delivery, CSS/state isolation, multiple-instance handling | P2 only if interaction is needed |
| Screenshot/SVG figure linked to BetCast | Simple, stable chart illustration | No interaction; table text becomes less useful; requires export tooling | Optional editorial chart illustration |
| Replace everything with a link | Lowest implementation effort | Removes the useful data from the article | Fallback, not the default |

Moving BetCast to the article site's origin alone does not remove dashboard chrome, iframe scrolling, minimum heights, or global state concerns. Build a focused article experience regardless of where the application is hosted.

## 4. Native article block: product specification

The block should read like part of the article:

```text
BETCAST · F1 STORIES
Οι επιλογές μας — Εβδομάδα 16
Σεζόν [verified label] · Εβδομάδα 16

Στοίχημα        Εταιρία     Απόδοση   Ποντάρισμα   Αποτέλεσμα   Κέρδος/ζημία
[actual rows from the pinned dataset]

Δεδομένα καταγεγραμμένα στις [snapshot timestamp]
Πλήρης ανάλυση στο BetCast ↗
```

This is a structural example, not permission to invent values or a season label.

- Use IBM Plex Sans, restrained Barlow Condensed branding, existing warm light/dark surfaces, coral accent, thin rules, and tabular numbers. Reuse host tokens; do not import `App.css` into the article.
- No dashboard hero, season selector, unrelated summary metrics, view selector, share toolbar, statistics disclosure, sponsors, or embedded navigation.
- Use a semantic `<section>` with an accessible heading and a `<table>` with a caption and scoped column headers. Keep bookmaker names readable even if logos fail. Values must include their units, and outcomes must have text, not color alone.
- At narrow widths, prioritize the bet description, odds, stake, and outcome/profit. Keep secondary fields available through a native details disclosure or a visibly signposted horizontal table region. Do not silently discard fields or use vertical scrolling inside the block.
- The initial P0 block is static: show all selected rows in document flow, with no runtime pagination or sort controls. For unusually long selections, use a native disclosure after the first 15 rows; all rows must remain in the HTML and available without JS. Sorting, filtering, and CSV remain available in the linked dashboard.
- The actual selected bet description must survive. The service may keep textual `Στοίχημα #` in `betLabel` while assigning numeric `betNumber`; do not accidentally replace a description with a sequence number. Add `betLabel` to the snapshot rows.
- Label a snapshot as a snapshot. Do not call its capture timestamp “live” or pretend it tracks subsequent result updates. Never manufacture a pending-outcome state from the current Win/Lose model; if the source model needs pending bets, that is a separate data change.
- No-JS and print views must retain the table, scope, source timestamp, and analysis link. Article text before and after the block must remain in normal document flow.

### Filter and link rules

1. Normalize the complete source dataset using the existing parsing and numbering rules **before** selecting rows; IDs, weekly bet numbers, and cumulative Budget must not be recomputed on the subset.
2. Apply inclusive `from` and `to`, then intersect with `week` when supplied. For example, `from=2&to=4&week=3` selects only week 3. `week` does not redefine the meaning of dashboard-wide metrics.
3. Preserve open-ended filters. Do not silently turn `from=11` into `from=11&to=11`; flag it for editorial review during migration because its historical intention may differ from its current live result.
4. The native block only accepts `viz=dataTable` in P0. Reject an unsupported visualization with a clear build error; never substitute unrelated content.
5. Its “Πλήρης ανάλυση” URL preserves the original season/viz/from/to/week/cmpA/cmpB state and removes iframe-only parameters. Preserve existing numeric formatting and CSV behavior in BetCast itself.
6. The pinned snapshot is authoritative for article rows. A deep link using `season=current` may show a different dataset after a future season rollover. State this limitation and show the snapshot season/capture date; do not claim the link is immutable. Stable historical season links can be added later as an intentional data-source extension.

## 5. Data and authoring contract

Use a versioned JSON snapshot exported by BetCast and consumed locally by the article build. **Normal blog builds must be offline and deterministic.** Do not fetch Google Sheets on every article build or on every article view.

Proposed locations, to be implemented:

- BetCast: `scripts/export-article-table.mjs`, shared pure parsing/selection helpers under `src/services/`, and fixture tests.
- Article site: `blog-module/betcast-snapshots/<snapshot-id>.json`, `blog-module/build/betcast.js`, and typed block tests. Snapshot JSON is a deliberate editorial input; generated HTML remains output of the existing pipeline.
- Authoring line: `BETCAST:<snapshot-id>`, for example `BETCAST:20261002J-week16`. The snapshot owns the filters and capture metadata; do not create a second set of filters on the shortcode.

Proposed v1 snapshot shape (illustrative metadata; rows omitted here, never omitted in a real export):

```json
{
  "schemaVersion": 1,
  "id": "20261002J-week16",
  "capturedAt": "<ISO-8601 capture time>",
  "source": {
    "alias": "current",
    "label": "<verified season label>",
    "sheetId": "<resolved source sheet>",
    "gid": "<resolved source tab or null>",
    "kind": "verified-sheet",
    "contentHash": "<SHA-256 of source CSV bytes>"
  },
  "selection": {
    "viz": "dataTable",
    "season": "current",
    "from": null,
    "to": null,
    "week": 16,
    "cmpA": null,
    "cmpB": null
  },
  "rows": []
}
```

Rows contain the normalized fields needed to reproduce the table: `id`, `week`, `betNumber`, `betLabel`, `betType`, `company`, `odds`, `stake`, `result`, `profitLoss`, and `cumulativeBudget`. Store numbers as numbers; format only during rendering. Define whether optional text fields are empty strings or null and apply that consistently.

Export requirements:

- Accept an existing BetCast URL plus a safe snapshot ID and a verified season label; parse URL parameters with `URLSearchParams`. Enforce approved BetCast origin/path combinations, integer week filters, a known season alias, and a safe filename ID. Record the resolved sheet/tab, not just the moving alias.
- Support an explicitly supplied CSV file for repeatable export/testing. Otherwise fetch the configured public sheet export directly with a bounded timeout; fail on fetch/parse errors. Do not call the browser service's sample-fallback path or add a new proxy service.
- Resolve the source mapping once per export. Reuse existing CSV parsing, normalization, empty-row exclusion, IDs, bookmaker aliases, and weekly numbering through a browser/Node-compatible pure module; do not maintain a second parser.
- Reject malformed snapshots and mismatched source/selection metadata. A valid empty selection is allowed and renders “Δεν υπάρχουν στοιχήματα για αυτή την περίοδο.” Never treat it as a successful fetch of fabricated zero-valued rows.
- Updating a published snapshot is explicit. Require an overwrite flag, produce a before/after row summary, and preserve the old file until validation succeeds. A rebuild alone must not update `capturedAt` or the rows.
- Explain that an initial snapshot captured today is **not** proof of what the article displayed on its original publication date. Historical reconstruction needs a verified historical CSV; never backdate the capture timestamp.

## 6. Tasks for Sonnet

### T01 — Confirm the baseline and inventory (P0)

**Owner:** both repositories. **Depends on:** nothing.

Read each repository's applicable instructions, inspect status/diffs, and identify authored versus generated article files. Re-run the BetCast embed inventory, record filters and explicit themes, and use `20261002J` as the first integration fixture. Record the current article block at 390px and an approximately 770px article content width, in both themes, if browser tooling is available.

**Done when:** the inventory is checked against source, unrelated local changes are identified and preserved, and the implementation has a reproducible article fixture. Do not edit generated `article.html` by hand.

### T02 — Extract the minimum shared data helpers (P0)

**Owner:** BetCast. **Depends on:** T01.

Extract only the CSV normalization pipeline and table-row selection needed by T03 from `src/services/googleSheetService.js`/`BetCast.jsx` into a pure module importable by Node and CRA. Keep browser fetch/cache/refresh behavior in the existing service. Keep existing exports compatible; use `.mjs` or another format proven to work in the installed toolchain, without changing the repository's package module mode.

**Done when:** fixture cases prove identical normalized rows and table selection for existing behavior, including comma decimals, aliases, empty/formula rows, bet descriptions, assigned IDs, week intersections, and open-ended ranges. Existing Jest tests and CRA build pass. Do not extract all 13 chart renderers as part of this task.

### T03 — Implement the verified table snapshot exporter (P0)

**Owner:** BetCast. **Depends on:** T02.

Implement the CLI and v1 contract in section 5. Use Node built-ins and the existing model; add no package unless demonstrably necessary. Export from fixtures without network access and support deliberate direct-sheet capture. Put disposable outputs in ignored artifacts; do not commit generated captures or deployment bundles at the repository root.

**Done when:** one command produces a complete schema-valid snapshot from a URL and CSV input; invalid inputs fail; no sample fallback is possible; overwriting is explicit; and source identity, actual capture time, selected rows, and content hash are recorded. Document the actual command syntax after implementation.

### T04 — Render native BetCast blocks in the article builder (P0)

**Owner:** F1 Stories. **Depends on:** T03.

Add `BETCAST:<snapshot-id>` recognition in the existing placeholder flow in `blog-module/build/embeds.js`, with a dedicated renderer/validator. Resolve IDs only inside the snapshot directory. Render escaped HTML from typed JSON, not arbitrary pasted markup. Use the existing URL/attribute escaping helpers and keep all existing iframe/widget restrictions.

Generate the analysis link using an explicit approved BetCast base URL supplied by the host/build configuration. During the same-origin transition, support both the existing GitHub Pages base and the reviewed `/betcast/` base; do not derive the application path from the article URL.

Ensure the incremental article build tracks referenced snapshot contents and renderer version. A changed snapshot must invalidate its article even when `source.txt` is unchanged; an unchanged snapshot must produce unchanged HTML.

**Done when:** a fixture shortcode produces a native semantic table with correct rows, scope, timestamp, and link; the build needs no network; missing/invalid snapshots fail clearly; repeated references/multiple blocks work; escaped spreadsheet text cannot become executable HTML; and unrelated embed golden fixtures remain stable.

### T05 — Style the native table for reading, touch, and print (P0)

**Owner:** F1 Stories. **Depends on:** T04.

Implement section 4 in the host's authored article CSS. Scope selectors to `.betcast-article-block`; use the existing host theme tokens and local typography. Use visible bookmaker text initially; logos may reuse approved local assets but must not make the standalone BetCast page a rendering dependency.

**Done when:** light/dark tables fit 320/390/640px and 770px content widths; there is no page-level horizontal overflow or nested vertical scroll; all numeric fields remain available; long Greek descriptions wrap; links/disclosures have visible keyboard focus and at least 44px touch targets; and print/no-JS retains the data. A four-row fixture should occupy roughly 300–450px at desktop article width, subject to text wrapping, rather than reserving 960px. Treat this as a design target, never a clipping limit.

### T06 — Make native authoring usable (P0)

**Owner:** both repositories. **Depends on:** T03–T05.

Write the shortest reliable editor workflow: choose table/scope in BetCast, copy its normal URL, export a named snapshot, place it in the host snapshot directory, insert `BETCAST:<id>`, and preview the article. Provide a complete worked example using the week-16 fixture.

For P0, the existing Embed button may remain compatible and point editors to this workflow in documentation. Do not make it copy a shortcode that references a nonexistent snapshot. After host support is ready, a small choice panel can offer “Πίνακας άρθρου” and “Διαδραστικό embed”; implementing an in-app snapshot download requires reliable data provenance first and is optional follow-up.

**Done when:** another developer/editor can create an article table from the documented commands, including a clear snapshot-update procedure, without hand-writing rows or editing generated HTML.

### T07 — Migrate table articles without changing their meaning (P0)

**Owner:** F1 Stories. **Depends on:** T04–T06.

Start with `20261002J`, `20260924J`, and an open-ended case such as `20260725J`. Export verified snapshots and replace only their BetCast iframe source blocks with typed shortcodes. Review whether open-ended and unbounded selections are intentional; preserve them until the editor resolves any ambiguity. Record snapshot season/source, row count, selection, and actual capture date for each migration.

Then migrate the remaining confirmed BetCast table embeds. Leave adjacent standings, telemetry, Ghost Car, YouTube, Tyres, and other embeds untouched. Native tables inherit the host theme, replacing iframe-specific hardcoded dark/light styling.

**Done when:** migrated generated articles contain no BetCast iframe, selected rows match the verified source and original filter semantics, the scope/link is correct, and paragraph flow, author cards, and unrelated embeds are intact. Missing verified data leaves that article unmigrated with an explicit reason, not fabricated content. Rollback consists of restoring the original authored iframe line and rebuilding.

### T08 — Validate and document P0 (P0)

**Owner:** both repositories. **Depends on:** T02–T07.

Run the verification matrix below, update BetCast's README embedding section, and document the host shortcode/snapshot contract beside its other authoring instructions. Report what was migrated, what remains, and whether same-origin hosting was actually exercised.

**Done when:** both repositories' relevant checks pass and the P0 acceptance list is satisfied. Do not report this as complete based only on a standalone BetCast screenshot or a successful export command.

### T09 — Add a compact article presentation (P1)

**Owner:** BetCast. **Depends on:** T01; may be implemented independently of P0.

Add opt-in `?embed=1&presentation=article`. Leave plain `?embed=1` compatible with the existing dashboard presentation. Parse and serialize `presentation` through `App.js`, the URL effect, and snippet builder; strip it from normal full-app share links. Build an explicit render branch with a small brand/title line, fixed season/week scope, exactly the selected view, its units/legend, freshness/error state, and “Άνοιγμα BetCast”. Do not merely hide dashboard DOM with CSS.

Article presentation has no global metrics, chart selector, season selector, or statistics drawer. Disable swipe-to-change-view here; preserve chart interaction and table sorting/pagination. `compareWeeks` retains controls needed to make that view usable. Hide the full-app empty-state reset action in fixed-scope article mode; offer the matching full-app link instead of silently broadening the article's range. Existing table CSV behavior must remain intact where it is available.

Use compact layouts in `src/App.css`, the existing typography/colors, and content-based height. Cover all three render paths: lazy fallback, data loading, and loaded/error/empty. Budget-style plots can target a 280–340px plotting area; multi-panel views/tables may be taller. Do not force every view into a 16:9 crop.

**Done when:** each of the 13 supported views renders correctly in article mode, reload preserves its state, no hidden selector/swipe changes its subject, and ordinary dashboard/legacy embeds retain their current controls and behavior.

### T10 — Implement host height handling (P1)

**Owner:** both repositories. **Depends on:** T09 for new presentation; legacy handling can be added earlier.

Keep the existing `{ type: 'betcast:resize', height }` wire shape. Measure a stable wrapper that exists during lazy loading, fetching, errors, empty states, and normal rendering. Observe its intrinsic content box, post after layout/font changes, suppress unchanged values, coalesce animation frames, and clean up observers/listeners/pending frames. The child must not derive its content height from the iframe's viewport height, creating a resize loop. Provide a resize/load fallback where `ResizeObserver` is absent.

Add one host adapter in `article-script.js` for recognized BetCast frames only. Match the exact approved origin/path and verify `event.source === iframe.contentWindow` plus the expected `event.origin`. Accept only the known message type and finite numeric heights within a documented sane range (for example 100–12,000px); reject out-of-range values rather than applying a cap that clips content. Set height on that frame only, without easing height changes. Remove legacy inline `min-height:960px` only on managed BetCast frames once a valid measurement arrives.

Install the listener before creating/loading new managed frames; for existing frames, re-request the measurement with a validated `betcast:measure` message so an early resize event cannot be lost. Handle two BetCast frames alongside unrelated frames. Preserve a usable fixed-height fallback and an ordinary external analysis link if host scripting is unavailable. A bare iframe snippet cannot promise automatic sizing: the Embed UI/docs must distinguish managed host embeds from standalone iframe-only output.

For managed frames, learn the parent origin from a validated parent message and reply to that exact origin. The legacy public height broadcast may remain for backwards compatibility before a handshake; it must contain only the existing height metadata. New incoming controls must always validate source, origin, and shape. See [the postMessage sender-validation guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) and [ResizeObserver behavior](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver).

**Done when:** loaded content can grow and shrink, loading/error/retry/table pagination/orientation changes are measured, the old minimum height no longer overrides a managed measurement, there is no resize loop, invalid messages are ignored, and the correct frame responds in a multi-embed article.

### T11 — Match the article's theme without reloading (P1)

**Owner:** both repositories. **Depends on:** T09–T10.

Keep existing `theme=light|dark` explicit and view-only. Add opt-in `theme=host` for managed article frames; validate it in both `public/index.html` pre-paint resolution and the React theme layer. Before the host message arrives, use the existing saved/system resolution as a fallback. The host sends `{ type: 'betcast:theme', theme: 'light' | 'dark' }` after frame load/handshake and when its `data-theme` changes.

The child accepts that message only from its parent at the approved article origin, applies it locally, and never writes it to localStorage. Preserve the `theme=host` marker through URL serialization rather than replacing it with a resolved dark/light value. Explicit light/dark frames ignore host theme messages. Do not reload the frame or reset chart/table state on a host toggle. Native P0 tables already follow host CSS and need no message bridge.

**Done when:** host theme toggles update all managed article frames while preserving selection/page state; explicit theme embeds remain fixed on reload; shared `f1stories-theme` preferences are not overwritten by incoming messages; forged/unrecognized messages do nothing; and existing theme tests still pass.

### T12 — Optional native interactive charts (P2, separate follow-up)

**Owner:** both repositories. **Depends on:** proven need after P0/P1.

If readers need chart exploration directly in the article without any iframe, create a separately built widget entry that mounts only the chosen chart into a host element. Extract renderers/data hooks incrementally from BetCast; never mount the existing `App`/`BetCast` unchanged into an article. They read/write global URL state, alter body theme, own refresh behavior, and assume one application instance.

Define `mount(element, config)` returning an unmount function. Use instance-local selection, scoped CSS/tokens, unique SVG/chart IDs, one runtime load per article, lazy loading near the viewport, and a persistent HTML figure/link fallback. Prefer a pinned snapshot unless an editor explicitly requests live data. Do not replace a semantic server-rendered table with an empty React mount target. React supports [multiple separate roots](https://react.dev/reference/react-dom/client/createRoot); use APIs available in this project's React 18, not newer documentation examples that require a dependency upgrade.

Before implementation, specify the bundle build and host manifest contract. CRA's normal application bundle is not an embeddable widget API. Any additional build command must be isolated and preserve `npm start`, `npm run build`, and existing deployment behavior. No runtime CDN React, iframe DOM scraping, or blind inclusion of application chunks.

**Done when:** two independent widgets coexist without changing article URL/theme or each other's selection; chart numbers match the app; errors have a usable fallback; mount/unmount cleans up; and measured byte/request costs justify the extra runtime. This task is not a prerequisite for shipping native article tables.

## 7. Verification matrix and release acceptance

Tests must use deterministic CSV/JSON fixtures for correctness. Live sheet checks are supplemental, not a replacement for fixture tests.

| Area | Required cases |
| --- | --- |
| Data parity | Real-row exclusion, comma decimals, descriptions, bookmaker aliases, original IDs/numbers, cumulative Budget, no fabricated samples |
| Filter parity | `week` alone, inclusive range, range intersected with week, open-ended range, unbounded scope, missing week, invalid range/input, both season aliases |
| Snapshot integrity | Invalid schema/ID, missing file, escaped text, source provenance, explicit overwrite, offline repeatable build, incremental invalidation |
| Native article | 0/4/15/more-than-15 rows; long descriptions; dark/light; 320/390/640/770px widths; keyboard; print; JS disabled |
| Analysis links | Selection parameters retained, presentation/embed/host-theme removed, GitHub Pages and canonical configured bases |
| P1 presentation | All 13 views, no dashboard chrome, required comparison/table controls, no swipe view change, loading/error/retry/empty |
| P1 host adapter | Grow/shrink, old min-height, late listener, two BetCast frames, unrelated frames, orientation/fonts, invalid origin/source/payload, missing observer |
| Theme regression | URL overrides/reload, host toggles without reset, no incoming storage writes, explicit overrides ignore host messages |
| Dashboard regression | Standalone filtering, URL state, sharing/clipboard/native share, legacy iframe snippet, CSV semantics, both themes, responsive tables |

BetCast checks: `npm test -- --watchAll=false` and `npm run build`; also `npm run build:f1stories` if the existing same-origin local work is present. The optional browser tools in `scripts/visual-audit/` require the prerequisites in `docs/visual-design.md`. Existing `verify.cjs` expects `#chart-select` in legacy embeds; retain that check and add separate article-mode checks instead of weakening it.

Article-site checks: inspect its current instructions/scripts, run `npm run test:blog`, and run the applicable build/quality checks for article CSS and source changes. The inspected host exposes `npm run build:blog` and `npm run quality:static`; confirm these before use. Rebuild through its pipeline and verify the generated diff. Do not blindly update all golden fixtures or quality baselines to hide unrelated failures.

P0 release acceptance:

- [ ] Migrated betting-table articles contain native table HTML and no BetCast iframe.
- [ ] Every block's rows, scope, source identity, and capture date are verified.
- [ ] Articles require no BetCast JavaScript/React/Recharts/Google Sheets request to display the table.
- [ ] Host theme, mobile reading, keyboard navigation, and print/no-JS work.
- [ ] Matching analysis links work with the configured deployment base.
- [ ] Existing dashboard calculations, sources, filters, shares/embeds, CSV, themes, and tables pass their checks.
- [ ] Remaining unmigrated articles and any unresolved historical-source questions are listed explicitly.

P1 acceptance adds correct compact presentation, robust host height handling, and view-only theme synchronization. Publishing is a separate requested action after review.

## 8. Constraints and suggested implementation order

Read `AGENTS.md`, `docs/visual-design.md`, `docs/theme.md`, and `docs/same-origin-deployment.md` first. Preserve the local same-origin changes in `package.json`, `public/index.html`, `public/manifest.json`, the shell components, `src/siteUrls.js`, and associated scripts/tests. Use `main` as the authoritative source; do not edit `gh-pages`.

Do not migrate CRA, upgrade React/Recharts, add a backend, redesign the full dashboard, alter betting calculations, expand the season source registry incidentally, or change deployment. Do not commit dependencies, build directories, captures, or copied deployment bundles. A future same-origin cutover must remain independently reviewable.

Recommended change sequence:

1. BetCast: T01–T03, with a fixture snapshot and export documentation.
2. F1 Stories: T04–T06, with one generated native-table fixture.
3. F1 Stories: T07–T08, migrating the three representative cases first, then the remaining verified articles.
4. BetCast + F1 Stories: T09–T11 if interactive embeds are still needed.
5. Reassess T12 only after observing a need that compact charts or native tables cannot meet.

Sonnet's completion report should state changed files in each repository, commands run and results, representative before/after evidence, unresolved data/migration items, and whether any publishing occurred. For this plan, publishing should be none.
