/** Read public service discovery without credentials. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, run, saveJSON } from './_support.mjs';
export async function main(argv = process.argv.slice(2)) {
  const args = command('Public service discovery', argv, {}, '');
  if (!args) return;
  const client = new FlashData({ apiKey: '' });
  const result = {
    sources: await client.public.sources(),
    health: await client.public.health(),
    status: await client.public.status(),
    plans: await client.public.plans(),
  };
  console.log('Sources:', result.sources.data.map((source) => source.id).join(', '));
  console.log('Health:', result.health.status);
  await saveJSON(result, args.values.output);
}
if (isMain(import.meta.url)) await run(main);
