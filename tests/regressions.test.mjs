import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import {
  FlashData,
  APIError,
  ValidationError,
  ProtocolError,
  ResponseTooLargeError,
  RequestAbortedError,
  SubmissionUnknownError,
  PollingTimeoutError,
  RequestTimeoutError,
} from '../dist/index.js';

const JOB = 'job_regression123',
  BULK = 'bulk_regression123',
  STORAGE = 'https://results.example';
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers });
function setup(handler, options = {}) {
  const calls = [];
  const client = new FlashData({
    apiKey: 'test-regression-key',
    ...options,
    fetch: async (input, init) => {
      const url = new URL(String(input));
      calls.push({ url, ...init });
      return handler(url, init);
    },
  });
  return { client, calls };
}
async function collect(iterator) {
  const items = [];
  for await (const item of iterator) items.push(item);
  return items;
}
function resultClient(bytes, options = {}) {
  return setup(
    (url) =>
      url.origin === STORAGE
        ? new Response(bytes)
        : url.pathname === '/v2/api-access'
          ? json({ result_origin: STORAGE })
          : new Response(null, { status: 302, headers: { location: STORAGE + '/part' } }),
    options,
  );
}

test('public discovery accepts an explicit empty key and never sends authentication', async () => {
  const { client, calls } = setup(() => json({ data: [] }), { apiKey: '' });
  await client.public.sources();
  assert.equal(new Headers(calls[0].headers).get('x-api-key'), null);
  await assert.rejects(client.account.access(), ValidationError);
  assert.equal(calls.length, 1);
});
for (const invalid of [
  undefined,
  null,
  [],
  { source: {} },
  { source: 'google_search', query: '  ' },
  { source: 'youtube_metadata', video_id: 'dQw4w9WgXcQ', params: { include_formats: NaN } },
])
  test('malformed query rejects locally: ' + JSON.stringify(invalid), () => {
    const { client, calls } = setup(() => assert.fail('network'));
    assert.throws(() => client.queries.realtime(invalid), ValidationError);
    assert.equal(calls.length, 0);
  });
test('non-serializable updates raise validation rather than ambiguous submission', async () => {
  const { client, calls } = setup(() => assert.fail('network'));
  const cyclic = {};
  cyclic.self = cyclic;
  for (const options of [
    cyclic,
    { unknown: BigInt(1) },
    { unknown: () => {} },
    { unknown: Infinity },
    { unknown: new Map() },
  ])
    await assert.rejects(client.bulk.update(BULK, { options }), ValidationError);
  assert.equal(calls.length, 0);
});
test('pre-aborted submissions never dispatch; interrupted submissions remain ambiguous', async () => {
  const controller = new AbortController();
  controller.abort();
  const { client, calls } = setup(
    (_url, init) =>
      new Promise((_, reject) =>
        init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }),
      ),
  );
  await assert.rejects(
    client.google.search({ query: 'coffee' }, { signal: controller.signal }),
    RequestAbortedError,
  );
  assert.equal(calls.length, 0);
  const during = new AbortController();
  const pending = client.google.search({ query: 'coffee' }, { signal: during.signal });
  during.abort();
  await assert.rejects(pending, SubmissionUnknownError);
  assert.equal(calls.length, 1);
});
test('cancelled status reads and polling sleeps preserve cancellation and job ID', async () => {
  const controller = new AbortController();
  const { client, calls } = setup(() => {
    setImmediate(() => controller.abort());
    return json({ job: { id: JOB, status: 'pending' } });
  });
  await assert.rejects(
    client.jobs.wait(JOB, { signal: controller.signal, pollIntervalMs: 10000 }),
    (error) => error instanceof RequestAbortedError && error.jobId === JOB,
  );
  assert.equal(calls.length, 1);
});
test('a status request consuming the polling deadline reports a polling timeout', async () => {
  const { client, calls } = setup(
    (_url, init) =>
      new Promise((_, reject) =>
        init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }),
      ),
  );
  const alive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(
      client.jobs.wait(JOB, { timeoutMs: 15 }),
      (error) => error instanceof PollingTimeoutError && error.jobId === JOB,
    );
  } finally {
    clearTimeout(alive);
  }
  assert.equal(calls.length, 1);
});
for (const [resource, id, route] of [
  ['jobs', JOB, '/jobs/'],
  ['bulk', BULK, '/bulk-jobs/'],
]) {
  for (const [label, networkTimeoutMs, elapsed, pollingTimeout] of [
    ['polling budget expires before the high-resolution deadline', 100, 18.5, true],
    ['shorter network timeout is preserved', 5, 4, false],
    ['delayed network timeout exceeds the polling deadline', 5, 21, true],
  ]) {
    test(`${resource}: ${label}`, async (t) => {
      let now = 100;
      let clockReads = 0;
      t.mock.method(performance, 'now', () => now + (clockReads++ === 0 ? 0 : 0.25));
      const { client } = setup(() => assert.fail('Unexpected fetch'), {
        timeoutMs: networkTimeoutMs,
      });
      const timeout = new RequestTimeoutError('Status read timed out.');
      const request = t.mock.method(client, '_request', async (method, path, options) => {
        assert.equal(method, 'GET');
        assert.equal(path, route + id);
        assert(Number.isInteger(options.timeoutMs) && options.timeoutMs > 0);
        assert(options.timeoutMs <= networkTimeoutMs);
        now += elapsed;
        throw timeout;
      });
      await assert.rejects(client[resource].wait(id, { timeoutMs: 20 }), (error) =>
        pollingTimeout
          ? error instanceof PollingTimeoutError && error.jobId === id
          : error === timeout,
      );
      assert.equal(request.mock.callCount(), 1);
    });
  }
}

test('malformed job envelopes never return undefined or leak TypeErrors', async () => {
  for (const envelope of [{}, { job: null }, { job: [] }]) {
    const { client } = setup(() => json(envelope));
    await assert.rejects(client.jobs.get(JOB), ProtocolError);
    await assert.rejects(client.bulk.wait(BULK), ProtocolError);
  }
});
test('problem details expose field errors, body request IDs and Data retry hints', async () => {
  const { client } = setup(() =>
    json(
      {
        title: 'Invalid',
        code: 'invalid',
        requestId: 'body-id',
        fieldErrors: [{ field: 'query', message: 'Missing' }],
      },
      400,
    ),
  );
  await assert.rejects(
    client.account.access(),
    (error) =>
      error instanceof APIError &&
      error.requestId === 'body-id' &&
      error.fieldErrors[0].field === 'query',
  );
  const other = setup(() =>
    json({ message: 'Limited', retry_after: 3, requestId: 'body-id' }, 429, {
      'x-request-id': 'header-id',
      'retry-after': '5',
    }),
  ).client;
  await assert.rejects(
    other.account.access(),
    (error) => error.requestId === 'header-id' && error.retryAfter === '5',
  );
  await assert.rejects(
    setup(() => json({ message: 'Limited', retry_after: 3 }, 429)).client.account.access(),
    (error) => error.retryAfter === '3',
  );
});
test('authenticated storage discovery is cached and signed requests never contain API keys', async () => {
  const { client, calls } = setup((url, init) => {
    if (url.pathname === '/v2/api-access') return json({ result_origin: STORAGE });
    if (url.origin === STORAGE) {
      assert.equal(new Headers(init.headers).get('x-api-key'), null);
      return json({ id: JOB, results: [] });
    }
    return new Response(null, {
      status: 302,
      headers: { location: STORAGE + '/result?sig=private' },
    });
  });
  await client.jobs.result(JOB);
  await client.jobs.result(JOB);
  assert.equal(calls.filter((call) => call.url.pathname === '/v2/api-access').length, 1);
});
test('storage API errors redact signed locations and credentials', async () => {
  const signed = STORAGE + '/result?secret=signed-value';
  const { client } = setup((url) =>
    url.pathname === '/v2/api-access'
      ? json({ result_origin: STORAGE })
      : url.origin === STORAGE
        ? json({ message: signed + ' test-regression-key', authorization: 'private-token' }, 403)
        : new Response(null, { status: 302, headers: { location: signed } }),
  );
  await assert.rejects(client.jobs.result(JOB), (error) => {
    const serialized = JSON.stringify(error);
    assert(!serialized.includes('signed-value'));
    assert(!serialized.includes('test-regression-key'));
    assert(!serialized.includes('private-token'));
    return error instanceof APIError;
  });
});
for (const [label, bytes, options, ErrorType] of [
  ['corrupt gzip', Buffer.from([0x1f, 0x8b, 0, 1]), {}, ProtocolError],
  ['truncated gzip', gzipSync('{"id":1}\n').subarray(0, -4), {}, ProtocolError],
  ['invalid UTF-8', Buffer.from([0xff, 0x0a]), {}, ProtocolError],
  ['non-object NDJSON', Buffer.from('[]\n'), {}, ProtocolError],
  [
    'large row',
    Buffer.from('{"text":"1234567890"}\n'),
    { maxLineBytes: 10 },
    ResponseTooLargeError,
  ],
  [
    'decompression limit',
    gzipSync('{"text":"' + 'x'.repeat(2000) + '"}\n'),
    { maxResponseBytes: 512 },
    ResponseTooLargeError,
  ],
])
  test('bulk iteration normalizes ' + label, async () => {
    const { client } = resultClient(bytes, options);
    await assert.rejects(collect(client.bulk.iterRows(BULK, 0)), ErrorType);
  });
test('UTF-8, blank lines, CRLF and final unterminated rows parse correctly', async () => {
  const rows = [{ text: '汉字 ☕' }, { id: 2 }];
  const { client } = resultClient(
    gzipSync('\r\n' + JSON.stringify(rows[0]) + '\r\n' + JSON.stringify(rows[1])),
  );
  assert.deepEqual(await collect(client.bulk.iterRows(BULK, 0)), rows);
});
test('bulk row iteration honors cancellation between buffered rows', async () => {
  const controller = new AbortController();
  const { client } = resultClient(Buffer.from('{"id":1}\n{"id":2}\n'));
  const rows = client.bulk.iterRows(BULK, 0, { signal: controller.signal });
  assert.equal((await rows.next()).value.id, 1);
  controller.abort();
  await assert.rejects(
    rows.next(),
    (error) => error instanceof RequestAbortedError && error.jobId === BULK,
  );
});
test('all-parts iterator uses authenticated part routes and rejects malformed manifests', async () => {
  const { client, calls } = setup((url) =>
    url.pathname === '/v2/api-access'
      ? json({ result_origin: STORAGE })
      : url.origin === STORAGE
        ? new Response('{"index":' + url.pathname.slice(1) + '}\n')
        : url.pathname.endsWith('/results')
          ? json({ parts: [{ number: 0, href: 'https://untrusted.example' }, { number: 1 }] })
          : new Response(null, {
              status: 302,
              headers: { location: STORAGE + '/' + url.pathname.split('/').at(-1) },
            }),
  );
  assert.deepEqual(await collect(client.bulk.rows(BULK)), [{ index: 0 }, { index: 1 }]);
  assert(!calls.some((call) => call.url.hostname === 'untrusted.example'));
  for (const parts of [null, [{ number: -1 }], [{ number: 0 }, { number: 0 }], [{ number: '0' }]]) {
    const { client } = setup((url) =>
      url.origin === STORAGE
        ? new Response('{}\n')
        : url.pathname === '/v2/api-access'
          ? json({ result_origin: STORAGE })
          : url.pathname.endsWith('/results')
            ? json({ parts })
            : new Response(null, { status: 302, headers: { location: STORAGE + '/part' } }),
    );
    await assert.rejects(collect(client.bulk.rows(BULK)), ProtocolError);
  }
});
test('cursor iteration enforces page budgets and detects the initial cursor looping', async () => {
  const { client, calls } = setup(() =>
    json({ data: [], pagination: { hasMore: true, nextCursor: 'existing' } }),
  );
  await assert.rejects(
    collect(client.bulk.iterJobs({ maxPages: 5, cursor: 'existing' })),
    ProtocolError,
  );
  assert.equal(calls.length, 1);
  let index = 0;
  const pages = setup(() =>
    json({ data: [{ id: BULK }], pagination: { hasMore: true, nextCursor: String(++index) } }),
  );
  assert.equal((await collect(pages.client.bulk.iterJobs({ maxPages: 2 }))).length, 2);
  assert.equal(pages.calls.length, 2);
});
test('bulk source-specific options and callbacks validate before network', () => {
  const { client, calls } = setup(() => assert.fail('network'));
  for (const request of [
    { source: 'youtube_metadata', options: { auto: true } },
    { source: 'youtube_download' },
    { source: 'youtube_transcript', options: { result_storage: { storage_type: 'invalid' } } },
    { source: 'youtube_metadata', callback_url: 'not a URL' },
  ])
    assert.throws(() => client.bulk.create(request), ValidationError);
  for (const callback_url of [
    'http://callback.example',
    'https://127.0.0.1',
    'https://10.1.2.3',
    'https://callback.example:444',
    'https://user:pass@callback.example',
    'https://callback.example/#fragment',
  ])
    assert.throws(
      () => client.queries.submit({ source: 'google_search', query: 'coffee', callback_url }),
      ValidationError,
    );
  assert.equal(calls.length, 0);
});
test('upload rejects directories, empty files and pre-cancellation without network', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'flashdata-upload-'));
  const { client, calls } = setup(() => assert.fail('network'));
  const receipt = {
    job: { id: BULK },
    upload: { method: 'PUT', contentType: 'text/plain; charset=utf-8', href: STORAGE + '/input' },
  };
  try {
    const file = join(directory, 'ids.txt');
    await writeFile(file, '');
    await assert.rejects(client.bulk.uploadFile(receipt, directory), ValidationError);
    await assert.rejects(client.bulk.uploadFile(receipt, file), ValidationError);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      client.bulk.uploadFile(receipt, file, { signal: controller.signal }),
      RequestAbortedError,
    );
    assert.equal(calls.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
