import {
  renderScriptureSkeletonPlan,
  type ScriptureSkeletonPlan,
} from "../lib/scriptureSkeletons";

export const shortStoryInput =
  "清晨，小周带着修改好的方案来到公司，把文件交给主管。主管看完后说预算仍然太高，叫他下午以前再改一版。小周虽然疲惫，却没有争辩，回到座位重新核对数字。到了午后，他按时交出新方案，主管看见合用，就点头通过了。";

const plan: ScriptureSkeletonPlan = {
  textType: "职场记事",
  units: [
    { kind: "narration", frame: "arrival", actor: "小周", place: "公司" },
    {
      kind: "narration",
      frame: "action",
      actor: "小周",
      action: "把修改好的方案交给主管",
    },
    {
      kind: "speech",
      intent: "command",
      speaker: "主管",
      addressee: "小周",
      delivery: "commanded",
      elements: {
        action: "在下午以前重新修改方案",
        prohibition: "照旧交付",
      },
    },
    {
      kind: "narration",
      frame: "action",
      actor: "小周",
      action: "虽疲惫却没有争辩，回到座位重新核对数字",
    },
    {
      kind: "declaration",
      intent: "general_rule",
      elements: {
        category: "修改方案的时候",
        result: "按时交付的时候",
      },
    },
    {
      kind: "declaration",
      intent: "general_rule",
      elements: {
        category: "在疲惫中仍旧忍耐作工",
        result: "看见劳苦的果效",
      },
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
};

console.log(`输入（${shortStoryInput.length}字）：\n${shortStoryInput}\n`);
console.log(`输出：\n${renderScriptureSkeletonPlan(plan)}`);
