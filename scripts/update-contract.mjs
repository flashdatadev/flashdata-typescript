/** Refresh SDK snapshots and response fixtures from the FlashData API contract. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parseArgs, isDeepStrictEqual } from 'node:util';

const { values } = parseArgs({
  options: {
    openapi: { type: 'string' },
    formatter: { type: 'string' },
    check: { type: 'boolean' },
  },
});
assert(
  values.openapi && values.formatter,
  'Provide --openapi JSON_FILE and --formatter RESPONSE_FORMATTING_JS.',
);
const root = new URL('../', import.meta.url);
const readJSON = async (path) => JSON.parse(await readFile(path, 'utf8'));
const previous = await readJSON(new URL('openapi.json', root));
const source = await readJSON(resolve(values.openapi));
const snapshot = structuredClone(previous);
for (const [path, methods] of Object.entries(snapshot.paths)) {
  for (const method of Object.keys(methods)) {
    const operation = structuredClone(source.paths[path][method]);
    const security = operation.security ?? [];
    operation.security = security.filter(
      (item) => Object.keys(item).length === 1 && item.dataApiKey,
    );
    assert(
      !security.length || operation.security.length,
      `${method} ${path} must support API keys.`,
    );
    methods[method] = operation;
  }
}
snapshot.components = {
  securitySchemes: { dataApiKey: source.components.securitySchemes.dataApiKey },
};
function include(value) {
  if (Array.isArray(value)) return value.forEach(include);
  if (!value || typeof value !== 'object') return;
  if (value.$ref?.startsWith('#/components/')) {
    const [category, name] = value.$ref.slice('#/components/'.length).split('/');
    const bucket = (snapshot.components[category] ??= {});
    if (!(name in bucket)) {
      bucket[name] = structuredClone(source.components[category][name]);
      include(bucket[name]);
    }
  }
  Object.values(value).forEach(include);
}
include(snapshot.paths);
snapshot.components = Object.fromEntries(
  [...new Set([...Object.keys(previous.components), ...Object.keys(snapshot.components)])]
    .filter((category) => category in snapshot.components)
    .map((category) => [
      category,
      Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(previous.components[category] ?? {}),
            ...Object.keys(snapshot.components[category]),
          ]),
        ]
          .filter((name) => name in snapshot.components[category])
          .map((name) => [name, snapshot.components[category][name]]),
      ),
    ]),
);
snapshot.info.description =
  'API-key authenticated data, jobs, bulk collections and account reads, plus public discovery. Includes JSON, plain-text and Markdown response options.';
const formatterPath = resolve(values.formatter);
const formatter = (await readFile(formatterPath, 'utf8')).replaceAll('\r\n', '\n');
const { formatResponse } = createRequire(import.meta.url)(formatterPath);
const examples = await readJSON(new URL('tests/fixtures/source-examples.json', root));
const responseExamples = await readJSON(new URL('tests/fixtures/response-formats.json', root));
for (const example of responseExamples) {
  const original = responseExamples.find(
    (entry) =>
      entry.group === example.group &&
      entry.headers.Accept === 'application/json' &&
      !entry.headers['X-Respond-With'],
  ).response;
  example.response = formatResponse(original, {
    accept: example.headers.Accept,
    representation: example.headers['X-Respond-With'] ?? 'original',
    content: ['google_search', 'youtube_transcript'].includes(example.group),
  });
}
const stored = {};
for (const [source, example] of Object.entries(examples)) {
  const original = {
    id: 'job_fixture0001',
    source,
    status: 'completed',
    results:
      source === 'youtube_download'
        ? [
            {
              file_url: 'https://customer.example/videos/example.mp4',
              downloaded_bytes: 1024,
              file_size: 1024,
              md5: '0123456789abcdef0123456789abcdef',
              videoId: 'dQw4w9WgXcQ',
            },
          ]
        : example.response.results,
    ...(source === 'youtube_download' ? {} : { usage: example.response.usage }),
    completed_at: '2026-10-23T00:00:00Z',
    expires_at: '2026-10-24T00:00:00Z',
  };
  stored[source] = [];
  for (const accept of ['application/json', 'text/plain'])
    for (const respondWith of [undefined, 'markdown'])
      stored[source].push({
        accept,
        respondWith: respondWith ?? null,
        response: formatResponse(original, {
          accept,
          representation: respondWith ?? 'original',
        }),
      });
}
for (const [path, value] of [
  ['openapi.json', snapshot],
  ['tests/fixtures/response-formats.json', responseExamples],
  ['tests/fixtures/stored-result-formats.json', stored],
]) {
  const file = new URL(path, root);
  if (values.check)
    assert(isDeepStrictEqual(await readJSON(file), value), `${path} is out of date.`);
  else await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}
const copy = new URL('tests/fixtures/response-formatting.cjs', root);
if (values.check)
  assert.equal(await readFile(copy, 'utf8'), formatter, 'The test serializer is out of date.');
else await writeFile(copy, formatter);
console.log(
  values.check
    ? 'OpenAPI and response fixtures match the API contract.'
    : 'Updated OpenAPI and response fixtures.',
);
