/**
 * 构建后准备 Neutralinojs 资源目录。
 */
import { createWriteStream } from "node:fs";
import { cp, mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { get } from "node:https";
import { resolve } from "node:path";

const NEUTRALINOJS_VERSION = "v6.9.0";
const NEUTRALINOJS_CLIENT_URL =
  `https://github.com/neutralinojs/neutralino.js/releases/download/${NEUTRALINOJS_VERSION}/neutralino.js`;

const sourceDir = resolve(".next-desktop");
const publicDir = resolve("public");
const resourcesDir = resolve("resources");

async function ensureDirectory(dir) {
  try { await stat(dir); } catch { await mkdir(dir, { recursive: true }); }
}

async function copyDirectory(source, target) {
  try { await stat(source); } catch { return; }
  await ensureDirectory(target);
  await cp(source, target, { recursive: true, force: true });
}

async function downloadNeutralinoJs(targetPath) {
  try {
    await stat(targetPath);
    return; // already exists
  } catch { /* download */ }
  console.log(`Downloading neutralino.js v${NEUTRALINOJS_VERSION}...`);
  await new Promise((resolve, reject) => {
    get(NEUTRALINOJS_CLIENT_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }
      const file = createWriteStream(targetPath);
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

async function prepare() {
  await ensureDirectory(resourcesDir);

  // 1. 复制 Next.js 静态导出
  try {
    await stat(sourceDir);
    await copyDirectory(sourceDir, resourcesDir);
    console.log(`Copied static export from ${sourceDir}`);
  } catch {
    console.warn(`Static export not found: ${sourceDir}`);
    console.warn("Run 'cross-env NEXT_PUBLIC_DESKTOP=true next build' first");
  }

  // 2. 合并 public/ 资源
  try {
    const publicEntries = await readdir(publicDir, { withFileTypes: true });
    for (const entry of publicEntries) {
      const sourcePath = resolve(publicDir, entry.name);
      const targetPath = resolve(resourcesDir, entry.name);
      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, targetPath);
      } else if (entry.name !== "_headers") {
        await cp(sourcePath, targetPath, { force: true });
      }
    }
  } catch { /* public/ may not exist */ }

  // 3. 下载 neutralino.js（Neutralinojs 客户端库）
  await downloadNeutralinoJs(resolve(resourcesDir, "neutralino.js"));

  // 4. 注入 viewport meta
  const indexPath = resolve(resourcesDir, "index.html");
  try {
    let html = await readFile(indexPath, "utf8");
    if (!html.includes('name="viewport"')) {
      html = html.replace(
        "<head>",
        '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      );
      await writeFile(indexPath, html, "utf8");
    }
    if (!html.includes("neutralino.js")) {
      html = html.replace(
        "</body>",
        '  <script src="neutralino.js"></script>\n</body>',
      );
      await writeFile(indexPath, html, "utf8");
    }
  } catch { console.warn("index.html not found in resources"); }

  console.log("Neutralinojs resources prepared successfully.");
}

prepare().catch((error) => {
  console.error("Failed to prepare Neutralinojs resources:", error);
  process.exitCode = 1;
});
