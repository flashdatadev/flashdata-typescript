import { readFile } from "node:fs/promises";
import { FlashData } from "../dist/index.js";
const storage = JSON.parse(await readFile(process.env.FLASHDATA_STORAGE_FILE, "utf8"));
const client = new FlashData();
const receipt = await client.youtube.download({video_id: "dQw4w9WgXcQ", storage, video_quality: "<=720"});
console.log(receipt.id);
