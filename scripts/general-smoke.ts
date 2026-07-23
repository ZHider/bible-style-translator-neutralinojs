import { normalizeCuvSceneLexicon } from "../lib/cuvLexicon";
import { normalizeUnionNarration } from "../lib/scriptureQuality";
import {
  parseScriptureSkeletonPlan,
  renderScriptureSkeletonPlan,
} from "../lib/scriptureSkeletons";

const scenarios = [
  {
    title: "学生迟到",
    source:
      "早晨，小明迟到了。老师问他为什么迟到。小明说路上自行车坏了，并保证以后提前出门。老师警告他不可再迟到，然后让他进教室。",
    plan: {
      textType: "校园记事",
      units: [
        {
          kind: "narration",
          frame: "arrival",
          actor: "小明",
          place: "教室门前",
          time: "早晨",
          result: "他已经迟到了",
        },
        {
          kind: "speech",
          intent: "question",
          speaker: "老师",
          addressee: "小明",
          delivery: "asked",
          elements: {
            question: "当说明迟到的缘故",
            more: "众人已经按时来到",
          },
        },
        {
          kind: "speech",
          intent: "contrast",
          speaker: "小明",
          addressee: "老师",
          delivery: "answered",
          elements: {
            rejected: "我有意迟延",
            asserted: "路上的自行车坏了",
          },
        },
        {
          kind: "speech",
          intent: "guarantee",
          speaker: "小明",
          addressee: "老师",
          delivery: "said",
          elements: {
            condition: "我以后不提前出门",
            penalty: "担当迟到的责罚",
          },
        },
        {
          kind: "speech",
          intent: "command",
          speaker: "老师",
          addressee: "小明",
          delivery: "warned",
          elements: {
            action: "从今以后按时来到",
            prohibition: "再有迟延",
          },
        },
        {
          kind: "narration",
          frame: "action",
          actor: "老师",
          action: "叫小明进教室去",
        },
      ],
    },
  },
  {
    title: "菜市场买鱼",
    source:
      "李姐在菜市场买鱼。她问摊主鱼多少钱一斤。摊主说每斤十八元，并保证鱼是新鲜的；若不新鲜就退款。李姐付了钱，把鱼带走。",
    plan: {
      textType: "交易记事",
      units: [
        {
          kind: "narration",
          frame: "arrival",
          actor: "李姐",
          place: "菜市场",
        },
        {
          kind: "speech",
          intent: "question",
          speaker: "李姐",
          addressee: "摊主",
          delivery: "asked",
          elements: {
            question: "当知道这鱼的价钱",
            more: "我要按斤购买",
          },
        },
        {
          kind: "speech",
          intent: "trade_price",
          speaker: "摊主",
          addressee: "李姐",
          delivery: "answered",
          elements: {
            item: "这鱼",
            unit: "一斤",
            price: "十八元",
          },
        },
        {
          kind: "speech",
          intent: "guarantee",
          speaker: "摊主",
          addressee: "李姐",
          delivery: "said",
          elements: {
            condition: "这鱼并不新鲜",
            penalty: "退还你所交的钱",
          },
        },
        {
          kind: "narration",
          frame: "action",
          actor: "李姐",
          action: "把十八元交在摊主手中，又把鱼带走",
        },
      ],
    },
  },
  {
    title: "系统故障",
    source:
      "张工升级系统后，服务启动失败。他让小王检查日志。小王发现不是程序坏了，而是证书过期；更新证书以后，服务恢复了。张工要求以后发布前先检查证书。",
    plan: {
      textType: "技术记事",
      units: [
        {
          kind: "narration",
          frame: "transition",
          actor: "张工",
          matter: "系统升级完毕",
          action: "发现服务不能启动",
        },
        {
          kind: "speech",
          intent: "command",
          speaker: "张工",
          addressee: "小王",
          delivery: "commanded",
          elements: {
            action: "检查日志",
            prohibition: "遗漏其中的告警",
          },
        },
        {
          kind: "narration",
          frame: "action",
          actor: "小王",
          action: "详细察看日志",
        },
        {
          kind: "speech",
          intent: "contrast",
          speaker: "小王",
          addressee: "张工",
          delivery: "said",
          elements: {
            rejected: "程序已经损坏",
            asserted: "证书已经过期",
          },
        },
        {
          kind: "narration",
          frame: "outcome",
          actor: "小王",
          action: "更新证书",
          result: "服务就恢复了",
        },
        {
          kind: "speech",
          intent: "general_rule",
          speaker: "张工",
          addressee: "小王",
          delivery: "commanded",
          elements: {
            category: "以后发布系统",
            result: "先检查证书",
          },
        },
      ],
    },
  },
] as const;

for (const scenario of scenarios) {
  const plan = parseScriptureSkeletonPlan(JSON.stringify(scenario.plan));
  if (!plan) throw new Error(`${scenario.title}：计划解析失败`);
  const output = normalizeCuvSceneLexicon(
    scenario.source,
    normalizeUnionNarration(renderScriptureSkeletonPlan(plan)),
  );
  console.log(`【${scenario.title}】`);
  console.log(`输入：${scenario.source}`);
  console.log(`输出：${output}`);
  console.log();
}
