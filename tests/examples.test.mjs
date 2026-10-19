import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, readdir, access, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { transformSync } from 'esbuild';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const mock = pathToFileURL(join(root, 'tests/mock-fetch.mjs')).href;
const dist = pathToFileURL(join(root, 'dist/index.js')).href;
const fixtures = JSON.parse(
  await readFile(join(root, 'tests/fixtures/source-examples.json'), 'utf8'),
);
const scripts = (await readdir(join(root, 'examples'))).filter(
  (name) => /\.(mjs|cjs)$/.test(name) && !name.startsWith('_'),
);
const env = { ...process.env, FLASHDATA_API_KEY: 'offline-example-key' };

async function sandbox(run) {
  const directory = await mkdtemp(join(tmpdir(), 'flashdata-example-'));
  try {
    await writeFile(join(directory, 'video-ids.txt'), 'dQw4w9WgXcQ\n');
    const storage = join(directory, 'private-storage.json');
    await writeFile(storage, JSON.stringify(fixtures.youtube_download.request.params.storage));
    return await run(directory, { ...env, FLASHDATA_STORAGE_FILE: storage });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
function execute(name, args, directory, environment) {
  return execFileSync(process.execPath, ['--import', mock, join(root, 'examples', name), ...args], {
    cwd: directory,
    env: environment,
    encoding: 'utf8',
    timeout: 15000,
  });
}
for (const source of Object.keys(fixtures))
  test(`${source} CLI exports a source-shaped response`, () =>
    sandbox(async (directory, environment) => {
      const output = join(directory, 'result.json');
      assert(execute(source + '.mjs', ['--output', output], directory, environment).trim());
      const response = JSON.parse(await readFile(output, 'utf8'));
      assert.equal(response.source, source);
    }));

for (const script of scripts) {
  test(`${script} help and imports never use network`, () =>
    sandbox(async (directory, environment) => {
      const noNetwork = { ...environment, FLASHDATA_TEST_NO_NETWORK: '1', FLASHDATA_API_KEY: '' };
      assert(execute(script, ['--help'], directory, noNetwork).includes('Usage:'));
      execFileSync(
        process.execPath,
        [
          '--import',
          mock,
          '--input-type=module',
          '--eval',
          `await import(${JSON.stringify(pathToFileURL(join(root, 'examples', script)).href)});`,
        ],
        { cwd: directory, env: noNetwork, encoding: 'utf8', timeout: 15000 },
      );
    }));
}
test('typed CLI runs offline, supports help and does not start work on import', () =>
  sandbox(async (directory, environment) => {
    const source = await readFile(join(root, 'examples/typed.ts'), 'utf8');
    assertExplicitKey(source, 'typed.ts');
    const file = join(directory, 'typed.mjs');
    await writeFile(
      file,
      transformSync(source.replaceAll("'@flashdata-dev/sdk'", JSON.stringify(dist)), {
        loader: 'ts',
        format: 'esm',
        target: 'node22',
      }).code,
    );
    const invoke = (args, env) =>
      execFileSync(process.execPath, ['--import', mock, ...args], {
        cwd: directory,
        env,
        encoding: 'utf8',
        timeout: 15000,
      });
    assert(invoke([file, 'coffee', '--background'], environment).includes('Save this job ID:'));
    const noNetwork = { ...environment, FLASHDATA_TEST_NO_NETWORK: '1', FLASHDATA_API_KEY: '' };
    assert(invoke([file, '--help'], noNetwork).includes('Typed search example:'));
    invoke(
      [
        '--input-type=module',
        '--eval',
        `await import(${JSON.stringify(pathToFileURL(file).href)});`,
      ],
      noNetwork,
    );
  }));
for (const [script, args] of [
  ['account.mjs', []],
  ['discovery.mjs', []],
  ['async_query.mjs', ['coffee']],
  ['batch.mjs', ['--wait']],
  ['concurrent_search.mjs', ['coffee', 'tea']],
  ['bulk.mjs', ['video-ids.txt']],
  ['bulk_download.mjs', ['video-ids.txt']],
  ['commonjs.cjs', ['coffee']],
  ['search_to_csv.mjs', ['coffee']],
  ['pagination.mjs', ['coffee']],
])
  test(`${script} workflow completes and exports results`, () =>
    sandbox(async (directory, environment) => {
      const extension = script.includes('bulk')
        ? 'ndjson'
        : script === 'pagination.mjs' || script === 'search_to_csv.mjs'
          ? 'csv'
          : 'json';
      const path = join(directory, 'output.' + extension);
      assert(execute(script, [...args, '--output', path], directory, environment).trim());
      const value = await readFile(path, 'utf8');
      assert(value.trim());
      if (extension === 'json') JSON.parse(value);
      if (extension === 'ndjson') {
        const rows = value.trim().split('\n').map(JSON.parse);
        assert.equal(rows[0].status, 'completed');
        assert.equal(JSON.parse(await readFile(path + '.job.json', 'utf8')).id, 'bulk_example123');
      }
      if (extension === 'csv') {
        const lines = value.trim().split('\n');
        assert(lines[0].includes('page,position,title,link,snippet'));
        assert.equal(new Set(lines.slice(1)).size, lines.length - 1);
      }
    }));
for (const script of ['bulk.mjs', 'bulk_download.mjs'])
  test(`${script} preserves exported rows on item failure`, () =>
    sandbox(async (directory, environment) => {
      const path = join(directory, 'partial.ndjson');
      const result = spawnSync(
        process.execPath,
        ['--import', mock, join(root, 'examples', script), 'video-ids.txt', '--output', path],
        {
          cwd: directory,
          env: { ...environment, FLASHDATA_TEST_FAILED_BULK: '1' },
          encoding: 'utf8',
        },
      );
      assert.equal(result.status, 1);
      assert.equal(JSON.parse((await readFile(path, 'utf8')).trim()).status, 'failed');
    }));
for (const [script, flag, id] of [
  ['async_query.mjs', '--job-id', 'job_example123'],
  ['bulk.mjs', '--bulk-id', 'bulk_example123'],
  ['bulk_download.mjs', '--bulk-id', 'bulk_example123'],
])
  test(`${script} resumes a saved ID`, () =>
    sandbox(async (directory, environment) => {
      assert(
        execute(
          script,
          [flag, id, '--output', join(directory, script + '.json')],
          directory,
          environment,
        ).trim(),
      );
    }));

async function markdown(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '_build') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await markdown(path)));
    else if (entry.name.endsWith('.md')) paths.push(path);
  }
  return paths;
}
const pages = [
  join(root, 'README.md'),
  join(root, 'README.zh-CN.md'),
  join(root, 'CONTRIBUTING.md'),
  join(root, 'examples/README.md'),
  ...(await markdown(join(root, 'docs'))),
];
function checkTypes(code, label) {
  const filename = join(root, '.test-output', label.replace(/[^a-z0-9]/gi, '_') + '.mts');
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
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (path, languageVersion, ...rest) =>
    resolve(path) === resolve(filename)
      ? ts.createSourceFile(path, code, languageVersion, true)
      : original(path, languageVersion, ...rest);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host));
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n',
    }),
  );
}
let blockCount = 0;
for (const page of pages) {
  const text = await readFile(page, 'utf8');
  const blocks = [...text.matchAll(/```(javascript|typescript)\n([\s\S]*?)```/g)];
  for (const [index, match] of blocks.entries()) {
    blockCount++;
    test(`executable documentation ${page.slice(root.length)}:${index}`, () =>
      sandbox(async (directory, environment) => {
        const code = match[2];
        assertExplicitKey(code, page);
        if (match[1] === 'typescript') checkTypes(code, page + index);
        const commonjs = /\brequire\(/.test(code);
        const rewritten = commonjs
          ? code.replaceAll("'@flashdata-dev/sdk'", JSON.stringify(join(root, 'dist/index.cjs')))
          : code.replaceAll("'@flashdata-dev/sdk'", JSON.stringify(dist));
        const executable =
          match[1] === 'typescript'
            ? transformSync(rewritten, { loader: 'ts', format: 'esm', target: 'node22' }).code
            : rewritten;
        const file = join(directory, commonjs ? 'snippet.cjs' : 'snippet.mjs');
        await writeFile(file, executable);
        execFileSync(process.execPath, ['--import', mock, file], {
          cwd: directory,
          env: environment,
          encoding: 'utf8',
          timeout: 15000,
        });
      }));
  }
}
function assertExplicitKey(code, label) {
  const source = ts.createSourceFile(label, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isNewExpression(node) && node.expression.getText(source) === 'FlashData') {
      const options = node.arguments?.[0];
      assert(options && ts.isObjectLiteralExpression(options), label);
      assert(
        options.properties.some((prop) => prop.name?.getText(source) === 'apiKey'),
        label,
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
for (const script of ['bulk.mjs', 'bulk_download.mjs', 'async_query.mjs'])
  test(`${script} rejects invalid wait options before sending work`, () =>
    sandbox(async (directory, environment) => {
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          mock,
          join(root, 'examples', script),
          'video-ids.txt',
          '--wait-timeout-ms',
          '0',
        ],
        {
          cwd: directory,
          env: { ...environment, FLASHDATA_TEST_NO_NETWORK: '1' },
          encoding: 'utf8',
        },
      );
      assert.equal(result.status, 1);
      assert(result.stderr.includes('--wait-timeout-ms must be an integer'));
    }));

test('concurrent searches export successes and structured errors before failing', () =>
  sandbox(async (directory, environment) => {
    const output = join(directory, 'partial.json');
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        mock,
        join(root, 'examples/concurrent_search.mjs'),
        'coffee',
        'flashdata_test_failure',
        'tea',
        '--output',
        output,
      ],
      { cwd: directory, env: environment, encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    const rows = JSON.parse(await readFile(output, 'utf8'));
    assert(rows[0].response && rows[2].response);
    assert.equal(rows[1].error.requestId, 'request-1');
    assert.equal(rows[1].error.statusCode, 429);
  }));

test('all documentation links and source parameters are covered', async () => {
  for (const page of pages) {
    const text = await readFile(page, 'utf8');
    assert(text.includes('[FlashData](https://flashdata.dev)'), page);
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^[a-z]+:/.test(target) || target.startsWith('#')) continue;
      await access(resolve(dirname(page), target.split('#')[0]));
    }
  }
  const schemas = JSON.parse(await readFile(join(root, 'src/schemas.json'), 'utf8'));
  assert.equal(Object.keys(schemas).length, 15);
  for (const [source, schema] of Object.entries(schemas)) {
    const page = await readFile(join(root, 'docs/sources', source + '.md'), 'utf8');
    for (const field of Object.keys(schema.properties.params?.properties ?? {}))
      assert(page.includes('`' + field + '`'), source + ':' + field);
  }
  for (const script of scripts)
    assertExplicitKey(await readFile(join(root, 'examples', script), 'utf8'), script);
  assert(blockCount >= 25);
});
