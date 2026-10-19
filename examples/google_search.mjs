import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.google.search({"query": "openai", "gl": "us", "hl": "en", "num": 10, "page": 1});
console.log(response);
