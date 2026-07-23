import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve(".next/server/app/index.html");
const destination = resolve(".open-next/assets/index.html");
const cssDirectory = resolve(".open-next/assets/_next/static/css");

await stat(source);
await stat(resolve(".open-next/assets"));
await stat(cssDirectory);

const cssFiles = (await readdir(cssDirectory))
  .filter((name) => name.endsWith(".css"))
  .sort();

if (cssFiles.length === 0) {
  throw new Error("No generated stylesheet was found for the Cloudflare homepage.");
}

let html = await readFile(source, "utf8");
const stylesheetLinks = cssFiles
  .map((name) => `/_next/static/css/${name}`)
  .filter((href) => !html.includes(`href="${href}"`))
  .map(
    (href) =>
      `<link rel="stylesheet" href="${href}" data-precedence="next"/>`,
  )
  .join("");

if (stylesheetLinks) {
  html = html.replace("</head>", `${stylesheetLinks}</head>`);
}

await writeFile(destination, html, "utf8");

console.log(
  `Prepared the prerendered homepage with ${cssFiles.length} stylesheet(s) for Cloudflare static assets.`,
);
