/** Type-checkable example; run its JavaScript counterpart with Node. */
import { FlashData, type AsyncQuery, type GoogleSearchParams } from '../dist/index.js';
const client = new FlashData();
const params: GoogleSearchParams = {num: 3, gl: 'us', autocorrect: false};
const response = await client.google.search({query: 'coffee', ...params});
for (const item of response.results[0]?.organic ?? []) console.log(item?.title, item?.link);
const request: AsyncQuery = {source: 'youtube_metadata', video_id: 'dQw4w9WgXcQ', params: {include_formats: false}};
const receipt = await client.queries.submit(request);
console.log(receipt.id);
const asyncReceipt = await client.google.search({query: 'coffee'}, {mode: 'async'});
console.log(asyncReceipt.id);
