/** Retrieve Google search or a YouTube transcript as JSON, plain text or Markdown. */
import { FlashData, ValidationError } from '@flashdata-dev/sdk';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { command, isMain, run } from './_support.mjs';

export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'Response formats',
    argv,
    {
      accept: { type: 'string', default: 'application/json' },
      'respond-with': { type: 'string' },
      language: { type: 'string', default: 'en' },
      auto: { type: 'boolean', default: false },
    },
    '<google_search|youtube_transcript> <query|video_id>',
    true,
  );
  if (!args) return;
  const { values, positionals } = args;
  if (positionals.length !== 2 || !['google_search', 'youtube_transcript'].includes(positionals[0]))
    throw new ValidationError(
      'Provide a source (google_search or youtube_transcript) and its query or video ID.',
    );
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const options = { accept: values.accept, respondWith: values['respond-with'] };
  const value =
    positionals[0] === 'google_search'
      ? await client.google.search({ query: positionals[1] }, options)
      : await client.youtube.transcript(
          { video_id: positionals[1], language: values.language, auto: values.auto },
          options,
        );
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  process.stdout.write(text.endsWith('\n') ? text : text + '\n');
  if (values.output) {
    await mkdir(dirname(values.output), { recursive: true });
    await writeFile(values.output, text, 'utf8');
  }
}

if (isMain(import.meta.url)) await run(main);
