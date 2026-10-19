import { FlashData } from '../dist/index.js';
const client = new FlashData();
console.log(await client.queries.batch([
  {source: 'google_search', query: 'FlashData', params: {num: 3}},
  {source: 'youtube_metadata', video_id: 'dQw4w9WgXcQ', params: {include_formats: false}},
]));
