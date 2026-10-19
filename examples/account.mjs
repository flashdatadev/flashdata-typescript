import { FlashData } from '../dist/index.js';
const client = new FlashData();
console.log(await client.account.access());
console.log(await client.account.balance());
console.log(await client.account.pricing({source: 'google_search', request_count: 1}));
console.log(await client.account.limits());
