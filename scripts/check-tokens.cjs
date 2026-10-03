// Local snapshot only: no sibling repository, network or CSS dependency required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/design-tokens.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'src/App.css'), 'utf8');
function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`^${escaped}\\s*\\{([^}]+)\\}`, 'm'));
  assert(match, `Missing theme scope: ${selector}`);
  return Object.fromEntries(Array.from(match[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g), match => [match[1], match[2].trim()]));
}
const shared = block(':root, .dark-mode, .light-mode');
for (const [theme, selector] of [['dark', ':root, .dark-mode'], ['light', '.light-mode']]) {
  const values = block(selector);
  for (const [token, expected] of Object.entries({ ...manifest.themes[theme], ...manifest.data[theme] })) assert.equal(values[token], expected, `${theme}: ${token}`);
}
for (const [token, value] of Object.entries(manifest.shared)) assert.equal(shared[token], value, token);
for (const [alias, token] of Object.entries(manifest.aliases)) assert.equal(shared[alias], `var(${token})`, alias);
assert.match(css, /:focus-visible\s*\{\s*outline: 2px solid var\(--accent\); outline-offset: 5px;/);
console.log('BetCast tokens synchronized: canonical light/dark primitives, aliases, fixed-paper helpers and preserved data inks.');
