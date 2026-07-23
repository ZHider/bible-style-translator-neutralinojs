import { copyFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve(".next/server/app/index.html");
const destination = resolve(".open-next/assets/index.html");

await stat(source);
await stat(resolve(".open-next/assets"));
await copyFile(source, destination);

console.log("Prepared the prerendered homepage for Cloudflare static assets.");
