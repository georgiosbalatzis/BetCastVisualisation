// `npm run deploy`: publishes to the gh-pages branch what pages-mode.json asks for — the app ("app") or pages
// that send readers to f1-stories.gr/betcast/ ("legacy-redirects"; see README, "Moved to f1-stories.gr").
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { mode } = JSON.parse(readFileSync(new URL('../pages-mode.json', import.meta.url), 'utf8'));
const steps = {
  app: [['npm', 'run', 'build'], ['npx', 'gh-pages', '-d', 'build']],
  // -t: include .nojekyll.
  'legacy-redirects': [['npm', 'run', 'build:legacy-redirects'], ['npx', 'gh-pages', '-t', '-d', 'build-legacy']],
}[mode];
if (!steps) throw new Error(`pages-mode.json: unknown mode '${mode}'`);
for (const [command, ...args] of steps) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
