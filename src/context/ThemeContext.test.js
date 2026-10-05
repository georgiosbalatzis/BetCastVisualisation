import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { act, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme, THEME_STORAGE_KEY, LEGACY_THEME_STORAGE_KEY } from './ThemeContext';

const KEY = 'f1stories-theme';
const LEGACY = 'betcast_theme';

// The real pre-paint script from public/index.html, run against a stub page.
const html = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes(KEY));

// storageThrows: every access fails (blocked storage). writeThrows: only setItem fails (quota).
function runScript({ stored = {}, search = '', osDark = false, storageThrows = false, writeThrows = false } = {}) {
  const items = new Map(Object.entries(stored));
  const fail = () => { throw new Error('SecurityError'); };
  const localStorage = {
    getItem: storageThrows ? fail : (key) => (items.has(key) ? items.get(key) : null),
    setItem: storageThrows || writeThrows ? fail : (key, value) => items.set(key, String(value)),
    removeItem: storageThrows ? fail : (key) => items.delete(key),
  };
  const classes = [];
  const window = {
    location: { search },
    matchMedia: (query) => ({ matches: query === '(prefers-color-scheme: dark)' && osDark }),
  };
  vm.runInNewContext(script, { window, document: { body: { classList: { add: (c) => classes.push(c) } } }, localStorage, URLSearchParams });
  return { body: classes.join(' '), storage: Object.fromEntries(items) };
}

// OS colour scheme for React; returns a function that flips it live.
function mockOs(dark) {
  const listeners = new Set();
  const scheme = { matches: dark, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  window.matchMedia = (query) => (query === '(prefers-color-scheme: dark)'
    ? scheme
    : { matches: false, addEventListener() {}, removeEventListener() {} });
  return (next) => act(() => {
    scheme.matches = next;
    listeners.forEach((fn) => fn({ matches: next }));
  });
}

function Probe() {
  const { mode, isDark, toggle, setMode } = useTheme();
  return (
    <>
      <output aria-label="preference">{mode}</output>
      <output aria-label="resolved">{isDark ? 'dark' : 'light'}</output>
      <button type="button" onClick={toggle}>toggle</button>
      <button type="button" onClick={() => setMode('auto')}>auto</button>
    </>
  );
}

function renderProvider({ stored = {}, search = '', osDark = false } = {}) {
  localStorage.clear();
  Object.entries(stored).forEach(([key, value]) => localStorage.setItem(key, value));
  window.history.replaceState(null, '', `/${search}`);
  document.body.className = '';
  const setOs = mockOs(osDark);
  const { unmount } = render(<ThemeProvider><Probe /></ThemeProvider>);
  return {
    setOs,
    unmount,
    preference: () => screen.getByLabelText('preference').textContent,
    resolved: () => screen.getByLabelText('resolved').textContent,
  };
}

const storageSnapshot = () => ({ ...localStorage });

afterEach(() => {
  delete window.matchMedia;
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

test('React and the pre-paint script use the one shared, un-namespaced key', () => {
  expect(script).toBeDefined();
  expect(THEME_STORAGE_KEY).toBe('f1stories-theme');
  expect(LEGACY_THEME_STORAGE_KEY).toBe('betcast_theme');
});

// [description, stored, osDark, preference, resolved, storage after the pre-paint script]
const cases = [
  ['canonical light (e.g. left by Ghost Car)', { [KEY]: 'light' }, true, 'light', 'light', { [KEY]: 'light' }],
  ['canonical dark (e.g. left by Ghost Car)', { [KEY]: 'dark' }, false, 'dark', 'dark', { [KEY]: 'dark' }],
  ['canonical auto, OS dark', { [KEY]: 'auto' }, true, 'auto', 'dark', { [KEY]: 'auto' }],
  ['canonical auto, OS light', { [KEY]: 'auto' }, false, 'auto', 'light', { [KEY]: 'auto' }],
  ['legacy light migrates', { [LEGACY]: 'light' }, true, 'light', 'light', { [KEY]: 'light' }],
  ['legacy dark migrates', { [LEGACY]: 'dark' }, false, 'dark', 'dark', { [KEY]: 'dark' }],
  ['legacy auto migrates as auto, OS dark', { [LEGACY]: 'auto' }, true, 'auto', 'dark', { [KEY]: 'auto' }],
  ['legacy auto migrates as auto, OS light', { [LEGACY]: 'auto' }, false, 'auto', 'light', { [KEY]: 'auto' }],
  ['canonical wins; stale legacy removed', { [KEY]: 'dark', [LEGACY]: 'light' }, false, 'dark', 'dark', { [KEY]: 'dark' }],
  ['canonical auto wins over stale legacy', { [KEY]: 'auto', [LEGACY]: 'light' }, true, 'auto', 'dark', { [KEY]: 'auto' }],
  ['invalid legacy is not migrated', { [LEGACY]: 'banana' }, true, 'auto', 'dark', {}],
  ['invalid canonical recovers a valid legacy value', { [KEY]: 'banana', [LEGACY]: 'auto' }, false, 'auto', 'light', { [KEY]: 'auto' }],
  ['invalid canonical alone is left in place, default auto', { [KEY]: 'banana' }, true, 'auto', 'dark', { [KEY]: 'banana' }],
  ['nothing stored: auto, OS dark, nothing written', {}, true, 'auto', 'dark', {}],
  ['nothing stored: auto, OS light, nothing written', {}, false, 'auto', 'light', {}],
];

describe.each(cases)('%s', (_, stored, osDark, preference, resolved, after) => {
  test('pre-paint script', () => {
    expect(runScript({ stored, osDark })).toEqual({ body: `${resolved}-mode`, storage: after });
  });

  test('ThemeProvider agrees and writes nothing on load', () => {
    const view = renderProvider({ stored, osDark });
    expect([view.preference(), view.resolved()]).toEqual([preference, resolved]);
    expect(document.body).toHaveClass(`${resolved}-mode`);
    expect(storageSnapshot()).toEqual(stored);
  });
});

test('a failed migration write keeps the legacy key and still renders it', () => {
  for (const theme of ['light', 'dark']) {
    const stored = { [LEGACY]: theme };
    expect(runScript({ stored, osDark: theme === 'light', writeThrows: true })).toEqual({ body: `${theme}-mode`, storage: stored });
    // Same session in React: the legacy value is still honoured.
    const view = renderProvider({ stored, osDark: theme === 'light' });
    expect(view.preference()).toBe(theme);
    act(() => screen.getByText('toggle').click());
    expect(storageSnapshot()).toEqual({ [KEY]: theme === 'light' ? 'dark' : 'light' });
    view.unmount();
  }
});

test('blocked storage does not break startup', () => {
  expect(runScript({ stored: { [LEGACY]: 'dark' }, osDark: false, storageThrows: true }).body).toBe('light-mode');
  expect(runScript({ osDark: true, storageThrows: true }).body).toBe('dark-mode');
  const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('SecurityError'); });
  try {
    const view = renderProvider({ osDark: true });
    expect([view.preference(), view.resolved()]).toEqual(['auto', 'dark']);
    act(() => screen.getByText('toggle').click());
    expect(view.resolved()).toBe('light');
  } finally {
    getItem.mockRestore();
    setItem.mockRestore();
  }
});

test('?theme= overrides this view only and is never stored', () => {
  expect(runScript({ stored: { [KEY]: 'dark' }, search: '?theme=light' })).toEqual({ body: 'light-mode', storage: { [KEY]: 'dark' } });
  expect(runScript({ stored: { [LEGACY]: 'auto' }, search: '?embed=1&theme=dark' })).toEqual({ body: 'dark-mode', storage: { [KEY]: 'auto' } });
  expect(runScript({ search: '?theme=banana', osDark: true }).body).toBe('dark-mode');
  const view = renderProvider({ stored: { [KEY]: 'auto' }, search: '?theme=light', osDark: true });
  expect(view.resolved()).toBe('light');
  expect(storageSnapshot()).toEqual({ [KEY]: 'auto' });
});

test('theme=host article embeds use the saved fallback, then accept a validated parent theme without storage writes', () => {
  const search = '?embed=1&presentation=article&theme=host';
  expect(runScript({ stored: { [KEY]: 'light' }, search, osDark: true })).toEqual({ body: 'light-mode', storage: { [KEY]: 'light' } });
  expect(runScript({ search: '?theme=host', osDark: true })).toEqual({ body: 'dark-mode', storage: {} });

  const originalParent = window.parent;
  const parent = {};
  Object.defineProperty(window, 'parent', { configurable: true, value: parent });
  try {
    const view = renderProvider({ stored: { [KEY]: 'light' }, search, osDark: true });
    const dispatch = (origin, data, source = parent) => {
      const event = new MessageEvent('message', { data, origin });
      Object.defineProperty(event, 'source', { value: source });
      act(() => window.dispatchEvent(event));
    };
    dispatch('https://evil.example', { type: 'betcast:theme', theme: 'dark' });
    expect(view.resolved()).toBe('light');
    dispatch('https://f1stories.gr', { type: 'betcast:theme', theme: 'dark', extra: true });
    expect(view.resolved()).toBe('light');
    dispatch('https://f1stories.gr', { type: 'betcast:theme', theme: 'dark' }, {});
    expect(view.resolved()).toBe('light');
    dispatch('https://f1stories.gr', { type: 'betcast:theme', theme: 'dark' });
    expect(view.resolved()).toBe('dark');
    expect(storageSnapshot()).toEqual({ [KEY]: 'light' });
    view.unmount();

    const explicit = renderProvider({ search: '?embed=1&presentation=article&theme=light', osDark: true });
    dispatch('https://f1stories.gr', { type: 'betcast:theme', theme: 'dark' });
    expect(explicit.resolved()).toBe('light');
    explicit.unmount();
  } finally {
    Object.defineProperty(window, 'parent', { configurable: true, value: originalParent });
  }
});

test('auto stays stored as auto while the OS preference changes live', () => {
  const view = renderProvider({ stored: { [KEY]: 'auto' }, osDark: true });
  expect(view.resolved()).toBe('dark');
  view.setOs(false);
  expect([view.preference(), view.resolved()]).toEqual(['auto', 'light']);
  expect(document.body).toHaveClass('light-mode');
  view.setOs(true);
  expect([view.preference(), view.resolved()]).toEqual(['auto', 'dark']);
  expect(storageSnapshot()).toEqual({ [KEY]: 'auto' });
});

test('explicit light and dark ignore later OS changes', () => {
  for (const explicit of ['light', 'dark']) {
    const view = renderProvider({ stored: { [KEY]: explicit }, osDark: explicit === 'light' });
    view.setOs(explicit !== 'light');
    view.setOs(explicit === 'light');
    expect([view.preference(), view.resolved()]).toEqual([explicit, explicit]);
    view.unmount();
  }
});

test('explicit choices write only the shared key: auto → light → dark → auto', () => {
  const view = renderProvider({ stored: { [KEY]: 'auto', [LEGACY]: 'dark' }, osDark: true });
  act(() => screen.getByText('toggle').click());
  expect([view.preference(), view.resolved()]).toEqual(['light', 'light']);
  expect(storageSnapshot()).toEqual({ [KEY]: 'light' });
  act(() => screen.getByText('toggle').click());
  expect([view.preference(), view.resolved()]).toEqual(['dark', 'dark']);
  expect(storageSnapshot()).toEqual({ [KEY]: 'dark' });
  view.setOs(false);
  act(() => screen.getByText('auto').click());
  expect([view.preference(), view.resolved()]).toEqual(['auto', 'light']);
  expect(storageSnapshot()).toEqual({ [KEY]: 'auto' });
  view.setOs(true);
  expect([view.preference(), view.resolved()]).toEqual(['auto', 'dark']);
  expect(storageSnapshot()).toEqual({ [KEY]: 'auto' });
});
