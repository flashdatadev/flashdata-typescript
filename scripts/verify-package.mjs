/** Build first, then verify exactly what an independent npm consumer installs. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const npm = process.env.npm_execpath;
assert(npm, 'Run npm run verify:package so npm_execpath identifies the current npm CLI.');
const artifacts = join(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
const environment = {
  ...process.env,
  FLASHDATA_API_KEY: 'offline-package-key',
  FLASHDATA_RUN_LIVE: '',
};
const run = (file, args, cwd = root) =>
  execFileSync(file, args, { cwd, env: environment, encoding: 'utf8', timeout: 120000 });
const packed = JSON.parse(
  run(process.execPath, [
    npm,
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    artifacts,
  ]),
)[0];
assert(packed.files.some((file) => file.path === 'dist/index.d.cts'));
assert(packed.files.some((file) => file.path === 'README.zh-CN.md'));
assert(packed.files.some((file) => file.path === 'examples/bulk_download.mjs'));
assert(packed.files.some((file) => file.path === 'src/client.ts'));
for (const file of packed.files) {
  assert(!/(^|\/)(node_modules|artifacts|_build|tests|\.git)(\/|$)/.test(file.path), file.path);
  assert(!/(^|\/)\.(env|npmrc)|private-storage|\.log$/.test(file.path), file.path);
  assert(
    !/fd_[a-z0-9_-]{35,}/i.test(await readFile(join(root, file.path), 'utf8')),
    'Credential-shaped content in ' + file.path,
  );
}
const consumer = await mkdtemp(join(tmpdir(), 'flashdata-package-'));
try {
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'sdk-consumer-check', private: true, type: 'module' }),
  );
  run(
    process.execPath,
    [
      npm,
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      join(artifacts, packed.filename),
    ],
    consumer,
  );
  const types = `import {FlashData,type CreateBulkJobRequest} from '@flashdata-dev/sdk';
const client=new FlashData({apiKey:process.env.FLASHDATA_API_KEY});
const request:CreateBulkJobRequest={source:'youtube_download',options:{storage:{storage_type:'s3',storage_url:'bucket'}}};
async function check(){const receipt=await client.google.search({query:'coffee'},{mode:'async'});await client.jobs.wait(receipt.id);const result=await client.google.search({query:'coffee'});const status:string=result.status;void status;}
void request;void check;
`;
  for (const extension of ['mts', 'cts'])
    await writeFile(join(consumer, 'consumer.' + extension), types);
  run(
    process.execPath,
    [
      join(root, 'node_modules/typescript/bin/tsc'),
      '--strict',
      '--noEmit',
      '--skipLibCheck',
      'false',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--target',
      'ES2022',
      '--esModuleInterop',
      '--types',
      'node',
      '--typeRoots',
      join(root, 'node_modules/@types'),
      'consumer.mts',
      'consumer.cts',
    ],
    consumer,
  );
  const body = `const client=new FlashData({apiKey:process.env.FLASHDATA_API_KEY,fetch:async()=>new Response(JSON.stringify({source:'google_search',status:'done',created_at:'now',usage:{credits:0},results:[{organic:[{title:'Coffee'}]}]}))});const result=await client.google.search({query:'coffee'});if(result.results[0].organic[0].title!=='Coffee')throw Error('Bad result');`;
  await writeFile(
    join(consumer, 'consumer.mjs'),
    `import {FlashData} from '@flashdata-dev/sdk';${body}`,
  );
  await writeFile(
    join(consumer, 'consumer.cjs'),
    `const {FlashData}=require('@flashdata-dev/sdk');(async()=>{${body}})().catch(error=>{console.error(error);process.exitCode=1;});`,
  );
  run(process.execPath, ['consumer.mjs'], consumer);
  run(process.execPath, ['consumer.cjs'], consumer);
  run(
    process.execPath,
    [join(consumer, 'node_modules/@flashdata-dev/sdk/examples/offline.mjs')],
    consumer,
  );
  console.log(
    `Verified ${packed.filename}: ${packed.files.length} files; independent ESM/CommonJS runtime and strict TypeScript consumers passed.`,
  );
} finally {
  assert(
    resolve(consumer).startsWith(resolve(tmpdir()) + (process.platform === 'win32' ? '\\' : '/')),
  );
  await rm(consumer, { recursive: true, force: true });
}
