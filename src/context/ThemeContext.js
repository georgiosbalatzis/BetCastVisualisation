import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';

/**
 * Theme mode can be 'dark', 'light', or 'auto' (follows OS preference).
 * The resolved boolean `isDark` tells components what's actually active.
 *
 * The preference is the F1Stories-wide `f1stories-theme` key (see docs/theme.md).
 * The pre-paint script in public/index.html reads the same keys in the same
 * order and migrates `betcast_theme`; keep the two in step.
 */

export const THEME_STORAGE_KEY = 'f1stories-theme';
// Pre-F1Stories key: read only as a fallback, never written.
export const LEGACY_THEME_STORAGE_KEY = 'betcast_theme';

const isMode = (value) => value === 'dark' || value === 'light' || value === 'auto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the OS / browser preference */
const getSystemPrefersDark = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true;

/** URL `?theme=` (this view only) → saved preference → legacy key (if migration could not write) → 'auto' */
const getSavedMode = () => {
  const requested = new URLSearchParams(window.location.search).get('theme');
  if (requested === 'dark' || requested === 'light') return requested;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (isMode(saved)) return saved;
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (isMode(legacy)) return legacy;
  } catch { /* localStorage unavailable */ }
  return 'auto';
};

const isHostThemeRequest = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('theme') === 'host'
    && params.get('presentation') === 'article'
    && ['1', 'true', 'yes', 'on'].includes(String(params.get('embed') || '').toLowerCase());
};

const isApprovedArticleOrigin = (origin) => origin === 'https://f1stories.gr' || origin === 'https://www.f1stories.gr';

/** Store an explicit choice; the legacy key goes only once the shared key is written */
const saveMode = (mode) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch { /* localStorage unavailable */ }
};

/** Apply the correct class to <body> */
const applyBodyClass = (isDark) => {
  document.body.classList.remove('dark-mode', 'light-mode');
  document.body.classList.add(isDark ? 'dark-mode' : 'light-mode');
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext({
  mode: 'auto',       // 'dark' | 'light' | 'auto'
  isDark: true,        // resolved boolean
  toggle: () => {},    // flip from current resolved theme
  setMode: () => {},   // set explicitly
});

export const useTheme = () => useContext(ThemeContext);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const ThemeProvider = ({ children }) => {
  const [mode, setModeState] = useState(getSavedMode);
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark);
  const [hostTheme, setHostTheme] = useState(null);
  const hostThemeRequested = isHostThemeRequest();

  const isDark = hostThemeRequested && hostTheme
    ? hostTheme === 'dark'
    : mode === 'auto' ? systemDark : mode === 'dark';

  // ---- Apply before paint so the initial theme matches the OS/user preference ----
  useLayoutEffect(() => {
    applyBodyClass(isDark);
  }, [isDark]);

  // ---- Listen for OS preference changes ----
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq?.addEventListener) return;

    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Host-controlled article frames accept only a small parent-origin message.
  // The incoming preference stays in memory and never touches shared storage.
  useEffect(() => {
    if (!hostThemeRequested || window.parent === window) return undefined;
    const onMessage = (event) => {
      if (event.source !== window.parent || !isApprovedArticleOrigin(event.origin)) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;
      const keys = Object.keys(data).sort().join(',');
      if (data.type !== 'betcast:theme' || keys !== 'theme,type' || !['light', 'dark'].includes(data.theme)) return;
      setHostTheme(data.theme);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [hostThemeRequested]);

  // ---- Explicit choices are the only writes: never on load or from ?theme= ----
  const setMode = useCallback((m) => {
    if (!isMode(m)) return;
    saveMode(m);
    setModeState(m);
  }, []);

  // ---- Toggle from the currently resolved theme ----
  const toggle = useCallback(() => setMode(isDark ? 'light' : 'dark'), [isDark, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
