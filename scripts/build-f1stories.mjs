// Canonical assembly target; ordinary development and standalone builds remain unchanged.
import { spawnSync } from 'node:child_process';
const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PUBLIC_URL: '/betcast',
    REACT_APP_F1STORIES_BUILD: 'true',
    REACT_APP_CANONICAL_URL: 'https://f1-stories.gr/betcast/',
    // The f1-stories.gr artifact ships no source maps; the standalone build keeps CRA's default.
    GENERATE_SOURCEMAP: 'false',
  },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
