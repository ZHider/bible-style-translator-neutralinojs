import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const standaloneDirectory = resolve(".next/standalone");
const standaloneNextDirectory = resolve(standaloneDirectory, ".next");

await mkdir(standaloneNextDirectory, { recursive: true });
await cp(resolve(".next/static"), resolve(standaloneNextDirectory, "static"), {
  recursive: true,
  force: true,
});
await cp(resolve("public"), resolve(standaloneDirectory, "public"), {
  recursive: true,
  force: true,
});
await cp(
  resolve(standaloneDirectory, "node_modules"),
  resolve(standaloneDirectory, "server_modules"),
  {
    recursive: true,
    force: true,
  },
);

console.log("Prepared the Next.js standalone server for the desktop app.");
