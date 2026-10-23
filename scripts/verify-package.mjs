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
const project = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
assert.equal(packed.name, project.name);
assert.equal(packed.version, project.version);
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
  const development = project.devDependencies;
  run(
    process.execPath,
    [
      npm,
      'install',
      '--save-dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      `typescript@${development.typescript}`,
      `@types/node@${development['@types/node']}`,
    ],
    consumer,
  );
  const types = `import {FlashData,type CreateBulkJobRequest,type MarkdownQueryResult,type ResponseAccept} from '@flashdata-dev/sdk';
const client=new FlashData({apiKey:process.env.FLASHDATA_API_KEY});
const request:CreateBulkJobRequest={source:'youtube_download',options:{storage:{storage_type:'s3',storage_url:'bucket'}}};
async function check(){const receipt=await client.google.search({query:'coffee'},{mode:'async'});await client.jobs.wait(receipt.id);const result=await client.google.search({query:'coffee'});const status:string=result.status;void status;}
void request;void check;
async function formats(accept:ResponseAccept){
const text:string=await client.google.search({query:'coffee'},{accept:'text/plain'});
const markdown:MarkdownQueryResult=await client.youtube.transcript({video_id:'dQw4w9WgXcQ'},{respondWith:'markdown'});
const stored:MarkdownQueryResult=await client.jobs.result('job_example',{respondWith:'markdown'});
const receipt:string=await client.queries.submit({source:'google_search',query:'coffee'},{accept:'text/plain'});
const status:string=await client.jobs.get('job_example',{accept:'text/plain'});
const variable=await client.google.search({query:'coffee'},{accept});
// @ts-expect-error background helpers do not accept Markdown
await client.google.search({query:'coffee'},{mode:'async',respondWith:'markdown'});
// @ts-expect-error realtime helpers do not accept callbacks
await client.google.search({query:'coffee'},{callback_url:'https://callback.example/done'});
void [text,markdown,stored,receipt,status,variable];
}
void formats;
`;
  for (const extension of ['mts', 'cts'])
    await writeFile(join(consumer, 'consumer.' + extension), types);
  run(
    process.execPath,
    [
      join(consumer, 'node_modules/typescript/bin/tsc'),
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
      '--lib',
      'ES2022',
      '--esModuleInterop',
      '--types',
      'node',
      'consumer.mts',
      'consumer.cts',
    ],
    consumer,
  );
  const body = `const client=new FlashData({apiKey:process.env.FLASHDATA_API_KEY,fetch:async(_url,init)=>{
const headers=new Headers(init.headers);
if(headers.get('accept')==='text/plain')return new Response('Source: "google_search"\\nStatus: "done"\\n');
if(headers.get('x-respond-with')==='markdown')return Response.json({source:'google_search',status:'done',content:'# Coffee\\n'});
return Response.json({source:'google_search',status:'done',created_at:'now',usage:{credits:0},results:[{organic:[{title:'Coffee'}]}]});
}});const result=await client.google.search({query:'coffee'});if(result.results[0].organic[0].title!=='Coffee')throw Error('Bad result');
if(typeof await client.google.search({query:'coffee'},{accept:'text/plain'})!=='string')throw Error('Bad text');
if(!(await client.google.search({query:'coffee'},{respondWith:'markdown'})).content.includes('Coffee'))throw Error('Bad Markdown');
if(typeof await client.jobs.result('job_example',{accept:'text/plain',respondWith:'markdown'})!=='string')throw Error('Bad stored text');`;
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
