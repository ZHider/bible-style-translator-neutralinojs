/**
 * 构建后准备 Neutralinojs 资源目录。
 *
 * 1. 从 .next-desktop/ 复制 Next.js 静态导出到 resources/
 * 2. 从 public/ 复制静态文件到 resources/
 * 3. 在 resources/index.html 头部注入 bundle 引用
 */

import { cp, mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const sourceDir = resolve(".next-desktop");
const publicDir = resolve("public");
const resourcesDir = resolve("resources");

async function ensureDirectory(dir) {
  try {
    await stat(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

async function copyDirectory(source, target) {
  try {
    await stat(source);
  } catch {
    return;
  }
  await ensureDirectory(target);
  await cp(source, target, { recursive: true, force: true });
}

async function collectHtmlFiles(dir) {
  const files = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(".html")) {
        files.push(full);
      }
    }
  }
  await walk(dir);
  return files;
}

async function prepare() {
  // 1. 确保 resources 目录存在
  await ensureDirectory(resourcesDir);

  // 2. 复制 Next.js 静态导出 (SPA + _next/static)
  const spaDir = resolve(sourceDir);
  try {
    await stat(spaDir);
    // 复制完整的静态导出目录内容
    await copyDirectory(spaDir, resourcesDir);
    console.log(`Copied static export from ${spaDir} to ${resourcesDir}`);
  } catch {
    console.warn(`Static export directory not found: ${spaDir}`);
    console.warn("Did you run 'npx next build --config next.desktop.config.ts' first?");
  }

  // 3. 复制 public/ 目录内容（覆盖合并 images/, downloads/ 等）
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
    console.log(`Merged public/ assets into ${resourcesDir}`);
  } catch {
    // public/ might not exist
  }

  // 4. 确保 index.html 中存在 viewport meta（Neutralinojs 需要）
  const indexPath = resolve(resourcesDir, "index.html");
  try {
    let html = await readFile(indexPath, "utf8");
    if (!html.includes('name="viewport"')) {
      html = html.replace(
        "<head>",
        '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      );
      await writeFile(indexPath, html, "utf8");
      console.log("Added viewport meta to index.html");
    }

    // 确保 Neutralinojs 的 preload 脚本存在
    if (!html.includes("neutralino.js")) {
      html = html.replace(
        "</body>",
        '  <script src="neutralino.js"></script>\n</body>',
      );
      await writeFile(indexPath, html, "utf8");
      console.log("Added neutralino.js preload script to index.html");
    }
  } catch {
    console.warn("index.html not found in resources");
  }

  console.log("Neutralinojs resources prepared successfully.");
}

prepare().catch((error) => {
  console.error("Failed to prepare Neutralinojs resources:", error);
  process.exitCode = 1;
});
