/** Export bounded Google pages; see search_to_csv.mjs. */
import { main } from './search_to_csv.mjs';
import { isMain, run } from './_support.mjs';
export { main };
if (isMain(import.meta.url)) await run(main);
