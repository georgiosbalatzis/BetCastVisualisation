# Theme persistence

## F1 Stories contract

| | |
|---|---|
| Storage | `localStorage`, key **`f1stories-theme`** (shared by f1stories.gr, Telemetry, Ghost Car, BetCast). Not namespaced by app or path |
| Preferences | `light`, `dark`, `auto` (follow the OS `prefers-color-scheme`) |
| Anything else / absent | `auto`, BetCast's default before the migration and kept. An unusable stored value is left in place |
| Written | Only on an explicit choice in the UI. Never on load, never from `?theme=` |
| Old BetCast key | `betcast_theme`, migrated and removed on load (below). Never written |

The **preference** (`light` / `dark` / `auto`) is what is stored. The **resolved theme** (`light` / `dark`) is what is painted: `body.light-mode` or `body.dark-mode`. `auto` stays stored as `auto`; the resolved value is never written back over it.

## Resolution

The inline script in `public/index.html` runs before first paint and sets the body class. `src/context/ThemeContext.js` reads the same keys in the same order for React state, so React never repaints a different theme. Both are covered by one shared case table in `src/context/ThemeContext.test.js`, which runs the real `index.html` script.

1. `?theme=light|dark`: this view only, never stored (share and embed links).
2. `f1stories-theme` = `light` / `dark` / `auto`.
3. `betcast_theme` = `light` / `dark` / `auto` (only reachable when the migration write failed).
4. Otherwise `auto`.

`auto` resolves with `window.matchMedia('(prefers-color-scheme: dark)')`, or dark if `matchMedia` is unavailable (unchanged). While the page is open, React follows live OS changes when the preference is `auto`. Explicit `light` / `dark` ignore them.

## Theme control

The masthead button switches to the opposite of the resolved theme and stores that explicit `light` or `dark` choice, also from `auto`. The UI has no `auto` option, as before. `setMode('auto')` in the theme context stores `auto` but nothing in the UI calls it. Each successful write also removes `betcast_theme`.

## Migrating `betcast_theme`

The pre-paint script does this:

- A valid `f1stories-theme` always wins: `f1stories-theme=dark` + `betcast_theme=light` renders dark.
- If `f1stories-theme` is absent or unusable (not `light`/`dark`/`auto`) and `betcast_theme` is valid, that value is used and written to `f1stories-theme`. `auto` migrates as `auto`. So `f1stories-theme=banana` + `betcast_theme=auto` gives `f1stories-theme=auto`.
- `betcast_theme` is then removed, whether it was migrated, stale or invalid.
- If storage blocks the write, the legacy value still renders and `betcast_theme` is kept. React reads it too, so the session stays consistent, and the next load retries the migration.

Keep the fallback for several releases, because readers who have not opened BetCast since the change still have only `betcast_theme`.

## Not supported

- No `storage`-event sync between open tabs. Other tabs pick up the choice on reload, matching f1stories.gr, Telemetry and Ghost Car.
- `<meta name="theme-color">` is static (`#111113`) and does not follow the theme. This is unchanged.

Storage failures (blocked storage, `SecurityError`, quota) are swallowed. The page renders `auto`, or `?theme=`.

## Origins: same contract, partly shared state

`localStorage` is per origin, not per path. BetCast (`https://georgiosbalatzis.github.io/BetCastVisualisation/`), Ghost Car and Telemetry share the `georgiosbalatzis.github.io` origin, so they read and write the same `f1stories-theme` value. A choice made in one applies to the others on their next load. Ghost Car and Telemetry resolve a stored `auto` from the OS at load and leave it in place.

`https://f1stories.gr` is a different origin. **A theme chosen there is not visible to BetCast**, even with the same key. Sharing it fully needs the apps served under one origin (e.g. `f1stories.gr/...`), which then works with no code change, or another deliberate architecture. There is no cross-origin workaround here: no iframes, cookies, query propagation or remote storage.
