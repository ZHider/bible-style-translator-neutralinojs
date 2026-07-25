import type { ScriptureLevel } from "@/lib/prompt";

export function isCriticalStoryIssue(
  issue: string,
  source = "",
  level: ScriptureLevel = "standard",
) {
  if (
    /方向反转|伤害对象|动作执行者|承受者|借贷方向|交易方向|单价|总价|结局|否定关系|凭空加入评价或冲突/u.test(
      issue,
    )
  ) {
    return true;
  }
  const fact = issue.match(/^遗漏关键事实：(.+)$/u)?.[1] || "";
  if (fact) {
    if (/借贷|伤害|死亡/u.test(fact)) return true;
    return [...source].length <= 220 && level !== "light";
  }
  const name = issue.match(/^遗漏人物：(.+)$/u)?.[1] || "";
  if (name) {
    if ([...source].length <= 220) return true;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const occurrences = source.split(name).length - 1;
    const decisiveRole = new RegExp(
      `(?:${escaped}.{0,28}(?:刺伤|杀死|弄死|借钱|借款|归还|交给|制住|带走|离开)|(?:刺伤|杀死|弄死|借钱|借款|归还|交给|制住).{0,28}${escaped})`,
      "u",
    ).test(source);
    return source.slice(0, 48).includes(name) || occurrences >= 3 || decisiveRole;
  }
  return false;
}

export function splitStoryIssues(
  issues: string[],
  source: string,
  level: ScriptureLevel,
) {
  return {
    critical: issues.filter((issue) => isCriticalStoryIssue(issue, source, level)),
    advisory: issues.filter((issue) => !isCriticalStoryIssue(issue, source, level)),
  };
}
