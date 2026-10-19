/** A complete first search using a simulated fetch. No credentials or network. */
import { FlashData } from '../dist/index.js';
const client = new FlashData({apiKey: 'offline-demo-key', fetch: async () => Response.json({
  source: 'google_search', status: 'done', usage: {credits: 0},
  results: [{organic: [{title: 'FlashData docs', link: 'https://flashdata.dev/docs'}]}],
})});
const result = await client.google.search({query: 'FlashData SDK', num: 1});
console.log(result.results[0].organic[0].link);
