// Canonical assembly target; ordinary development and standalone builds remain unchanged.
import { spawnSync } from 'node:child_process';
const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, PUBLIC_URL: '/betcast', REACT_APP_F1STORIES_BUILD: 'true' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
