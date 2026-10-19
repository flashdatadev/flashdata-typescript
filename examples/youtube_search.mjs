import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.search({"query": "python", "max_results": 20});
console.log(response);
