# Pagination

Every Google result page is a separate paid query. The helper requires an explicit
maximum page count, uses sequential requests, and stops after an empty result list.
The first page counts toward that maximum. It adds only the requested page parameter.

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
for await (const response of client.google.pages("google_search", "coffee", {maxPages: 3, params: {gl: "us"}})) {
  console.log(response.results);
}
```

`startPage` defaults to 1. Breaking the loop prevents future page submissions.

Supported sources: all six Google sources. Pages are bounded to the API's range 1–100.
YouTube search uses `max_results` rather than an invented continuation token. Standard
YouTube search requests up to 20 results; Extended Search up to 700, at a separate rate.
Neither guarantees that many results.

Bulk collection listing uses free cursor pagination. Pass the returned `pagination.nextCursor`
to the next `bulk.list` call only when `hasMore` is true. Stop on a missing/repeated cursor.
This is independent of paid Google result pagination.
