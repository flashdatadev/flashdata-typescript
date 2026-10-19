import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.channel({"handle": "@jawed", "video_limit": 10});
console.log(response);
