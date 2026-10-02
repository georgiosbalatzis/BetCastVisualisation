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

  const isDark = mode === 'auto' ? systemDark : mode === 'dark';

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
