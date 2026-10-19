/** CommonJS consumers use require with the same explicit apiKey configuration. */
const { FlashData } = require('@flashdata-dev/sdk');
async function main(argv = process.argv.slice(2)) {
  const { command, saveJSON } = await import('./_support.mjs');
  const args = command('CommonJS search example', argv);
  if (!args) return;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const response = await client.google.search({ query: args.positionals[0] ?? 'coffee', num: 3 });
  for (const payload of response.results)
    for (const hit of payload.organic ?? []) console.log(hit.title ?? '', hit.link ?? '');
  await saveJSON(response, args.values.output);
}
module.exports = { main };
if (require.main === module) import('./_support.mjs').then(({ run }) => run(main));
