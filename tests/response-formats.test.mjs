import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import * as esm from '../dist/index.js';
import { formatResponse } from './fixtures/response-formatting.cjs';

const cjs = createRequire(import.meta.url)('../dist/index.cjs');
const fixtures = JSON.parse(
  await readFile(new URL('./fixtures/source-examples.json', import.meta.url), 'utf8'),
);
const stored = JSON.parse(
  await readFile(new URL('./fixtures/stored-result-formats.json', import.meta.url), 'utf8'),
);
const examples = JSON.parse(
  await readFile(new URL('./fixtures/response-formats.json', import.meta.url), 'utf8'),
);
const formats = ['application/json', 'text/plain'].flatMap((accept) =>
  [undefined, 'markdown'].map((respondWith) => ({ accept, respondWith })),
);
const reply = (value) =>
  typeof value === 'string'
    ? new Response(value, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    : Response.json(value);
function helper(source) {
  const [group, ...parts] = source.split('_');
  return [
    group,
    source === 'youtube_trainability'
      ? 'licenseCheck'
      : parts.map((p, i) => (i ? p[0].toUpperCase() + p.slice(1) : p)).join(''),
  ];
}
function setup(Client, handle, options = {}) {
  const calls = [];
  const client = new Client({
    apiKey: 'format-test-key',
    ...options,
    fetch: async (input, init) => {
      const call = { url: new URL(input), ...init, headers: new Headers(init.headers) };
      calls.push(call);
      return handle(call);
    },
  });
  return { client, calls };
}

for (const [module, lib] of [
  ['ESM', esm],
  ['CommonJS', cjs],
]) {
  for (const example of examples)
    test(`${module}: API example ${example.group} ${JSON.stringify(example.headers)}`, async () => {
      const options = {
        accept: example.headers.Accept,
        ...(example.headers['X-Respond-With']
          ? { respondWith: example.headers['X-Respond-With'] }
          : {}),
      };
      const { client, calls } = setup(lib.FlashData, () => reply(example.response));
      const value =
        example.group === 'status'
          ? await client.jobs.get('job_example', options)
          : await client.queries[
              example.group === 'async'
                ? 'submit'
                : example.group === 'batch'
                  ? 'batch'
                  : 'realtime'
            ](example.group === 'batch' ? example.request.queries : example.request, options);
      assert.deepEqual(
        value,
        example.group === 'status' && typeof example.response === 'object'
          ? example.response.job
          : example.response,
      );
      assert.equal(calls.length, 1);
      assert.equal(calls[0].headers.get('accept'), options.accept);
      assert.equal(calls[0].headers.get('x-respond-with'), options.respondWith ?? null);
      if (example.group !== 'status') assert.deepEqual(JSON.parse(calls[0].body), example.request);
    });

  for (const [source, fixture] of Object.entries(fixtures)) {
    const [group, method] = helper(source);
    const { source: _, params, ...main } = fixture.request;
    const input = { ...main, ...params };
    if (source !== 'youtube_download')
      for (const format of formats)
        test(`${module}: ${source} ${JSON.stringify(format)}`, async () => {
          const expected = formatResponse(fixture.response, {
            accept: format.accept,
            representation: format.respondWith,
          });
          const { client, calls } = setup(lib.FlashData, () => reply(expected));
          assert.deepEqual(await client[group][method](input, format), expected);
          assert.deepEqual(JSON.parse(calls[0].body), fixture.request);
          assert.equal(calls[0].headers.get('accept'), format.accept);
          assert.equal(calls[0].headers.get('x-respond-with'), format.respondWith ?? null);
        });
    for (const accept of ['application/json', 'text/plain'])
      test(`${module}: background ${source} ${accept}`, async () => {
        const receipt = { id: 'job_example', source, status: 'pending', usage: { credits: 0.01 } };
        const expected = formatResponse(receipt, { accept, content: false });
        const { client, calls } = setup(lib.FlashData, () => reply(expected));
        assert.deepEqual(await client[group][method](input, { mode: 'async', accept }), expected);
        assert.equal(calls[0].url.pathname, '/v1/queries');
        assert.deepEqual(JSON.parse(calls[0].body), fixture.request);
        assert.equal(calls[0].headers.get('x-respond-with'), null);
      });
  }

  for (const [source, cases] of Object.entries(stored))
    for (const entry of cases)
      test(`${module}: stored ${source} ${entry.accept} ${entry.respondWith}`, async () => {
        const original = cases[0].response;
        const formatted = entry.accept === 'text/plain' || entry.respondWith !== null;
        const { client, calls } = setup(lib.FlashData, (call) => {
          if (call.url.pathname.endsWith('/results'))
            return formatted
              ? reply(entry.response)
              : new Response(null, {
                  status: 302,
                  headers: { Location: 'https://results.example/stored' },
                });
          if (call.url.pathname.endsWith('/api-access'))
            return Response.json({ result_origin: 'https://results.example' });
          assert.equal(call.url.origin, 'https://results.example');
          assert.equal(call.headers.get('x-api-key'), null);
          assert.equal(call.headers.get('x-respond-with'), null);
          return reply(original);
        });
        const value = await client.jobs.result(original.id, {
          accept: entry.accept,
          ...(entry.respondWith ? { respondWith: entry.respondWith } : {}),
        });
        assert.deepEqual(value, entry.response);
        if (typeof value === 'object') {
          for (const [key, field] of Object.entries(original))
            if (key !== 'results') assert.deepEqual(value[key], field);
          assert.equal('results' in value, !entry.respondWith);
          assert.equal('content' in value, !!entry.respondWith);
        } else {
          assert(value.includes('Id: "job_fixture0001"') && value.includes('Status: "completed"'));
          assert(value.includes('Completed at:') && value.includes('Expires at:'));
        }
        assert.equal(calls.length, formatted ? 1 : 3);
      });

  test(`${module}: plain text resembling a URL is content`, async () => {
    const value = 'https://results.example/this-is-content\n浣犲ソ';
    const { client, calls } = setup(lib.FlashData, () => reply(value));
    assert.equal(await client.jobs.result('job_example', { accept: 'text/plain' }), value);
    assert.equal(calls.length, 1);
  });

  for (const options of [
    { accept: 'text/html' },
    { accept: null },
    { respondWith: 'html' },
    { respondWith: null },
    { mode: 'async', respondWith: 'markdown' },
  ])
    test(`${module}: invalid options ${JSON.stringify(options)} fail before submission`, async () => {
      const { client, calls } = setup(lib.FlashData, () => reply({}));
      await assert.rejects(
        async () => client.google.search({ query: 'coffee' }, options),
        lib.ValidationError,
      );
      assert.equal(calls.length, 0);
    });

  for (const status of [400, 406, 409, 410, 429, 503])
    test(`${module}: text requests preserve JSON error ${status}`, async () => {
      const { client, calls } = setup(lib.FlashData, () =>
        Response.json(
          { code: 'example', message: 'Example error' },
          { status, headers: { 'X-Request-ID': 'request_example' } },
        ),
      );
      await assert.rejects(
        client.google.search(
          { query: 'coffee' },
          { accept: 'text/plain', respondWith: 'markdown' },
        ),
        (error) =>
          error instanceof lib.APIError &&
          error.statusCode === status &&
          error.code === 'example' &&
          error.requestId === 'request_example',
      );
      assert.equal(calls.length, 1);
    });

  test(`${module}: text decoding and response limits remain enforced`, async () => {
    const invalid = setup(lib.FlashData, () => new Response(new Uint8Array([255]))).client;
    await assert.rejects(
      invalid.jobs.result('job_example', { accept: 'text/plain' }),
      lib.ProtocolError,
    );
    const bounded = setup(lib.FlashData, () => reply('x'.repeat(11)), {
      maxResponseBytes: 10,
    }).client;
    await assert.rejects(
      bounded.jobs.result('job_example', { accept: 'text/plain' }),
      lib.ResponseTooLargeError,
    );
  });

  test(`${module}: formatted reads preserve cancellation and timeouts`, async () => {
    const controller = new AbortController();
    const aborted = setup(lib.FlashData, () => reply('unexpected'));
    controller.abort();
    await assert.rejects(
      aborted.client.jobs.result('job_example', {
        accept: 'text/plain',
        signal: controller.signal,
      }),
      lib.RequestAbortedError,
    );
    assert.equal(aborted.calls.length, 0);
    const waiting = setup(
      lib.FlashData,
      (call) =>
        new Promise((_resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Timeout was not forwarded')), 1000);
          call.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(call.signal.reason);
            },
            { once: true },
          );
        }),
    ).client;
    const active = new AbortController();
    const read = waiting.jobs.result('job_example', {
      accept: 'text/plain',
      respondWith: 'markdown',
      signal: active.signal,
    });
    active.abort();
    await assert.rejects(read, lib.RequestAbortedError);
    await assert.rejects(
      waiting.jobs.result('job_example', { accept: 'text/plain', timeoutMs: 5 }),
      lib.RequestTimeoutError,
    );
    const submitted = new AbortController();
    const request = waiting.google.search(
      { query: 'coffee' },
      { accept: 'text/plain', signal: submitted.signal },
    );
    submitted.abort();
    await assert.rejects(request, lib.SubmissionUnknownError);
  });

  test(`${module}: formatting choices do not leak to polling, account, public or bulk calls`, async () => {
    const { client, calls } = setup(lib.FlashData, (call) => {
      if (call.headers.get('accept') === 'text/plain') return reply('Source: "google_search"\n');
      if (/\/(jobs|bulk-jobs)\//.test(call.url.pathname))
        return reply({ job: { id: 'job_example', status: 'completed' } });
      return reply({ status: 'ok', results: [] });
    });
    const options = { accept: 'text/plain', respondWith: 'markdown', timeoutMs: 1000 };
    await client.google.search({ query: 'coffee' }, options);
    await client.jobs.wait('job_example', options);
    await client.account.balance(options);
    await client.public.health(options);
    await client.bulk.get('bulk_example123', options);
    await client.google.search({ query: 'coffee' });
    for (const call of calls.slice(1)) {
      assert.equal(call.headers.get('accept'), 'application/json');
      assert.equal(call.headers.get('x-respond-with'), null);
    }
  });
}
