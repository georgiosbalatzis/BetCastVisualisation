# P-04 BetCast LCP diagnostic

**DIAGNOSTIC — no product change accepted.**

## Production baseline and attribution

P-01 production cold mobile LCP was 2708 ms median [2704, 2744], n=5,
with `p.page-intro` as the element; the run was data-incomplete. The deployed
pin was `74eeb98b4`, versus base `58202f38c`; b1 reports no application-source
difference between them. Source: [b1 result](/Users/giorgos/WebstormProjects/f1s-p04-evidence/logs/b1.result.md).

In the production trace, the Suspense fallback intro first painted at 744.2 ms.
The lazy chunk completed at approximately 2638 ms, and a different `p.page-intro`
node became the LCP candidate at 2736.3 ms. **HYPOTHESIS:** replacement of the
fallback node made the new intro eligible as a later candidate, with lazy chunk
loading and evaluation delaying that replacement. Font metrics or another repaint
may also have affected candidate size; the trace does not establish the cause.

## Candidate and review

The candidate kept one intro mounted across Suspense, retaining the dashboard
shell and state-specific attributes. The first review returned **CHANGES REQUIRED**
for implicit iframe article mode, shell attribute timing, and insufficient transition
test coverage. The subsequent fixes centralized article presentation, reported
shell state in a layout effect before paint, and exercised transitions with a fresh
lazy import and controlled data requests. The layout update is a separate React
commit. See [candidate and state table](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/CHANGE.md),
[first review](/Users/giorgos/WebstormProjects/f1s-p04-evidence/logs/sol-b.result.md),
and [fixes](/Users/giorgos/WebstormProjects/f1s-p04-evidence/logs/b3.result.md).
The [rejected patch](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/REJECTED-intro-persistence.patch)
has SHA-256 `be996f6860a01ed4a07eb127591295c957f53fd03188257ac4c632c6042d62c8`.

The predeclared rule required at least five valid navigations per artifact per cell
in interleaved randomized blocks, with variant maximum below control minimum, or
median improvement of at least 10% and 150 ms with non-overlapping interquartile
ranges. Data-ready and chart-ready could not regress by the same rule in the adverse
direction. Any CLS increase rejects; unmatched failed-mode cells are inconclusive.

## Harness and provenance

The local harness used a gzip-matching static server for production gzip parity and
fail-closed fixture replay. The one-time success capture on 2026-11-10 contained two
URLs: direct CSV export returned 200, ACAO `*`, 47,710 B, SHA-256
`95d1d180cce1c642a6c2315b3ca5df6a286b670dde78a330f74afc5c45f27f5d`;
gviz returned 200 without ACAO, 69,974 B, SHA-256
`8145efd5d5d6ef6ff9fb93b98f2bf2406a0c24c881dcd7e80836ded281f033c5`.
See [capture manifest](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/fixtures-capture/manifest.json).

Mobile was 393×851 CSS pixels, DPR 1, mobile/touch, 4× CPU, 150 ms latency,
200000 B/s download and 93750 B/s upload; desktop was 1365×768, DPR 1, CPU 1×,
without network throttling. Cold used a fresh context; warm was the second navigation
in the same context with retained storage, not an HTTP-cache-warm load. The harness
routes every request, and Playwright routing disables the HTTP cache. Seeded blocks
interleaved artifact order and randomized cells; the load gate was 4.0. Chrome was
157.0.8103.51. The five blocks had no rejection. P-01 has no matching captured
provider failure, so failed-mode cells were invalid and **inconclusive**. Data and
chart readiness are DOM timings; observation was limited to six seconds. See
[harness](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/README.md),
[validity](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/paired-02/validity.txt),
[summary](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/paired-02/summary.json),
and the [control](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/control-build.sha)
and [variant](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/variant-build.sha) build manifests.

The [control script](/Users/giorgos/WebstormProjects/f1s-p04-evidence/tools/betcast-control.sh)
refuses a dirty tracked tree and logged `control head 58202f38c763ea2b4476c9b57d09f042e6805301`.
The [variant script](/Users/giorgos/WebstormProjects/f1s-p04-evidence/tools/betcast-bench.sh)
built from the same worktree and logged its build-time diff stat: 3 files changed,
133 insertions, 32 deletions. The saved patch was taken afterwards without intervening
edits and has the same stat. This is process evidence, not a cryptographic source
attestation. HTTP caching was disabled for both cold and warm navigations, limiting
comparison with production cache behavior.

## Matched results

The following table is transcribed from [verdict.md](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/paired-02/verdict.md).
LCP, data and chart timings are milliseconds; c/v means control/variant.

| Cell | n c/v | LCP control med [min–max] | LCP variant med [min–max] | LCP verdict | data c→v | chart c→v | CLS c→v | Reject? |
|---|---|---|---|---|---|---|---|---|
| desktop\|light\|/\|success\|cold | 5/5 | 67 [64–75] | 57 [42–66] | no measurable change | 69→70 | 90→91 | 0.0527→0.0527 |  |
| desktop\|light\|/\|success\|warm | 5/5 | 49 [44–68] | 46 [40–51] | no measurable change | 42→43 | 46→49 | 0.0103→0.0074 |  |
| desktop\|dark\|/betcast/\|success\|cold | 5/5 | 72 [65–77] | 57 [41–58] | IMPROVED | 70→71 | 91→92 | 0.0527→0.0527 UP | REJECT |
| desktop\|dark\|/betcast/\|success\|warm | 5/5 | 48 [42–69] | 42 [37–54] | no measurable change | 33→42 | 44→44 | 0.0020→0.0074 |  |
| mobile\|light\|/betcast/\|success\|cold | 5/5 | 734 [732–742] | 733 [731–741] | no measurable change | 2513→2518 | 2616→2615 | 0.1209→0.1209 |  |
| mobile\|light\|/betcast/\|success\|warm | 5/5 | 667 [662–681] | 678 [669–686] | no measurable change | 2422→2428 | 2484→2490 | 0.0215→0.0409 |  |
| desktop\|dark\|/\|success\|cold | 5/5 | 72 [63–79] | 57 [41–57] | IMPROVED | 70→69 | 91→90 | 0.0527→0.0527 UP | REJECT |
| desktop\|dark\|/\|success\|warm | 5/5 | 55 [36–67] | 44 [20–46] | no measurable change | 31→42 | 45→46 | 0.0020→0.0074 UP | REJECT |
| mobile\|dark\|/betcast/\|success\|cold | 5/5 | 731 [730–734] | 731 [730–739] | no measurable change | 2513→2515 | 2613→2613 | 0.1209→0.1209 |  |
| mobile\|dark\|/betcast/\|success\|warm | 5/5 | 672 [668–684] | 678 [671–680] | no measurable change | 2422→2431 | 2480→2491 | 0.0215→0.0409 UP | REJECT |
| desktop\|light\|/betcast/\|success\|cold | 5/5 | 79 [69–95] | 57 [42–63] | IMPROVED | 72→71 | 92→91 | 0.0527→0.0527 |  |
| desktop\|light\|/betcast/\|success\|warm | 5/5 | 66 [36–70] | 37 [35–43] | no measurable change | 41→41 | 44→44 | 0.0020→0.0074 |  |
| mobile\|light\|/\|success\|cold | 5/5 | 736 [732–739] | 733 [730–737] | no measurable change | 2514→2516 | 2612→2614 | 0.1209→0.1209 |  |
| mobile\|light\|/\|success\|warm | 5/5 | 676 [670–678] | 680 [671–685] | no measurable change | 2429→2430 | 2490→2490 | 0.0215→0.0409 UP | REJECT |
| mobile\|dark\|/\|success\|cold | 5/5 | 731 [728–736] | 733 [729–742] | no measurable change | 2512→2517 | 2612→2615 | 0.1209→0.1209 |  |
| mobile\|dark\|/\|success\|warm | 5/5 | 673 [671–675] | 669 [664–672] | no measurable change | 2429→2423 | 2485→2480 | 0.0215→0.0409 |  |

cells 16, improved-and-clean 1, rejecting 5

The local control mobile LCP was `p.page-intro` at approximately 731–744 ms,
with a single LCP entry in the inspected samples
([lcp-elements.txt](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/paired-02/lcp-elements.txt)).
The production late-candidate mechanism did not reproduce under local replay.
The desktop cold cells marked improved show approximately 15–22 ms lower medians.
The table displays CLS medians. The [verdict script](/Users/giorgos/WebstormProjects/f1s-p04-evidence/tools/betcast-verdict.mjs)
compares per-cell maxima: variant max > control max + 1e-9. The tolerance only
absorbs floating-point representation; this is not an exact implementation of the
unqualified “any CLS increase” rule. Recomputing from [summary.json](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/paired-02/summary.json)
and [runs.jsonl](/Users/giorgos/WebstormProjects/f1s-p04-evidence/betcast/paired-02/runs.jsonl),
seven cells have higher medians; five have higher maxima. The control → variant
maxima for every cell where either rose are (rounded to seven decimal places):

| Cell (success) | CLS max control → variant |
|---|---|
| desktop, dark, /betcast/, cold | 0.0527372 → 0.0545222 |
| desktop, dark, /betcast/, warm | 0.0102601 → 0.0102601 |
| mobile, light, /betcast/, warm | 0.0408871 → 0.0408871 |
| desktop, dark, /, cold | 0.0527372 → 0.0546896 |
| desktop, dark, /, warm | 0.0102601 → 0.0546896 |
| mobile, dark, /betcast/, warm | 0.0408871 → 0.1014182 |
| desktop, light, /betcast/, warm | 0.0102601 → 0.0102601 |
| mobile, light, /, warm | 0.0408871 → 0.1014182 |
| mobile, dark, /, warm | 0.0408871 → 0.0408871 |

The five maximum increases reject the candidate under the script's interpretation.

No product change is accepted: the production mechanism was not reproduced and
the matched candidate failed the CLS rule. Further work needs production-origin
measurement using the f1StoriesPage P-04 D1 HTTPS design and reproduction of font
timing before drawing conclusions about the late candidate.

Deployment compatibility: none required. Rollback: not applicable. Pins untouched.
