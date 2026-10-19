import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.suggestions({"query": "python", "language": "en", "region": "us"});
console.log(response);
