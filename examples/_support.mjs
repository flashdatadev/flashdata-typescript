/** CLI helpers; applications can use their own configuration and output layer. */
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { APIError } from '@flashdata-dev/sdk';

export const isMain = (url) =>
  Boolean(process.argv[1]) && pathToFileURL(resolve(process.argv[1])).href === url;
export function command(description, argv, options = {}, positional = '[query]', multiple = false) {
  const spec = { help: { type: 'boolean', short: 'h' }, output: { type: 'string' }, ...options };
  const parsed = parseArgs({ args: argv, allowPositionals: true, options: spec });
  if (parsed.values.help) {
    console.log(`${description}\nUsage: node examples/<example>.mjs ${positional} [options]`);
    for (const [name, option] of Object.entries(spec))
      console.log(
        `  --${name}${option.type === 'string' ? ' VALUE' : ''}${option.default !== undefined ? ` (default: ${option.default})` : ''}`,
      );
    return null;
  }
  if (!multiple && parsed.positionals.length > 1)
    throw new Error('Provide only one positional input.');
  return parsed;
}
export function integerOption(value, name, minimum = 1, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum)
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  return number;
}
export async function saveJSON(value, path) {
  if (!path) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
  console.error(`Saved ${path}`);
}
export const reportUsage = (response) =>
  console.error(`Credits: ${response.usage?.credits ?? 'not reported'}`);
export async function run(main) {
  try {
    await main();
  } catch (error) {
    if (error instanceof APIError)
      console.error(
        `API error ${error.statusCode} (${error.code ?? 'no code'}): ${error.message}${error.requestId ? `; request ID: ${error.requestId}` : ''}`,
      );
    else console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}
