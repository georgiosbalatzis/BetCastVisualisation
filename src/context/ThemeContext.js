import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';

/**
 * Theme mode can be 'dark', 'light', or 'auto' (follows OS preference).
 * The resolved boolean `isDark` tells components what's actually active.
 */

const STORAGE_KEY = 'betcast_theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the OS / browser preference */
const getSystemPrefersDark = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true;

/** Read saved preference from localStorage, default to 'auto' */
const getSavedMode = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'auto') return saved;
  } catch { /* localStorage unavailable */ }
  return 'auto';
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

  // ---- Persist preference ----
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  // ---- Listen for OS preference changes ----
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq?.addEventListener) return;

    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ---- Toggle from the currently resolved theme ----
  const toggle = useCallback(() => {
    setModeState((prev) => {
      if (prev === 'auto') return systemDark ? 'light' : 'dark';
      if (prev === 'dark') return 'light';
      return 'dark';
    });
  }, [systemDark]);

  const setMode = useCallback((m) => {
    if (m === 'dark' || m === 'light' || m === 'auto') setModeState(m);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, isDark, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
