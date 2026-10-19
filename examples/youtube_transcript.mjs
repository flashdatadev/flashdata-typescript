import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.transcript({"video_id": "dQw4w9WgXcQ", "language": "en", "auto": true});
console.log(response);
