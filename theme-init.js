// Anti-flicker: apply theme class BEFORE React mounts to prevent flash. Loaded blocking from the top of <body>
// in public/index.html (an external file, so a strict Content-Security-Policy needs no 'unsafe-inline').
// Same order as src/context/ThemeContext.js (docs/theme.md): ?theme=light|dark (this view only)
// → "f1stories-theme" (light, dark, or auto = follow the OS, left as stored) → auto.
// "betcast_theme" is the old key: copied over when the shared key holds no usable value,
// then removed — but only after that write succeeds.
(function() {
  var KEY = 'f1stories-theme', LEGACY_KEY = 'betcast_theme';
  var valid = function(v) { return v === 'light' || v === 'dark' || v === 'auto'; };
  var params = new URLSearchParams(window.location.search);
  var s = params.get('theme');
  var hostTheme = s === 'host' && params.get('presentation') === 'article'
    && ['1', 'true', 'yes', 'on'].indexOf(String(params.get('embed') || '').toLowerCase()) !== -1;
  if (s !== 'light' && s !== 'dark' && !hostTheme) s = null;
  var stored = null;
  try {
    stored = localStorage.getItem(KEY);
    var legacy = localStorage.getItem(LEGACY_KEY);
    if (!valid(stored) && valid(legacy)) {
      stored = legacy;
      localStorage.setItem(KEY, legacy);
    }
    if (legacy !== null) localStorage.removeItem(LEGACY_KEY);
  } catch(e) {}
  s = (s === 'light' || s === 'dark') ? s : (valid(stored) ? stored : 'auto');
  var d = s === 'dark' || (s === 'auto' && (window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true));
  document.body.classList.add(d ? 'dark-mode' : 'light-mode');
})();
