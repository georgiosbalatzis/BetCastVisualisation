# Article table snapshots

`scripts/export-article-table.mjs` creates a version 1 JSON snapshot for the
F1 Stories article builder. It normalizes the full source CSV with the same pure
pipeline used by BetCast, then applies the URL's inclusive `from`/`to` filters
and intersects them with `week`. IDs, weekly bet numbers, and cumulative Budget
therefore remain those of the complete source dataset.

The exporter accepts only `viz=dataTable` URLs at the approved GitHub Pages
BetCast path or the reviewed `https://f1stories.gr/betcast/` path. It supports
the configured `current` and `lastYear` source aliases. The verified season
label is supplied by the editor; it is not inferred from a moving alias.

For a repeatable, offline capture from a supplied CSV file:

```sh
npm run export:article-table -- \
  --url 'https://georgiosbalatzis.github.io/BetCastVisualisation/?viz=dataTable&season=current&week=16&embed=1&theme=dark' \
  --id 20261002J-week16 \
  --season-label 'Verified season label' \
  --csv ./path/to/verified-season.csv
```

For a direct capture of the configured public sheet, omit `--csv`. The direct
Google Sheets export has a 15-second timeout and fails on HTTP, network, CSV,
or normalization errors. It never calls BetCast's sample-data fallback. Both
forms write to the ignored path
`artifacts/article-snapshots/<snapshot-id>.json` unless `--out` is supplied.

The ID must be 1–80 ASCII letters, digits, underscores, or hyphens and cannot
contain path separators. Replacing an existing snapshot requires `--overwrite`;
the exporter validates the new snapshot before atomically replacing the old
file and prints the before/after row counts. A normal application or article
build does not refresh a snapshot.

The snapshot's `capturedAt` is the actual export time. It records the resolved
sheet and tab plus a SHA-256 digest of the exact CSV bytes. A CSV supplied by an
editor is labeled `provided-csv`; a direct sheet export is labeled
`verified-sheet`. A capture made now does not prove which data an older article
displayed when it was first published. Historical reconstruction needs a
verified historical CSV and must not backdate `capturedAt`.

Example fixture validation, without network access:

```sh
node --test scripts/export-article-table.test.mjs
npm test -- --watchAll=false --runInBand
```

## Add the snapshot to an F1 Stories article

For the week-16 article at `20261002J`, copy its existing BetCast query as the
export URL, verify the season label against the source, and export the pinned
CSV rows. Then copy `artifacts/article-snapshots/20261002J-week16.json` into
`f1StoriesPage/blog-module/betcast-snapshots/` (create the directory if needed)
and add this standalone line to
that article's `source.txt` where the selections belong:

```text
BETCAST:20261002J-week16
```

Build the article with `npm run build:blog` in the F1 Stories checkout and
review its generated `article.html`; do not edit that output by hand. The host
does not request BetCast JavaScript or Google Sheets to display the table. To
update a pinned snapshot later, export again with `--overwrite`, review the row
summary and capture date, and commit the JSON change deliberately. A current
capture is not a reconstruction of the article's original publication data.
