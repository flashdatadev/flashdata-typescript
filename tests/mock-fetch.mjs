import { readFile } from 'node:fs/promises';
const fixtures = JSON.parse(await readFile(new URL('./fixtures/source-examples.json', import.meta.url),'utf8'));
process.env.FLASHDATA_API_KEY = 'offline-example-key';
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.origin !== 'https://data.flashdata.dev') throw new Error('Unexpected external request in an example.');
  const query = JSON.parse(init.body);
  if (!fixtures[query.source]) throw new Error('Unknown source in example.');
  return Response.json(fixtures[query.source].response);
};
