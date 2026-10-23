import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import ts from 'typescript';

test('TypeScript rejects invalid modes, formats, callbacks and option typos for every source', async () => {
  const fixtures = JSON.parse(
    await readFile(new URL('./fixtures/source-examples.json', import.meta.url), 'utf8'),
  );
  const lines = [
    "import {FlashData,type SourceRequestOptions} from '@flashdata-dev/sdk';",
    "const client=new FlashData({apiKey:'type-test-key'});",
  ];
  for (const source of Object.keys(fixtures)) {
    const [group, ...parts] = source.split('_');
    const method =
      source === 'youtube_trainability'
        ? 'licenseCheck'
        : parts.map((p, i) => (i ? p[0].toUpperCase() + p.slice(1) : p)).join('');
    const input =
      source.startsWith('google_') || /search|suggestions/.test(source)
        ? { query: 'coffee' }
        : source === 'youtube_channel'
          ? { handle: '@example' }
          : { video_id: 'dQw4w9WgXcQ' };
    if (source === 'youtube_download')
      input.storage = { storage_type: 's3', storage_url: 'bucket' };
    const invalid =
      source === 'youtube_download'
        ? ["{respondWith:'markdown'}", "{mode:'realtime'}"]
        : [
            "{mode:'async',respondWith:'markdown'}",
            "{mode:'async',accept:'text/plain',respondWith:'markdown'}",
            "{callback_url:'https://callback.example/done'}",
            "{mode:'realtime',accept:'text/plain',callback_url:'https://callback.example/done'}",
            "{accept:'text/html'}",
            "{accept:'text/plain',respond_with:'markdown'}",
          ];
    for (const options of invalid)
      lines.push(
        '// @ts-expect-error unsupported options',
        `void client.${group}.${method}(${JSON.stringify(input)},${options});`,
      );
  }
  for (const call of [
    "client.queries.submit({source:'google_search',query:'coffee'},{respondWith:'markdown'})",
    "client.queries.batch([{source:'google_search',query:'coffee'}],{respondWith:'markdown'})",
    "client.jobs.get('job_example',{respondWith:'markdown'})",
    "client.jobs.result('job_example',{accept:'text/plain',respond_with:'markdown'})",
  ])
    lines.push('// @ts-expect-error unsupported options', `void ${call};`);
  lines.push(
    '// @ts-expect-error incompatible mode and representation',
    "const invalid:SourceRequestOptions={mode:'async',respondWith:'markdown'};",
    'void invalid;',
  );
  const filename = fileURLToPath(new URL('./__format_consumer__.mts', import.meta.url));
  const options = {
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: ['node'],
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (path, languageVersion, ...rest) =>
    resolve(path) === resolve(filename)
      ? ts.createSourceFile(path, lines.join('\n'), languageVersion, true)
      : getSourceFile(path, languageVersion, ...rest);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host));
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (n) => n,
      getNewLine: () => '\n',
    }),
  );
});
