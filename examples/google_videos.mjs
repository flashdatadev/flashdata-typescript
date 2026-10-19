import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.google.videos({"query": "me at the zoo", "gl": "us", "hl": "en", "num": 10, "page": 1});
console.log(response);
