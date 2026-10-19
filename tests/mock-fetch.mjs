/** Preloaded into isolated example/doc processes. No external network is allowed. */
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const fixtures = JSON.parse(
  await readFile(new URL('./fixtures/source-examples.json', import.meta.url), 'utf8'),
);
const jobs = new Map();
const bulkId = 'bulk_example123';
const origin = 'https://results.example';
const json = (value, status = 200) => Response.json(value, { status });
globalThis.fetch = async (input, init = {}) => {
  if (process.env.FLASHDATA_TEST_NO_NETWORK === '1')
    throw new Error('Network work occurred during help/import.');
  const url = new URL(String(input));
  const path = url.pathname;
  if (url.origin === origin) {
    if (new Headers(init.headers).has('x-api-key')) throw new Error('API key reached storage.');
    if (init.method === 'PUT') {
      let bytes = 0;
      for await (const chunk of init.body) bytes += chunk.length;
      if (!bytes) throw new Error('Empty input upload');
      return new Response(null, { status: 200 });
    }
    if (path === '/manifest')
      return json({ parts: [{ number: 0 }], expires_at: '2100-01-01T00:00:00Z' });
    if (path === '/part') {
      const row = {
        index: 0,
        job_id: 'job_example123',
        source: 'youtube_metadata',
        status: process.env.FLASHDATA_TEST_FAILED_BULK ? 'failed' : 'completed',
        video_id: 'dQw4w9WgXcQ',
        results: [{ title: 'Example video' }],
      };
      return new Response(gzipSync(JSON.stringify(row) + '\n'));
    }
    const id = path.split('/').at(-1);
    const source = jobs.get(id) ?? 'google_search';
    return json({
      source,
      results: fixtures[source].response.results ?? [],
      ...(source === 'youtube_download' ? {} : { usage: fixtures[source].response.usage }),
      id,
      status: 'completed',
      completed_at: '2026-10-20T00:00:00Z',
      expires_at: '2026-10-21T00:00:00Z',
    });
  }
  if (!['https://api.flashdata.dev', 'https://data.flashdata.dev'].includes(url.origin))
    throw new Error('Unexpected external origin.');
  if (path.startsWith('/v1/')) {
    const query = JSON.parse(init.body);
    if (query.query === 'flashdata_test_failure')
      return json({ message: 'Limited', code: 'limited', requestId: 'request-1' }, 429);
    if (path.endsWith('/realtime')) return json(fixtures[query.source].response);
    if (path.endsWith('/batch'))
      return json({
        queries: query.queries.map((item, index) => {
          const id = `job_example${index}`;
          jobs.set(id, item.source);
          return { id, source: item.source, status: 'pending', usage: { credits: 0.01 } };
        }),
        total_credits: 0.02,
        usage: { credits: 0.02 },
      });
    const id = 'job_example123';
    jobs.set(id, query.source);
    return json({ id, source: query.source, status: 'pending', usage: { credits: 0.01 } });
  }
  if (path.endsWith('/api-access'))
    return json({ sources: Object.keys(fixtures), result_origin: origin });
  if (path.endsWith('/balance')) return json({ availableCredits: 100 });
  if (path.endsWith('/pricing')) return json({ prices: [] });
  if (path.endsWith('/limits')) return json({ limits: { batchSize: 100, concurrency: 5 } });
  if (path.endsWith('/usage')) return json({ totals: {} });
  if (path.endsWith('/catalog/sources'))
    return json({ data: Object.keys(fixtures).map((id) => ({ id })) });
  if (path.endsWith('/health') || path.endsWith('/status')) return json({ status: 'healthy' });
  if (path.endsWith('/plans')) return json({ currency: 'USD', data: [] });
  if (path.includes('/jobs/')) {
    const id = path.endsWith('/results') ? path.split('/').at(-2) : path.split('/').at(-1);
    if (path.endsWith('/results'))
      return new Response(null, { status: 302, headers: { location: origin + '/job/' + id } });
    return json({ job: { id, status: 'completed' } });
  }
  if (path.includes('/bulk-jobs')) {
    const job = {
      id: bulkId,
      source: 'youtube_metadata',
      status: 'completed',
      counts: {
        accepted: 1,
        completed: process.env.FLASHDATA_TEST_FAILED_BULK ? 0 : 1,
        failed: process.env.FLASHDATA_TEST_FAILED_BULK ? 1 : 0,
        invalid: 0,
        results: 1,
      },
    };
    if (path === '/v2/bulk-jobs' && init.method === 'POST')
      return json({
        job,
        upload: {
          method: 'PUT',
          contentType: 'text/plain; charset=utf-8',
          href: origin + '/input',
          expiresAt: '2100-01-01T00:00:00Z',
        },
      });
    if (path.endsWith('/results'))
      return new Response(null, { status: 302, headers: { location: origin + '/manifest' } });
    if (path.includes('/results/'))
      return new Response(null, { status: 302, headers: { location: origin + '/part' } });
    if (path === '/v2/bulk-jobs')
      return json({ data: [job], pagination: { hasMore: false, limit: 20 } });
    return json({ job });
  }
  throw new Error(`Unexpected example endpoint: ${init.method ?? 'GET'} ${path}`);
};
