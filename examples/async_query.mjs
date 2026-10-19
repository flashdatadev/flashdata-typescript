import { FlashData } from '../dist/index.js';
const client = new FlashData();
const receipt = await client.queries.submit({source: 'youtube_metadata', video_id: 'dQw4w9WgXcQ'});
console.log('Save this job ID:', receipt.id);
await client.jobs.wait(receipt.id, {timeoutMs: 300000, pollIntervalMs: 2000});
console.log(await client.jobs.result(receipt.id));
