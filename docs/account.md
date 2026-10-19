# Account and public discovery

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
console.log(await client.account.access());
console.log(await client.account.balance());
console.log(await client.account.pricing({source: "google_search", request_count: 10}));
console.log(await client.account.limits());
console.log(await client.account.usage({source: "google_search", from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z"}));
```

These reads spend no query Credits. Access/balance/pricing/limits share the server's
120 reads/minute per client IP limit. Usage has its own limit and freshness information.
Responses are scoped to the key's authorized sources. Balance, pricing and limits are
snapshots, not an admission reservation. Pricing uses request counts, not result counts;
Extended Search has a separate rate and downloads expose a per-TB rate.

`public.sources`, `public.plans`, `public.status` and `public.health` omit the key header.
Public discovery can be used through a client configured with a key placeholder, while
normal authenticated methods require a valid FlashData key. Key creation, checkout,
login/session and admin functions remain console operations; these SDKs cover the
developer API-key contract, not browser-cookie workflows.
