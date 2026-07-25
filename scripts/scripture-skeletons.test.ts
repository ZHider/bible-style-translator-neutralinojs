import assert from "node:assert/strict";
import test from "node:test";
import { findLowRetentionUnionDialogues } from "../lib/scriptureQuality";
import {
  buildSkeletonIdentificationPrompt,
  parseScriptureSkeletonPlan,
  renderEmergencyScripture,
  renderScriptureSkeletonPlan,
} from "../lib/scriptureSkeletons";

test("structured elements are rendered through fixed high-retention skeletons", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "冲突记事",
      units: [
        {
          kind: "narration",
          frame: "arrival",
          actor: "刘华强带着韩跃平和大海",
          place: "摆设筵席的屋里",
        },
        {
          kind: "speech",
          intent: "self_identification",
          speaker: "刘华强",
          delivery: "said",
          elements: { name: "刘华强" },
        },
        {
          kind: "speech",
          intent: "mediation_request",
          speaker: "宋老虎",
          addressee: "刘华强",
          delivery: "asked",
          elements: {
            beneficiary: "赵祥生",
            action: "不要再寻找赵祥生",
            result: "我手下的人仍得供养",
          },
        },
        {
          kind: "speech",
          intent: "paired_dominance",
          speaker: "刘华强",
          addressee: "振涛",
          delivery: "answered",
          elements: {
            categoryA: "自称龙",
            resultA: "叫他盘着",
            categoryB: "自称虎",
            resultB: "叫他卧着",
          },
        },
        {
          kind: "speech",
          intent: "death_threat",
          speaker: "振涛",
          addressee: "刘华强",
          delivery: "cried",
          elements: { target: "刘华强" },
        },
      ],
    }),
  );

  assert.ok(plan);
  const output = renderScriptureSkeletonPlan(plan);
  assert.match(output, /论到我的名，人所称呼我的名乃是刘华强/);
  assert.match(output, /我若在你眼前蒙恩，求你因赵祥生的缘故，不要再寻找赵祥生/);
  assert.match(output, /凡自称为龙的，必叫他盘着；凡自称为虎的，也必叫他卧着/);
  assert.match(output, /我必夺取你的命/);
  assert.deepEqual(findLowRetentionUnionDialogues(output), []);
});

test("unknown speech functions fall back to a fixed frame instead of free-form prose", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "记事",
      units: [
        {
          kind: "speech",
          intent: "free_writing",
          speaker: "张三",
          elements: { text: "你算什么东西" },
        },
        {
          kind: "narration",
          frame: "action",
          actor: "张三",
          action: "转眼看李四",
        },
      ],
    }),
  );

  assert.ok(plan);
  const output = renderScriptureSkeletonPlan(plan);
  assert.doesNotMatch(output, /你算什么东西/);
  assert.match(output, /张三说：“这不是人所猜想的，乃是事情真实的缘故。”/);
  assert.match(output, /张三就转眼看李四/);
});

test("identification prompt permits only facts and speech functions", () => {
  const prompt = buildSkeletonIdentificationPrompt("张三让李四把文件放下。");
  assert.match(prompt, /整理成与原文文本类型相符的结构骨架，不写正文/);
  assert.match(prompt, /服务器预判类型：factual/);
  assert.match(prompt, /通常只使用 factual_statement/);
  assert.match(prompt, /elements 只放原文内容/);
  assert.match(prompt, /不得增加新事实/);
  assert.doesNotMatch(prompt, /可用对白功能及应填元素/);
});

test("the server, not the model, selects the famous sentence skeleton", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "冲突记事",
      units: [
        {
          kind: "speech",
          intent: "insult_challenge",
          speaker: "振涛",
          addressee: "刘华强",
          elements: {
            knownA: "宋老虎",
            knownB: "他的名声",
            challenge: "在我哥哥面前这样说话",
          },
        },
      ],
    }),
  );

  assert.ok(plan);
  assert.match(
    renderScriptureSkeletonPlan(plan),
    /宋老虎我认识，他的名声我也知道；你却是谁，竟敢在我哥哥面前这样说话呢/,
  );
});

test("speech tags follow Union Version dialogue rhythm instead of repeating full addresses", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "问答",
      units: [
        {
          kind: "speech",
          intent: "request",
          speaker: "宋老虎",
          addressee: "刘华强",
          delivery: "said",
          elements: { action: "听我陈明这事", result: "彼此仍有情面" },
        },
        {
          kind: "speech",
          intent: "mutual_claim",
          speaker: "刘华强",
          addressee: "宋老虎",
          delivery: "answered",
          elements: { theirs: "你的兄弟", mine: "我的朋友" },
        },
        {
          kind: "speech",
          intent: "self_defense",
          speaker: "刘华强",
          addressee: "宋老虎",
          delivery: "said",
          elements: { matter: "借钱", rejected: "不肯偿还", asserted: "借用一时" },
        },
      ],
    }),
  );

  assert.ok(plan);
  const output = renderScriptureSkeletonPlan(plan);
  assert.match(output, /^宋老虎对刘华强说/);
  assert.match(output, /刘华强回答说/);
  assert.equal((output.match(/刘华强/g) || []).length, 2);
  assert.equal((output.match(/开口说/g) || []).length, 0);
  assert.equal((output.match(/对宋老虎说/g) || []).length, 0);
});

test("a narrated reaction and its following quotation share one biblical sentence", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "冲突记事",
      units: [
        {
          kind: "narration",
          frame: "reaction",
          actor: "振涛",
          target: "刘华强",
          action: "怒气发作",
        },
        {
          kind: "speech",
          intent: "death_threat",
          speaker: "振涛",
          addressee: "刘华强",
          delivery: "cried",
          elements: { target: "刘华强" },
        },
      ],
    }),
  );

  assert.ok(plan);
  assert.equal(
    renderScriptureSkeletonPlan(plan),
    "振涛看见这事，就转向刘华强，怒气发作，大声说：“我必夺取你的命。”",
  );
});

test("contaminated model slots cannot duplicate the fixed skeleton wording", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "冲突记事",
      units: [
        { kind: "speech", intent: "guide_inside", speaker: "服务员", addressee: "刘华强", elements: { place: "请往里面走" } },
        { kind: "speech", intent: "introduction", speaker: "刘华强", addressee: "宋老虎", elements: { count: "两个个人", names: "跃平、大海", relation: "兄弟" } },
        { kind: "speech", intent: "offer_help", speaker: "宋老虎", addressee: "刘华强", elements: { matter: "以后若有什么事情，你只管开口" } },
        { kind: "speech", intent: "agreement", speaker: "刘华强", addressee: "宋老虎", elements: { action: "有大哥这一句话，我的心就踏实了" } },
        { kind: "speech", intent: "mediation_request", speaker: "宋老虎", addressee: "刘华强", elements: { beneficiary: "赵祥生", action: "不要再去找他", result: "看我的情面" } },
        { kind: "speech", intent: "mutual_claim", speaker: "刘华强", addressee: "宋老虎", elements: { theirs: "宋大哥的兄弟", mine: "华强的朋友" } },
        { kind: "speech", intent: "status_observation", speaker: "刘华强", addressee: "宋老虎", elements: { supporters: "孝敬你的人也多也多" } },
        { kind: "speech", intent: "insult_challenge", speaker: "振涛", addressee: "刘华强", elements: { knownA: "我哥", knownB: "你", challenge: "究竟是什么人？你察看自己" } },
        { kind: "speech", intent: "paired_dominance", speaker: "刘华强", addressee: "振涛", elements: { categoryA: "凡来到我面前的，无论自比为龙", resultA: "都不可任意而行，龙必要屈身盘伏", categoryB: "自称为虎", resultB: "虎也必要俯首而卧" } },
        { kind: "speech", intent: "warning_pride", speaker: "宋老虎", addressee: "刘华强", elements: { warning: "年轻人，不可太气盛" } },
        { kind: "speech", intent: "youth_defiance", speaker: "刘华强", addressee: "宋老虎", elements: { person: "年轻人", quality: "气盛" } },
        { kind: "speech", intent: "exit_threat", speaker: "振涛", addressee: "刘华强", elements: { condition: "你今日若你今日若这样走出这个房子", consequence: "我必不我必不与你止息追讨" } },
        { kind: "speech", intent: "method_challenge", speaker: "刘华强", addressee: "振涛", elements: { action: "我当怎样我当怎样走出这个屋子呢呢" } },
        { kind: "speech", intent: "coercion", speaker: "振涛", addressee: "刘华强", elements: { positiveCondition: "答应", negativeCondition: "不答应", result: "也得答应" } },
        { kind: "speech", intent: "boast", speaker: "刘华强", addressee: "振涛", elements: { action: "我长到这么大，还没有人敢这样跟我说话呢" } },
      ],
    }),
  );

  assert.ok(plan);
  const output = renderScriptureSkeletonPlan(plan);
  for (const broken of [
    "在我们中间请往里面走",
    "两个个人",
    "你若有以后若有",
    "我必照这话有大哥",
    "好叫看我的情面",
    "也多也多",
    "凡凡",
    "不可年轻人",
    "年轻人年轻",
    "你今日若你今日若",
    "我必不我必不",
    "我当怎样我当怎样",
    "呢呢",
    "也当也得",
    "未曾有人敢我长到这么大",
  ]) {
    assert.doesNotMatch(output, new RegExp(broken, "u"));
  }
  assert.match(output, /论到这两个人，他们名叫跃平、大海/);
  assert.match(output, /有了你这句话，我的心就安稳了/);
  assert.match(output, /你有兄弟，我也有朋友/);
  assert.match(output, /凡自称为龙的，必叫他盘着；凡自称为虎的，也必叫他卧着/);
  assert.match(output, /从我幼年直到今日，从来没有人像你这样跟我说话/);
});

test("narrative results do not repeat the action and consecutive outcomes vary their connectors", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "冲突记事",
      units: [
        { kind: "narration", frame: "action", actor: "韩跃平", action: "迎上前去，用刀刺伤了振涛", result: "振涛受伤" },
        { kind: "narration", frame: "action", actor: "大海", action: "制住宋老虎，使他不能上前", result: "宋老虎被制住" },
        { kind: "narration", frame: "outcome", action: "鲜血滴落在地板上" },
        { kind: "narration", frame: "outcome", actor: "振涛", action: "捂住伤口" },
        { kind: "narration", frame: "outcome", actor: "宋老虎", action: "眼看着刘华强等人离去" },
      ],
    }),
  );

  assert.ok(plan);
  const output = renderScriptureSkeletonPlan(plan);
  assert.doesNotMatch(output, /振涛受伤|宋老虎被制住|于是那人|于是振涛|于是宋老虎/);
  assert.match(output, /于是鲜血滴落在地上。振涛就捂住伤口。宋老虎只能眼看着刘华强等人离去/);
});

test("slot sanitation is generic across notices, technical text, trade, guarantees, and threats", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "混合文案",
      units: [
        { kind: "declaration", intent: "command", elements: { action: "你当重启服务", prohibition: "不可跳过备份" } },
        { kind: "declaration", intent: "contrast", elements: { rejected: "这不是网络中断", asserted: "乃是证书过期" } },
        { kind: "declaration", intent: "general_rule", elements: { category: "凡逾期提交的", result: "必重新申请" } },
        { kind: "declaration", intent: "guarantee", elements: { condition: "若报告未提交", penalty: "我必承担责任" } },
        { kind: "declaration", intent: "trade_price", elements: { item: "论到苹果", unit: "每一斤", price: "作价三元" } },
        { kind: "declaration", intent: "curse_penalty", elements: { condition: "若设备再次失灵", subject: "这设备", penalty: "它必退出运行" } },
        { kind: "speech", intent: "self_identification", speaker: "陈明", elements: { name: "我叫陈明" } },
        { kind: "speech", intent: "death_threat", speaker: "甲", addressee: "王五", elements: { target: "王五的命" } },
        { kind: "speech", intent: "question", speaker: "乙", elements: { question: "岂不当检查日志吗", more: "何况告警已经出现呢" } },
        {
          kind: "speech",
          intent: "refusal",
          speaker: "李婷",
          addressee: "赵师傅",
          elements: {
            matter: "这钱",
            action: "收下",
            condition: "你家里人还在担心",
            advice: "快回去报平安",
          },
        },
      ],
    }),
  );

  assert.ok(plan);
  const output = renderScriptureSkeletonPlan(plan);
  for (const duplicated of [
    "你当你当",
    "不可不可",
    "这不是这不是",
    "乃是乃是",
    "凡凡",
    "必必",
    "若若",
    "我必我必",
    "论到论到",
    "每每",
    "作价作价",
    "它必它必",
    "乃是我叫",
    "王五的命的命",
    "岂不岂不",
    "何况何况",
    "你若你",
  ]) {
    assert.doesNotMatch(output, new RegExp(duplicated, "u"));
  }
  assert.match(output, /你当重启服务；不可跳过备份/);
  assert.match(output, /这不是网络中断，乃是证书过期/);
  assert.match(output, /凡逾期提交的，必重新申请/);
  assert.match(output, /每一斤作价三元/);
  assert.match(output, /人所称呼我的名乃是陈明/);
  assert.match(output, /我必夺取你的命/);
  assert.match(output, /论到这钱，我断不收取；你家里人若还在担心，就当快回去报平安/);
});

test("generic action recovery uses surrounding roles without relying on one story", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "冲突记事",
      units: [
        { kind: "speech", intent: "death_threat", speaker: "甲", addressee: "乙", delivery: "cried", elements: { target: "乙" } },
        { kind: "narration", frame: "action", actor: "甲", action: "扑过去" },
        { kind: "narration", frame: "action", actor: "丙", action: "迎上前去，用棍打伤" },
        { kind: "narration", frame: "action", actor: "丁", action: "制住", result: "乙不能上前" },
        { kind: "narration", frame: "outcome", result: "文件散落一地" },
      ],
    }),
  );

  assert.ok(plan);
  const output = renderScriptureSkeletonPlan(plan);
  assert.match(output, /说完这话，甲就向乙扑过去/);
  assert.match(output, /甲就向乙扑过去/);
  assert.match(output, /丙就迎上前去，用棍打伤甲/);
  assert.match(output, /丁就制住乙，使他不能上前/);
  assert.match(output, /于是文件散落一地/);
  assert.doesNotMatch(output, /行了所要行的事/);
});

test("complete texts receive a factual Union Version closing cadence", () => {
  const cases = [
    {
      plan: {
        textType: "技术记事",
        units: [
          { kind: "narration", frame: "outcome", actor: "工程师", action: "更新证书", result: "服务恢复完成" },
        ],
      },
      ending: "这事就这样成了。",
    },
    {
      plan: {
        textType: "出行记事",
        units: [
          { kind: "narration", frame: "outcome", actor: "旅客", action: "带着行李离开车站" },
        ],
      },
      ending: "这事的结局，就是这样。",
    },
    {
      plan: {
        textType: "系统通知",
        units: [
          { kind: "declaration", intent: "command", elements: { action: "按时提交报告", prohibition: "迟延" } },
        ],
      },
      ending: "所要晓谕的，就是这些。",
    },
    {
      plan: {
        textType: "操作规则",
        units: [
          { kind: "declaration", intent: "general_rule", elements: { category: "提交申请", result: "附上凭据" } },
        ],
      },
      ending: "所列的条例，就是这些。",
    },
  ];

  for (const item of cases) {
    const plan = parseScriptureSkeletonPlan(JSON.stringify(item.plan));
    assert.ok(plan);
    assert.ok(renderScriptureSkeletonPlan(plan).endsWith(item.ending));
  }
});

test("story actions preserve conditional word order and explicit time", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "职场记事",
      units: [
        {
          kind: "narration",
          frame: "arrival",
          actor: "小周",
          action: "带着修改好的方案来到公司",
          place: "公司",
          time: "清晨",
        },
        {
          kind: "narration",
          frame: "action",
          actor: "小周",
          action: "虽疲惫却没有争辩，回到座位重新核对数字",
        },
        {
          kind: "narration",
          frame: "action",
          time: "午后",
          actor: "小周",
          action: "按时交出新方案",
        },
        {
          kind: "narration",
          frame: "outcome",
          actor: "主管",
          action: "看见方案合用，就点头通过",
        },
      ],
    }),
  );

  assert.ok(plan);
  const output = renderScriptureSkeletonPlan(plan);
  assert.match(output, /到了清晨，小周带着修改好的方案来到公司/);
  assert.match(output, /小周虽疲惫却没有争辩/);
  assert.match(output, /到了午后，小周就按时交出新方案/);
  assert.doesNotMatch(output, /小周就虽疲惫|所记的事，就是这些/);
});

test("100-to-200-character stories request grounded recognizable anchor carriers", () => {
  const source =
    "清晨，小周带着修改好的方案来到公司，把文件交给主管。主管看完后说预算仍然太高，叫他下午以前再改一版。小周虽然疲惫，却没有争辩，回到座位重新核对数字。到了午后，他按时交出新方案，主管看见合用，就点头通过了。";
  const prompt = buildSkeletonIdentificationPrompt(source);

  assert.match(prompt, /本次输入为 102 字/);
  assert.match(prompt, /再填写顶层 reflection/);
  assert.match(prompt, /reflection\.behavior 必须是故事中最值得评价的具体行为或选择/);
  assert.match(prompt, /不得把赠送者与收受者调换/);
  assert.match(prompt, /每个源句至少要有一个 unit/u);
  assert.match(prompt, /出现钱不等于贪财/u);
  assert.match(prompt, /可补入一个不改变因果的场面过渡/);
});

test("an unfinished threat is not falsely closed as a completed event", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "冲突片段",
      units: [
        { kind: "speech", intent: "death_threat", speaker: "甲", addressee: "乙", elements: { target: "乙" } },
      ],
    }),
  );
  assert.ok(plan);
  assert.equal(renderScriptureSkeletonPlan(plan), "甲对乙说：“我必夺取你的命。”");
});

test("emergency rendering still returns a complete result without another model pass", () => {
  const output = renderEmergencyScripture("系统升级失败，请稍后重试");
  assert.match(output, /^论到这事，所记的乃是这样：/);
  assert.match(output, /系统升级失败/);
  assert.match(output, /凡听见这话的/);
});

test("story planning favors a coherent scripture tale over line-by-line transcript fidelity", () => {
  const prompt = buildSkeletonIdentificationPrompt(
    "甲进屋，众人寒暄数句，随后因一笔借款起了冲突。",
  );
  assert.match(prompt, /这不是逐句翻译或影视台词校对/);
  assert.match(prompt, /3—8 个 unit/);
  assert.match(prompt, /不要重复输出空字符串字段/);
  assert.match(prompt, /到场—坐席—提出请求—双方争辩—冲突升级—结局/);
  assert.match(prompt, /mediation_request 专用于/);
  assert.match(prompt, /单独呼喊一个人的名字只是叫住/);
});

test("fixed story frames remove malformed pseudo-scripture and strengthen famous syntax", () => {
  const plan = parseScriptureSkeletonPlan(
    JSON.stringify({
      textType: "冲突记事",
      units: [
        { kind: "speech", intent: "courtesy_gift", speaker: "甲", addressee: "乙", elements: { gift: "一点小意思" } },
        { kind: "speech", intent: "rebuke", speaker: "乙", addressee: "丙", elements: { prohibition: "哎" } },
        { kind: "speech", intent: "youth_defiance", speaker: "甲", addressee: "乙", elements: { quality: "气盛" } },
        { kind: "speech", intent: "method_challenge", speaker: "甲", addressee: "丙", elements: { action: "走出这个屋子呢吗" } },
        { kind: "speech", intent: "question", speaker: "丙", addressee: "甲", elements: { question: "当怎样回答呢吗", more: "事情已经显明" } },
      ],
    }),
  );
  assert.ok(plan);
  const output = renderScriptureSkeletonPlan(plan);
  assert.match(output, /金银般贵重的物我没有/);
  assert.match(output, /不可再以无礼的话待人/);
  assert.match(output, /不可叫人小看我年轻/);
  assert.doesNotMatch(output, /不可哎|呢吗|吗呢|何况事情已经显明/);
});
