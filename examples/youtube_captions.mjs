import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.captions({"video_id": "dQw4w9WgXcQ", "language": "en", "auto": false});
console.log(response);
