import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { inspect } from 'node:util';
import { createRequire } from 'node:module';
import { FlashData, APIError, ValidationError, ProtocolError, SubmissionUnknownError, RequestTimeoutError, JobPausedError, JobFailedError, PollingTimeoutError, ResponseTooLargeError } from '../dist/index.js';
const examples = JSON.parse(await readFile(new URL('./fixtures/source-examples.json', import.meta.url), 'utf8'));
const KEY = 'test-key-never-real';
const JOB = 'job_example123';
const BULK = 'bulk_example123';
const STORAGE = 'https://results.example';
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {status, headers});
function setup(handler = () => json({ok: true}), options = {}) {
  const calls = [];
  const client = new FlashData({apiKey: KEY, ...options, fetch: async (input, init) => {
    const url = new URL(String(input)); calls.push({url, ...init}); return handler(url, init);
  }});
  return {client, calls};
}

for (const [source, example] of Object.entries(examples)) {
  test(`${source}: source convenience method uses the API wire contract`, async () => {
    const {client, calls} = setup(() => json(example.response));
    const [group, ...parts] = source.split('_');
    const method = parts.join('_') === 'trainability' ? 'licenseCheck' : parts[0] + parts.slice(1).map(p => p[0].toUpperCase() + p.slice(1)).join('');
    const {source: _, params, ...main} = example.request;
    const result = await client[group][method]({...main, ...params});
    assert.deepEqual(result, example.response);
    assert.deepEqual(JSON.parse(calls[0].body), example.request);
    assert.equal(calls[0].url.pathname, source === 'youtube_download' ? '/v1/queries' : '/v1/queries/realtime');
    assert.equal(calls[0].headers['X-API-Key'], KEY);
    assert.equal(calls[0].redirect, 'manual');
  });
  test(`${source}: background submission preserves callback and parameters`, async () => {
    const {client, calls} = setup();
    const payload = {...example.request, callback_url: 'https://callbacks.example/completed'};
    await client.queries.submit(payload);
    assert.deepEqual(JSON.parse(calls[0].body), payload);
    assert.equal(calls.length, 1);
  });
}
test('batch covers all sources and preserves false without mutating input', async () => {
  const {client, calls} = setup();
  const queries = Object.values(examples).map(v => v.request);
  const before = structuredClone(queries);
  await client.queries.batch(queries);
  assert.deepEqual(JSON.parse(calls[0].body), {queries});
  assert.deepEqual(queries, before);
  await client.youtube.metadata({video_id: 'dQw4w9WgXcQ', include_formats: false});
  assert.equal(JSON.parse(calls[1].body).params.include_formats, false);
});
for (const query of [{}, {source: 'unknown'}, {source:'google_search', query:''}, {source:'google_search',query:'x',params:{num:true}}, {source:'youtube_metadata',video_id:'../secret'}, {source:'youtube_search',query:'x',params:{max_results:21}}, {source:'google_search',query:'x',api_key:KEY}]) {
  test(`invalid input rejected before network: ${JSON.stringify(query)}`, () => {
    const {client, calls} = setup();
    assert.throws(() => client.queries.realtime(query), ValidationError);
    assert.equal(calls.length, 0);
  });
}
test('downloads reject realtime and errors never echo credentials', () => {
  const {client, calls} = setup();
  assert.throws(() => client.queries.realtime(examples.youtube_download.request), ValidationError);
  assert.throws(() => client.youtube.download({video_id:'dQw4w9WgXcQ',storage:{storage_type:'bad',secret_key:'hidden-secret'}}), e => e instanceof ValidationError && !e.message.includes('hidden-secret'));
  assert.equal(calls.length, 0);
  assert(!inspect(client).includes(KEY)); assert(!JSON.stringify(client).includes(KEY));
});
test('account routes, public discovery and usage date names', async () => {
  const {client, calls} = setup();
  await client.account.access(); await client.account.balance(); await client.account.limits();
  await client.account.pricing({source:'youtube_metadata',request_count:3});
  await client.account.usage({source:'google_search',from:'2026-01-01T00:00:00Z',to:'2026-01-02T00:00:00Z'});
  assert.deepEqual(calls.map(c => c.url.pathname), ['/v2/api-access','/v2/api-access/balance','/v2/api-access/limits','/v2/api-access/pricing','/v2/usage']);
  assert.equal(calls[3].url.searchParams.get('request_count'), '3');
  assert.equal(calls[4].url.searchParams.get('from'), '2026-01-01T00:00:00Z');
  for (const action of ['sources','plans','status','health']) { await client.public[action](); assert.equal(calls.at(-1).headers['X-API-Key'], undefined); }
});
function resultHandler(url, init) {
  if (url.origin === STORAGE) {
    assert.equal(new Headers(init.headers).get('x-api-key'), null);
    assert.equal(new Headers(init.headers).get('authorization'), null);
    assert.equal(init.credentials, 'omit');
    return json({completed:true});
  }
  if (url.pathname === '/v2/api-access') return json({sources:[],result_origin:STORAGE});
  return new Response(null, {status:302,headers:{location:STORAGE+'/private/result?signature=hidden'}});
}
test('signed storage requests strip API credentials', async () => {
  const {client, calls} = setup(resultHandler);
  assert.deepEqual(await client.jobs.result(JOB), {completed:true});
  assert.deepEqual(calls.map(c => c.url.hostname), ['api.flashdata.dev','api.flashdata.dev','results.example']);
});
for (const signed of ['https://evil.example/result','http://results.example/file','https://user:pass@results.example/file','https://results.example/file#fragment']) {
  test(`reject untrusted signed URL ${signed}`, async () => {
    const {client, calls} = setup((url, init) => url.pathname === '/v2/api-access' ? json({result_origin:STORAGE}) : new Response(null,{status:302,headers:{location:signed}}));
    await assert.rejects(client.jobs.result(JOB), ProtocolError); assert.equal(calls.length, 2);
  });
}
test('storage redirects are not followed', async () => {
  const {client, calls} = setup((url, init) => url.origin === STORAGE ? new Response(null,{status:302,headers:{location:'https://evil.example'}}) : resultHandler(url,init));
  await assert.rejects(client.jobs.result(JOB), e => e instanceof APIError && e.statusCode === 302);
  assert.equal(calls.length, 3);
});
for (const status of [400,401,402,403,404,409,410,422,429,500,503]) {
  test(`HTTP ${status} preserves metadata and never retries`, async () => {
    const {client, calls} = setup(() => json({code:'test_error',message:`Failure ${KEY}`}, status, {'retry-after':'3','x-request-id':'req_123'}));
    await assert.rejects(client.google.search({query:'test'}), e => e instanceof APIError && e.statusCode === status && e.code === 'test_error' && e.retryAfter === '3' && e.requestId === 'req_123' && !e.message.includes(KEY));
    assert.equal(calls.length, 1);
  });
}
test('a lost submission response is unknown and not automatically retried', async () => {
  const {client, calls} = setup(() => {throw new TypeError('fetch failed with private data');});
  await assert.rejects(client.google.search({query:'test'}), SubmissionUnknownError);
  assert.equal(calls.length, 1);
});
test('read timeout and cancellation stop requests', async () => {
  const {client} = setup((_url, init) => new Promise((_, reject) => {init.signal.addEventListener('abort', () => reject(init.signal.reason), {once:true});}), {timeoutMs:5});
  // Keep the event loop alive: AbortSignal.timeout intentionally uses an unref'ed timer.
  const alive = setTimeout(() => {}, 1000);
  try { await assert.rejects(client.account.balance(), RequestTimeoutError); } finally { clearTimeout(alive); }
});
test('invalid JSON and oversized responses are rejected', async () => {
  await assert.rejects(setup(() => new Response('bad json')).client.account.balance(), ProtocolError);
  await assert.rejects(setup(() => new Response('x'.repeat(21)), {maxResponseBytes:20}).client.account.balance(), ResponseTooLargeError);
});
test('job polling reads existing ID and never submits', async () => {
  const statuses = ['pending','processing','completed'];
  const {client,calls} = setup(() => json({job:{id:JOB,status:statuses.shift()}}));
  assert.equal((await client.jobs.wait(JOB,{timeoutMs:1000,pollIntervalMs:1})).status,'completed');
  assert.equal(calls.length,3); assert(calls.every(c => c.method === 'GET' && c.url.pathname === '/v2/jobs/'+JOB));
});
for (const status of ['failed','paused','cancelled']) {
  test(`bulk wait stops on ${status}`, async () => {
    const {client,calls} = setup(() => json({job:{id:BULK,status}}));
    await assert.rejects(client.bulk.wait(BULK), status === 'paused' ? JobPausedError : JobFailedError);
    assert.equal(calls.length,1);
  });
}
test('polling timeout returns the same job ID', async () => {
  const {client,calls} = setup(() => json({job:{id:JOB,status:'pending'}}));
  await assert.rejects(client.jobs.wait(JOB,{timeoutMs:5,pollIntervalMs:2}), e => e instanceof PollingTimeoutError && e.jobId === JOB);
  assert(calls.every(c => c.method === 'GET'));
});
test('bulk create, streaming upload, controls, update and list', async () => {
  const dir = await mkdtemp(join(tmpdir(),'flashdata-sdk-'));
  const path = join(dir,'ids.txt'); const input = 'dQw4w9WgXcQ\n'.repeat(10000); await writeFile(path,input);
  const created = {job:{id:BULK},upload:{method:'PUT',contentType:'text/plain; charset=utf-8',href:STORAGE+'/input?sig=hidden',expiresAt:'2100-01-01T00:00:00Z'}};
  const {client,calls} = setup(async (url,init) => {
    if(url.origin === STORAGE) {
      assert.equal(new Headers(init.headers).get('x-api-key'),null);
      assert.equal(new Headers(init.headers).get('content-length'),String(Buffer.byteLength(input)));
      let received=''; for await(const chunk of init.body) received+=chunk.toString(); assert.equal(received,input);
      return new Response(null,{status:200});
    }
    if(url.pathname === '/v2/api-access') return json({result_origin:STORAGE});
    if(url.pathname === '/v2/bulk-jobs' && init.method === 'POST') return json(created,201);
    if(url.pathname === '/v2/bulk-jobs') return json({data:[],pagination:{hasMore:false,limit:20}});
    return json({job:{id:BULK,status:'running'}});
  });
  try {
    const collection=await client.bulk.create({source:'youtube_metadata',options:{include_formats:false}});
    await client.bulk.uploadFile(collection,path);
    for(const action of ['start','get','pause','resume','cancel']) assert.equal((await client.bulk[action](BULK)).id,BULK);
    await client.bulk.update(BULK,{callback_url:null}); await client.bulk.list({limit:20,cursor:'next-cursor'});
    assert.deepEqual(JSON.parse(calls.find(c=>c.method==='PATCH').body),{callback_url:null});
    assert(calls.some(c=>c.method==='DELETE'));
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('gzip NDJSON bulk parts and manifest', async () => {
  const rows=[{index:0,status:'completed'},{index:1,status:'invalid'}];
  const compressed=gzipSync(rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
  const {client}=setup((url,init)=>{
    if(url.origin===STORAGE) return url.pathname==='/part' ? new Response(compressed) : json({parts:[{number:0}]});
    if(url.pathname==='/v2/api-access') return json({result_origin:STORAGE});
    return new Response(null,{status:302,headers:{location:STORAGE+(url.pathname.endsWith('/0')?'/part':'/manifest')}});
  });
  assert.deepEqual(await client.bulk.manifest(BULK),{parts:[{number:0}]});
  const actual=[]; for await(const row of client.bulk.iterRows(BULK,0)) actual.push(row); assert.deepEqual(actual,rows);
});
test('CommonJS entry point works', () => {
  const require=createRequire(import.meta.url); assert.equal(typeof require('../dist/index.cjs').FlashData,'function');
});
test('invalid client configuration rejected',()=>{
  for(const options of [{dataURL:'http://external.example'},{managementURL:'https://example.com/v2'},{timeoutMs:0},{maxResponseBytes:-1}]) assert.throws(()=>new FlashData({apiKey:KEY,...options}),ValidationError);
});
test('Google pagination has an explicit budget and stops on empty results', async()=>{
  const {client,calls}=setup((_url,init)=>{
    const page=JSON.parse(init.body).params.page;
    return json({source:'google_search',status:'done',results:[{organic:page===1?[{title:'one'}]:[]}]});
  });
  const pages=[];for await(const page of client.google.pages('google_search','coffee',{maxPages:5})) pages.push(page);
  assert.equal(pages.length,2);assert.equal(calls.length,2);
  assert.deepEqual(calls.map(c=>JSON.parse(c.body).params.page),[1,2]);
});
test('Google pagination respects early consumer termination',async()=>{
  const {client,calls}=setup(()=>json({source:'google_search',results:[{organic:[{title:'one'}]}]}));
  for await(const _page of client.google.pages('google_search','coffee',{maxPages:5})) break;
  assert.equal(calls.length,1);
});
test('missing redirect location is a protocol error',async()=>{
  const {client,calls}=setup(()=>new Response(null,{status:302}));
  await assert.rejects(client.jobs.result(JOB),ProtocolError);assert.equal(calls.length,1);
});
test('live free account access', {skip:!process.env.FLASHDATA_LIVE_API_KEY}, async()=>{
  const client=new FlashData({apiKey:process.env.FLASHDATA_LIVE_API_KEY}); assert(Array.isArray((await client.account.access()).sources));
});
