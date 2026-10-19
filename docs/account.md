# Account, pricing and service discovery

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Read current access and plan limits before scaling. These endpoints are free but rate
limited. Credit balances and plan ceilings are shared by account keys; usage is scoped
to the API key making the request.

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const access = await client.account.access();
const balance = await client.account.balance();
const prices = await client.account.pricing({ source: 'youtube_metadata', request_count: 100 });
const limits = await client.account.limits();
const usage = await client.account.usage({ source: 'youtube_metadata' });
console.log(access.sources, balance.availableCredits, limits.limits);
console.log(prices.prices, usage.totals);
```

Pricing estimates are for calls, rather than returned search hits. `request_count` is
1–100000. Download billing uses actual uploaded bytes, so request count does not estimate
its cost. Query current prices rather than hard-coding examples. `usage` also accepts
ISO 8601 `from` and `to` strings; the server validates the range and totals may lag work.
Concurrency is a ceiling, not currently available slots.

Public discovery needs no key:

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: '' });
console.log((await client.public.sources()).data.map((source) => source.id));
console.log((await client.public.health()).status);
```

`public.plans()` returns public USD plan data; `public.status()` returns components.
Public requests never include the client's key. Authenticated account, job and bulk
requests always require one. Request options are the last argument of each method.
