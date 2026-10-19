/** Read free account access, pricing, balance, limits, and key-scoped usage. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, run, saveJSON } from './_support.mjs';
export async function main(argv = process.argv.slice(2)) {
  const args = command('Account discovery', argv, {}, '');
  if (!args) return;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const response = {
    access: await client.account.access(),
    balance: await client.account.balance(),
    pricing: await client.account.pricing(),
    limits: await client.account.limits(),
    usage: await client.account.usage(),
  };
  console.log('Sources:', response.access.sources.join(', '));
  console.log('Available credits:', response.balance.availableCredits);
  console.log('Limits:', response.limits.limits);
  console.log('Usage:', response.usage.totals);
  await saveJSON(response, args.values.output);
}
if (isMain(import.meta.url)) await run(main);
