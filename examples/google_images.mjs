import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.google.images({"query": "tokyo skyline", "gl": "us", "hl": "en", "num": 50, "page": 1});
console.log(response);
