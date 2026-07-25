import assert from "node:assert/strict";
import test from "node:test";
import {
  assessScriptureLength,
  getScriptureLengthTarget,
  structureTokenBudget,
} from "../lib/scriptureLength.ts";

test("length controls compress, preserve, and expand by user choice", () => {
  const source = "小周把方案交给主管，主管看后要求他明日重做；小周答应以后回到座位修改。";
  const light = getScriptureLengthTarget(source, "story", "light", "cuv");
  const standard = getScriptureLengthTarget(source, "story", "standard", "cuv");
  const grand = getScriptureLengthTarget(source, "story", "grand", "cuv");
  assert.ok(light.ideal < standard.ideal);
  assert.ok(standard.ideal < grand.ideal);
  assert.equal(assessScriptureLength("短句。", grand, "cuv").acceptable, false);
});

test("structured token budgets are smaller for short non-stories", () => {
  assert.ok(
    structureTokenBudget("祝你的代码运行顺利", "aphorism", "standard") <
      structureTokenBudget("甲来到屋里。".repeat(120), "story", "grand"),
  );
});
