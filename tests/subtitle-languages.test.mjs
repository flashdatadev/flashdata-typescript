import test from 'node:test';
import assert from 'node:assert/strict';
import { FlashData, ValidationError } from '../dist/index.js';

for (const source of ['youtube_transcript', 'youtube_captions']) {
  test(`${source}: preserves language choices and partial results in every workflow`, async () => {
    for (const language of [undefined, 'en', ['en'], ['en', 'es'], [...'abcdefghij']]) {
      const calls = [];
      const body = {
        source,
        status: 'done',
        results: [
          {
            tracks: [{ languageCode: 'en', fullText: 'Example' }],
            errors: [
              { languageCode: 'es', code: 'language_unavailable', message: 'No Spanish track' },
            ],
          },
        ],
      };
      const client = new FlashData({
        apiKey: 'offline-test',
        fetch: async (_, init) => {
          calls.push(JSON.parse(init.body));
          return new Response(JSON.stringify(body));
        },
      });
      const params = { auto: false, ...(language === undefined ? {} : { language }) };
      const query = { source, video_id: 'aircAruvnKk', params };
      const response = await client.youtube[source.split('_')[1]]({
        video_id: query.video_id,
        ...params,
      });
      assert.deepEqual(response, body);
      await client.queries.submit(query);
      await client.queries.batch([query]);
      await client.bulk.create({ source, options: params });
      assert.deepEqual(calls, [query, query, { queries: [query] }, { source, options: params }]);
    }
  });
  test(`${source}: rejects invalid languages before dispatch`, async () => {
    const client = new FlashData({
      apiKey: 'offline-test',
      fetch: async () => {
        assert.fail('Unexpected HTTP request');
      },
    });
    for (const language of [
      null,
      '',
      'en,es',
      'a'.repeat(36),
      [],
      ['en', 'en'],
      ['en', null],
      [...'abcdefghijk'],
    ]) {
      const query = { source, video_id: 'aircAruvnKk', params: { language } };
      for (const run of [
        () => client.queries.realtime(query),
        () => client.queries.submit(query),
        () => client.queries.batch([query]),
        () => client.bulk.create({ source, options: query.params }),
      ]) {
        await assert.rejects(async () => run(), ValidationError);
      }
    }
    await assert.rejects(
      async () => client.youtube.suggestions({ query: 'hello', language: ['en', 'es'] }),
      ValidationError,
    );
  });
  test(`${source}: all-language errors are returned without retry`, async () => {
    let calls = 0;
    const body = {
      source,
      status: 'done',
      results: [
        {
          tracks: [],
          errors: [{ languageCode: 'en', code: 'retrieval_failed', message: 'Unavailable' }],
        },
      ],
    };
    const client = new FlashData({
      apiKey: 'offline-test',
      fetch: async () => {
        calls++;
        return new Response(JSON.stringify(body));
      },
    });
    assert.deepEqual(
      await client.youtube[source.split('_')[1]]({ video_id: 'aircAruvnKk', language: ['en'] }),
      body,
    );
    assert.equal(calls, 1);
  });
}
