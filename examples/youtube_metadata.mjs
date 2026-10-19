import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.metadata({"video_id": "dQw4w9WgXcQ", "include_formats": false, "include_chapters": true});
console.log(response);
