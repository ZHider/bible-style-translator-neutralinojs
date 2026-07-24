import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyScriptureSource,
  hasForbiddenMoralization,
  isAphorismSource,
  renderDefinitionSource,
} from "../lib/scriptureGenre";
import { renderCuvAphorism } from "../lib/cuvAphorismSkeletons";
import {
  formatScriptureVerses,
  segmentScriptureText,
} from "../lib/scriptureVerses";

const USER_DEFINITION =
  "现代汉民族共同语是以北京语音为标准音，以北方为基础方言，以典范的现代白话文著作为语法规范的普通话。";

test("the reported language definition never enters aphorism mode", () => {
  assert.equal(classifyScriptureSource(USER_DEFINITION), "definition");
  assert.equal(isAphorismSource(USER_DEFINITION), false);
  const output = renderDefinitionSource(USER_DEFINITION);
  assert.match(output, /现代汉民族共同语/u);
  assert.match(output, /普通话/u);
  assert.match(output, /北京语音为标准音/u);
  assert.match(output, /北方为基础方言/u);
  assert.match(output, /现代白话文著作为语法规范/u);
  assert.doesNotMatch(output, /的人有福|有祸|凡.*必/u);
});

test("genre classification separates definitions, notices, instructions, facts, and maxims", () => {
  assert.equal(classifyScriptureSource("通知：会议改到明天下午三点。"), "notice");
  assert.equal(classifyScriptureSource("请点击保存按钮并重启服务。"), "instruction");
  assert.equal(classifyScriptureSource("北京是中国的首都。"), "factual");
  assert.equal(classifyScriptureSource("坚持学习，才能不断取得进步。"), "aphorism");
  assert.equal(classifyScriptureSource("甲进屋以后与乙争论，随后转身离开。"), "story");
});

test("neutral factual text rejects invented blessing and punishment", () => {
  assert.equal(
    hasForbiddenMoralization("北京是中国的首都。", "住在北京的人有福了。"),
    true,
  );
  assert.equal(
    hasForbiddenMoralization("诚实待人，终必得着信任。", "诚实的人有福了。"),
    false,
  );
});

test("aphorism rendering uses varied library contours instead of one blessing frame", () => {
  const outputs = [
    renderCuvAphorism("说话以前先想清楚", "免去日后的后悔"),
    renderCuvAphorism("每天认真工作", "看见劳苦的果效"),
    renderCuvAphorism("用恶意对待别人", "从别人得着恶意"),
    renderCuvAphorism("在众人面前抬高自己", "因骄傲降为卑"),
  ];
  assert.equal(new Set(outputs).size, outputs.length);
  assert.ok(outputs.filter((output) => /有福/u.test(output)).length <= 1);
  assert.ok(outputs.some((output) => /智慧为首/u.test(output)));
  assert.ok(outputs.some((output) => /诸般勤劳都有益处/u.test(output)));
});

test("scripture results receive stable verse divisions without breaking paired clauses", () => {
  const definition = renderDefinitionSource(USER_DEFINITION);
  const verses = segmentScriptureText(definition);
  assert.equal(verses.length, 2);
  assert.match(verses[0].text, /乃是这样：$/u);
  assert.match(verses[1].text, /^它以北京语音/u);
  assert.equal(formatScriptureVerses(verses).split("\n")[1].startsWith("2 "), true);

  const paired = segmentScriptureText(
    "凡自称为龙的，必叫他盘着；凡自称为虎的，也必叫他卧着。",
  );
  assert.equal(paired.length, 1);
});

test("dialogue verses break after complete quotations, not inside them", () => {
  const verses = segmentScriptureText(
    "甲对乙说：“你若愿意，就到这里来；我必等候你。”乙回答说：“我必照你所说的行。”",
  );
  assert.equal(verses.length, 2);
  assert.match(verses[0].text, /等候你。”$/u);
  assert.match(verses[1].text, /^乙回答说/u);
});
