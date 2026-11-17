import test from 'node:test';
import assert from 'node:assert/strict';
import { FlashData, APIError, ValidationError } from '../dist/index.js';

const TOKEN = 'fixture-temporary-session-token';
const storage = (provider = 's3') => ({
  storage_type: provider,
  storage_url: 'bucket',
  access_key: 'temp-key',
  secret_key: 'temp-secret',
  session_token: TOKEN,
});
const response = (data, status = 200) => new Response(JSON.stringify(data), { status });

for (const provider of ['s3', 's3_compatible', 'oss', 'cos', 'bos', 'tos']) {
  test(`temporary ${provider} credentials reach downloads, batches and bulk delivery`, async () => {
    const seen = [];
    const client = new FlashData({
      apiKey: 'test-key',
      fetch: async (_url, init) => {
        seen.push(JSON.parse(init.body));
        return response(
          init.method === 'PATCH'
            ? { job: { id: 'bulk_example123', status: 'paused' } }
            : { id: 'job_example123' },
        );
      },
    });
    const credentials = storage(provider);
    await client.youtube.download({ video_id: 'dQw4w9WgXcQ', storage: credentials });
    await client.queries.batch([
      { source: 'youtube_download', video_id: 'dQw4w9WgXcQ', params: { storage: credentials } },
    ]);
    await client.bulk.create({ source: 'youtube_download', options: { storage: credentials } });
    await client.bulk.create({
      source: 'youtube_metadata',
      options: { result_storage: credentials },
    });
    await client.bulk.update('bulk_example123', {
      options: {
        result_storage: { access_key: 'temp-key', secret_key: 'temp-secret', session_token: TOKEN },
      },
    });
    assert.deepEqual(seen[0].params.storage, credentials);
    assert.deepEqual(seen[1].queries[0].params.storage, credentials);
    assert.deepEqual(seen[2].options.storage, credentials);
    assert.deepEqual(seen[3].options.result_storage, credentials);
    assert.equal(seen[4].options.result_storage.session_token, TOKEN);
  });
}

test('invalid session tokens are rejected before submission', async () => {
  const client = new FlashData({
    apiKey: 'test-key',
    fetch: async () => assert.fail('must not submit'),
  });
  for (const token of ['', 42, 'x'.repeat(16385)]) {
    assert.throws(
      () =>
        client.youtube.download({
          video_id: 'dQw4w9WgXcQ',
          storage: { ...storage(), session_token: token },
        }),
      ValidationError,
    );
  }
});

test('session tokens are redacted in structured errors and echoed messages', async () => {
  const client = new FlashData({
    apiKey: 'test-key',
    fetch: async () =>
      response({ code: 'expired_token', detail: `Expired ${TOKEN}`, session_token: TOKEN }, 403),
  });
  await assert.rejects(
    () => client.youtube.download({ video_id: 'dQw4w9WgXcQ', storage: storage() }),
    (error) => {
      assert.ok(error instanceof APIError);
      assert.ok(!String(error).includes(TOKEN));
      assert.ok(!JSON.stringify(error).includes(TOKEN));
      return true;
    },
  );
});
