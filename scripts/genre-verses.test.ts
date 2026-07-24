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
  assessScriptureStoryResult,
  groundScriptureSkeletonPlan,
  parseScriptureSkeletonPlan,
  renderScriptureSkeletonPlan,
} from "../lib/scriptureSkeletons";
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

const NEIGHBOR_STORY =
  "傍晚，陈明下班回家，看见邻居王叔的电动车倒在雨里，便停下来扶起车，又把散落的菜装回篮子。王叔赶来，说自己急着给生病的妻子送药。陈明说：“你先回去照顾她，这些东西我替你送到楼上。”他冒雨搬完东西，回家时衣服已经湿透。第二天，王叔带着一袋水果来道谢，陈明只收下一只苹果，说邻里之间本该彼此照应。";

test("story grounding repairs gift direction and replaces unsupported morals with a grounded anchor", () => {
  const parsed = parseScriptureSkeletonPlan(JSON.stringify({
    textType: "记事",
    units: [
      {
        kind: "speech",
        intent: "courtesy_gift",
        speaker: "陈明",
        addressee: "王叔",
        elements: { gift: "一只苹果" },
      },
      {
        kind: "declaration",
        intent: "general_rule",
        elements: { category: "谦让不贪", result: "止息纷争" },
      },
    ],
  }));
  assert.ok(parsed);
  const grounded = groundScriptureSkeletonPlan(parsed, NEIGHBOR_STORY);
  const gift = grounded.units.find((unit) => unit.kind === "speech");
  assert.equal(gift?.kind === "speech" ? gift.speaker : "", "王叔");
  assert.equal(gift?.kind === "speech" ? gift.addressee : "", "陈明");
  assert.equal(gift?.kind === "speech" ? gift.elements.gift : "", "一袋水果");
  const declarations = grounded.units.filter((unit) => unit.kind === "declaration");
  assert.equal(declarations.length, 1);
  assert.deepEqual(
    declarations[0]?.kind === "declaration" ? declarations[0].elements : {},
    { category: "帮助邻居", result: "彼此照应" },
  );
});

test("specific help survives the famous speech frame instead of becoming an empty offer", () => {
  const parsed = parseScriptureSkeletonPlan(JSON.stringify({
    textType: "记事",
    units: [
      {
        kind: "speech",
        intent: "offer_help",
        speaker: "陈明",
        addressee: "王叔",
        elements: {
          recipientAction: "回去照顾生病的妻子",
          action: "把这些东西送到楼上",
        },
      },
      {
        kind: "declaration",
        intent: "general_rule",
        elements: { category: "帮助邻居", result: "彼此照应" },
      },
    ],
  }));
  assert.ok(parsed);
  const rendered = renderScriptureSkeletonPlan(parsed, NEIGHBOR_STORY);
  assert.match(rendered, /回去照顾生病的妻子/u);
  assert.match(rendered, /论到这些东西，我必替你送到楼上/u);
  assert.match(rendered, /各人不要单顾自己的事，也要顾别人的事/u);
  assert.doesNotMatch(rendered, /过错|纷争|报应/u);
});

test("a time-only transition is merged into the following event", () => {
  const parsed = parseScriptureSkeletonPlan(JSON.stringify({
    textType: "记事",
    units: [
      {
        kind: "narration",
        frame: "transition",
        time: "第二天",
      },
      {
        kind: "narration",
        frame: "arrival",
        actor: "王叔",
        action: "带着一袋水果来道谢",
      },
    ],
  }));
  assert.ok(parsed);
  const grounded = groundScriptureSkeletonPlan(parsed, NEIGHBOR_STORY);
  assert.equal(grounded.units.length, 2);
  assert.equal(grounded.units[0]?.kind, "narration");
  assert.equal(
    grounded.units[0]?.kind === "narration" ? grounded.units[0].time : "",
    "第二天",
  );
  const rendered = renderScriptureSkeletonPlan(grounded, NEIGHBOR_STORY);
  assert.match(rendered, /到了第二天，王叔带着一袋水果来道谢/u);
  assert.doesNotMatch(rendered, /及至事情到了这一步/u);
});

test("ordinary settings and arrivals never invent a prepared venue", () => {
  const parsed = parseScriptureSkeletonPlan(JSON.stringify({
    textType: "记事",
    units: [
      { kind: "narration", frame: "setting", time: "傍晚", place: "家门口" },
      { kind: "narration", frame: "arrival", actor: "王叔", action: "赶来" },
    ],
  }));
  assert.ok(parsed);
  const rendered = renderScriptureSkeletonPlan(parsed, "傍晚，王叔赶到家门口。陈明在那里等他。");
  assert.match(rendered, /那时正是傍晚/u);
  assert.match(rendered, /王叔赶来/u);
  assert.doesNotMatch(rendered, /家门口中|预备妥当/u);
});

test("end-to-end story assessment rejects the reported regression and accepts a grounded story", () => {
  const regressed =
    "那时正是傍晚，家门口中已经预备妥当。陈明就扶起电动车。到了第二天，陈明说：‘只把我手中所有的一只苹果给你。’爱能遮掩邻里之间中的许多过错。";
  const bad = assessScriptureStoryResult(NEIGHBOR_STORY, regressed);
  assert.equal(bad.acceptable, false);
  assert.ok(bad.issues.some((issue) => /礼物方向反转/u.test(issue)));
  assert.ok(bad.issues.some((issue) => /生病|药/u.test(issue)));

  const grounded =
    "那时正是傍晚，陈明下班回家，看见邻居王叔的电动车倒在雨里，就扶起车，又把散落的菜装回篮子。王叔赶来，陈明听见他说妻子生病，急着给她送药。陈明对王叔说：‘你只管回去照顾她；论到这些东西，我必替你送到楼上。’他冒雨搬完东西；及至回家的时候，衣服已经湿透。到了第二天，王叔带着一袋水果来道谢，陈明只收下一只苹果。各人不要单顾自己的事，也要顾别人的事。";
  const good = assessScriptureStoryResult(NEIGHBOR_STORY, grounded);
  assert.equal(good.acceptable, true, good.issues.join("；"));
});
