import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  KJV_SYSTEM_PROMPT,
  SIGAO_SYSTEM_PROMPT,
  buildEditionPrompt,
} from "../lib/prompt.ts";

test("Sigao and KJV use independent style instructions", () => {
  assert.match(SIGAO_SYSTEM_PROMPT, /思高译本式|欧化语序/);
  assert.match(KJV_SYSTEM_PROMPT, /thou\/thee\/thy|King James/);
  assert.match(buildEditionPrompt("祝你的代码运行顺利", "kjv", "Target 8-20 English words."), /complete result in English/);
});

test("page exposes three edition switches and sends edition to the API", async () => {
  const page = await readFile(path.join(process.cwd(), "app/page.tsx"), "utf8");
  assert.match(page, /和合本译腔/);
  assert.match(page, /思高译腔/);
  assert.match(page, /KJV English/);
  assert.match(page, /edition,/);
  assert.match(page, /STORAGE_KEYS/);
  assert.match(page, /api-model-input/);
  assert.match(page, /model: apiModel \|\| undefined/);
});
