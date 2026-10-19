import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--emitDeclarationOnly'], {
  stdio: 'inherit',
});
for (const format of ['esm', 'cjs']) {
  await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format,
    packages: 'external',
    sourcemap: true,
    outfile: format === 'esm' ? 'dist/index.js' : 'dist/index.cjs',
  });
}
copyFileSync('dist/index.d.ts', 'dist/index.d.cts');
