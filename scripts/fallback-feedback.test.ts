import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("fallback and best-effort responses are disclosed to the user", async () => {
  const route = await readFile(path.join(process.cwd(), "app/api/translate/route.ts"), "utf8");
  const page = await readFile(path.join(process.cwd(), "app/page.tsx"), "utf8");
  assert.match(route, /generationMode/);
  assert.match(route, /"fallback"/);
  assert.match(route, /warning/);
  assert.match(page, /warning-message/);
  assert.match(page, /payload\.warning/);
});
