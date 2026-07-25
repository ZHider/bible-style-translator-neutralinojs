import { NextRequest } from "next/server";
import { writeFile } from "node:fs/promises";
import { POST } from "../app/api/translate/route.ts";

type GenerationMode =
  | "local_primary"
  | "structured"
  | "auto_repaired"
  | "best_effort"
  | "fallback"
  | "error";

type RunResult = {
  tier: string;
  sourceLength: number;
  round: number;
  mode: GenerationMode;
  elapsedMs: number;
  outputLength: number;
  warning: boolean;
  status: number;
  error?: string;
  diagnostics?: unknown;
};

const apiKey = process.env.TEST_DEEPSEEK_API_KEY?.trim() || "";
if (apiKey.length < 20) throw new Error("TEST_DEEPSEEK_API_KEY is missing");
const outputFile = process.env.BENCHMARK_OUTPUT_FILE?.trim() || ".artifacts/fallback-benchmark.json";

const shortStory =
  "清晨，小周带着修改好的方案来到公司，把文件交给主管。主管看完后说预算仍然太高，叫他下午以前再改一版。小周虽然疲惫，却没有争辩，回到座位重新核对数字。到了午后，他按时交出新方案，主管看见合用，就点头通过了。";

function buildProjectStory(targetLength: number) {
  const opening =
    "项目上线以前，小周带着测试记录来到会议室，把昨日发现的问题交给主管。主管看完以后，叫开发、设计和运营一同坐下，逐项说明哪些故障必须先修，哪些改动可以延后。";
  const episodes = [
    "开发说接口偶尔超时，若贸然发布，用户提交的数据可能丢失；主管就叫他先保存日志，再查明数据库连接。",
    "设计说移动端按钮被图片遮住，有些人虽然看见页面，却不能点击；小周便重新检查层级和触摸区域。",
    "运营拿出用户的反馈，说短句常被写成同一种格言，长故事又容易在审查时退回固定结果；众人听见，就把这些问题分别记录。",
    "到了中午，他们完成第一轮修正。小周重新运行测试，却发现借款人与收款人的方向被颠倒，于是没有把这份结果交出去。",
    "主管吩咐众人说，轻微的措辞问题不可毁掉整篇正文；惟有角色、否定、动作对象和结局发生错误时，才可以重新生成。",
    "开发照着这个原则修改流程，使计划先被清洗，再受审查；若只是点评不足，就保留事实正确的正文，并向使用者显明提示。",
    "第二次测试时，短句很快生成，故事中的人物也没有遗漏；然而篇幅仍旧太短，小周便补足原文已有的场景和反应，并没有另造新的结局。",
    "傍晚以前，众人又检查和合本、思高译腔与KJV英文三种模式，确认版本号、API名称和现代物品仍照原样保留。",
    "主管最后查看测试表，见严重事实错误已经除去，便准许他们预备发布；小周仍将未完全达到的风格指标写在提示中，不把保守结果冒充正式正文。",
  ];
  const ending =
    "到了所定的时候，小周把最后一份报告交给主管。主管看见主要问题已经修好，就准许项目进入下一步；众人收拾文件，各自回去。";
  let result = opening;
  let index = 0;
  while ([...`${result}${ending}`].length < targetLength) {
    result += episodes[index % episodes.length];
    index += 1;
  }
  result += ending;
  return [...result].slice(0, targetLength - 1).join("") + "。";
}

const tiers = [
  { name: "极短陈述", text: "代码正在运行，日志中没有报错。", rounds: 5 },
  { name: "百字短故事", text: shortStory, rounds: 4 },
  { name: "三百字故事", text: buildProjectStory(300), rounds: 3 },
  { name: "七百字故事", text: buildProjectStory(700), rounds: 2 },
  { name: "近上限长故事", text: buildProjectStory(1400), rounds: 1 },
] as const;
const requestedTiers = (process.env.BENCHMARK_TIERS || "")
  .split(/[,，\s]+/u)
  .map((item) => item.trim())
  .filter(Boolean);
const requestedRounds = Number(process.env.BENCHMARK_ROUNDS || "");
const benchmarkTiers = process.env.BENCHMARK_QUICK === "1"
  ? [{ ...tiers[0], rounds: 1 }]
  : requestedTiers.length
    ? tiers
        .filter((tier) => requestedTiers.some((item) => tier.name.includes(item) || String([...tier.text].length) === item))
        .map((tier) => ({
          ...tier,
          rounds: Number.isFinite(requestedRounds) && requestedRounds > 0
            ? Math.min(10, Math.floor(requestedRounds))
            : tier.rounds,
        }))
    : [...tiers];
if (!benchmarkTiers.length) throw new Error("BENCHMARK_TIERS did not match any tier");

const results: RunResult[] = [];

for (const [tierIndex, tier] of benchmarkTiers.entries()) {
  for (let round = 1; round <= tier.rounds; round += 1) {
    const startedAt = Date.now();
    try {
      const request = new NextRequest("http://localhost/api/translate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          "x-client-id": `fallback-benchmark-${tierIndex}-${round}-${Date.now()}`,
        },
        body: JSON.stringify({
          text: tier.text,
          direction: "to_scripture",
          mode: "original",
          level: "standard",
          edition: "cuv",
          plainMode: "direct",
          variation: round - 1,
        }),
      });
      const response = await POST(request);
      const payload = (await response.json()) as {
        result?: string;
        generationMode?: GenerationMode;
        warning?: string;
        error?: string;
        diagnostics?: unknown;
      };
      const item: RunResult = {
        tier: tier.name,
        sourceLength: [...tier.text].length,
        round,
        mode: response.ok && payload.result
          ? payload.generationMode || "structured"
          : "error",
        elapsedMs: Date.now() - startedAt,
        outputLength: [...(payload.result || "")].length,
        warning: Boolean(payload.warning),
        status: response.status,
        ...(payload.error ? { error: payload.error } : {}),
        ...(payload.diagnostics ? { diagnostics: payload.diagnostics } : {}),
      };
      results.push(item);
      await writeFile(outputFile, JSON.stringify({ complete: false, results }, null, 2), "utf8");
    } catch (error) {
      const item: RunResult = {
        tier: tier.name,
        sourceLength: [...tier.text].length,
        round,
        mode: "error",
        elapsedMs: Date.now() - startedAt,
        outputLength: 0,
        warning: false,
        status: 0,
        error: error instanceof Error ? error.message : "unknown error",
      };
      results.push(item);
      await writeFile(outputFile, JSON.stringify({ complete: false, results }, null, 2), "utf8");
    }
  }
}

const counts = Object.fromEntries(
  ["local_primary", "structured", "auto_repaired", "best_effort", "fallback", "error"].map(
    (mode) => [mode, results.filter((item) => item.mode === mode).length],
  ),
);
const elapsed = results.map((item) => item.elapsedMs).sort((a, b) => a - b);
const summary = {
  type: "summary",
  total: results.length,
  counts,
  fallbackRate: results.length ? counts.fallback / results.length : 0,
  degradedRate: results.length
    ? (counts.best_effort + counts.fallback + counts.error) / results.length
    : 0,
  repairedRate: results.length ? counts.auto_repaired / results.length : 0,
  averageMs: results.length
    ? Math.round(results.reduce((sum, item) => sum + item.elapsedMs, 0) / results.length)
    : 0,
  medianMs: elapsed.length ? elapsed[Math.floor(elapsed.length / 2)] : 0,
  maximumMs: elapsed.at(-1) || 0,
  byTier: benchmarkTiers.map((tier) => {
    const items = results.filter((item) => item.tier === tier.name);
    return {
      tier: tier.name,
      sourceLength: [...tier.text].length,
      rounds: items.length,
      counts: Object.fromEntries(
        ["structured", "auto_repaired", "best_effort", "fallback", "error"].map(
          (mode) => [mode, items.filter((item) => item.mode === mode).length],
        ),
      ),
      averageMs: items.length
        ? Math.round(items.reduce((sum, item) => sum + item.elapsedMs, 0) / items.length)
        : 0,
    };
  }),
};

await writeFile(
  outputFile,
  JSON.stringify({ complete: true, summary, results }, null, 2),
  "utf8",
);
