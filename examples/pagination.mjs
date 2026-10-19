import { FlashData } from '../dist/index.js';
const client = new FlashData();
for await (const response of client.google.pages('google_search', 'coffee', {maxPages: 2, params: {gl: 'us'}})) {
  console.log(response.results);
}
