import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.google.news({"query": "renewable energy", "gl": "us", "hl": "en", "num": 10, "page": 1});
console.log(response);
