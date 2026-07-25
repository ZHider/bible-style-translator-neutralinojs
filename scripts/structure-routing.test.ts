import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { buildSkeletonIdentificationPrompt } from "../lib/scriptureSkeletons.ts";
import { classifyScriptureSource } from "../lib/scriptureGenre.ts";

test("short factual text uses a compact planning schema", () => {
  const prompt = buildSkeletonIdentificationPrompt("代码正在运行。", [], "light");
  assert.match(prompt, /只保留一个核心 unit/);
  assert.doesNotMatch(prompt, /paired_dominance|death_threat|trade_price/);
});

test("long event sequences are routed as stories even without quotation marks", () => {
  const source =
    "项目上线以前，小周带着测试记录来到会议室，把昨日发现的问题交给主管。主管看完以后，叫开发、设计和运营一同坐下。" +
    "开发说接口偶尔超时，主管就叫他保存日志，再查明数据库连接。设计发现按钮被图片遮住，小周便重新检查层级。" +
    "到了中午，众人完成第一轮修正。小周重新运行测试，又发现借款人与收款人的方向被颠倒，于是没有交出结果。" +
    "主管吩咐众人继续修改。傍晚以前，众人又检查三个版本；小周把报告交给主管，主管看见问题已经修好，就准许项目进入下一步。";
  assert.equal(classifyScriptureSource(source), "story");
  const prompt = buildSkeletonIdentificationPrompt(source, [], "standard");
  assert.match(prompt, /人物故事/);
  assert.match(prompt, /7—14 个 unit/);
  assert.doesNotMatch(prompt, /12—36 个 unit/);
  assert.match(prompt, /不要重复输出空字符串字段/);
});

test("route grounds plans before assessment and performs at most one repair", async () => {
  const route = await readFile(path.join(process.cwd(), "app/api/translate/route.ts"), "utf8");
  assert.match(route, /groundScriptureSkeletonPlan\(parsedPlan, text\)[\s\S]*assessScriptureStoryPlan\(groundedPlan, text\)/);
  assert.match(route, /attempt < 2/);
  assert.match(route, /jsonObject: true/);
});
