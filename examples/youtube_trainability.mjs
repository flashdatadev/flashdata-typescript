import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.licenseCheck({"video_id": "dQw4w9WgXcQ"});
console.log(response);
