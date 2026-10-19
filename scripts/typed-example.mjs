import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
await build({
  entryPoints: ['examples/typed.ts'],
  platform: 'node',
  target: 'node22',
  format: 'esm',
  bundle: false,
  outfile: 'build/examples/typed.mjs',
});
const result = spawnSync(process.execPath, ['build/examples/typed.mjs', ...process.argv.slice(2)], {
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
