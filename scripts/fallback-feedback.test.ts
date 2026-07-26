import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("degraded responses and unrecoverable failures are disclosed to the user", async () => {
  const route = await readFile(path.join(process.cwd(), "app/api/translate/route.ts"), "utf8");
  const page = await readFile(path.join(process.cwd(), "app/page.tsx"), "utf8");
  assert.match(route, /generationMode/);
  assert.match(route, /"best_effort"/);
  assert.match(route, /warning/);
  assert.match(route, /没有返回近似原文的保守稿/);
  assert.doesNotMatch(route, /renderEmergencyScripture/);
  assert.doesNotMatch(route, /\| "fallback"/);
  assert.match(page, /warning-message/);
  assert.match(page, /payload\.warning/);
  assert.match(page, /setResult\(""\);\s*setVerses\(\[\]\);[\s\S]*fetch\("\/api\/translate"/);
  assert.match(page, /catch \(requestError\) \{\s*setResult\(""\);\s*setVerses\(\[\]\);\s*setWarning\(""\);/);
});
