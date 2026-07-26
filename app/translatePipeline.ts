/**
 * 翻译管线 —— 桌面端（Neutralinojs）前端翻译编排。
 *
 * 将原来 app/api/translate/route.ts 中 POST handler 的业务逻辑
 * 完整抽离到前端。不依赖 NextRequest/NextResponse。
 *
 * 通过 build-time 环境变量 NEXT_PUBLIC_DESKTOP=true 启用。
 */

import {
  buildEditionPrompt,
  buildPlainPrompt,
  buildScripturePrompt,
  KJV_SYSTEM_PROMPT,
  PLAIN_SYSTEM_PROMPT,
  SCRIPTURE_SYSTEM_PROMPT,
  SIGAO_SYSTEM_PROMPT,
  type PlainMode,
  type ScriptureDirection,
  type ScriptureEdition,
  type ScriptureLevel,
  type ScriptureMode,
} from "@/lib/prompt";
import { normalizeCuvSceneLexicon } from "@/lib/cuvLexicon";
import { normalizeUnionNarration } from "@/lib/scriptureQuality";
import {
  classifyScriptureSource,
  definitionTermsArePreserved,
  hasForbiddenMoralization,
  renderDefinitionSource,
  renderSafeFactualSource,
} from "@/lib/scriptureGenre";
import {
  assessScriptureStoryPlan,
  assessScriptureStoryResult,
  buildSkeletonIdentificationPrompt,
  groundScriptureSkeletonPlan,
  parseScriptureSkeletonPlan,
  renderScriptureSkeletonPlan,
  type ScriptureSkeletonPlan,
} from "@/lib/scriptureSkeletons";
import { segmentScriptureText } from "@/lib/scriptureVerses";
import { renderRecognizableSourceAphorism } from "@/lib/cuvAphorismSkeletons";
import {
  assessScriptureLength,
  buildLengthInstruction,
  getScriptureLengthTarget,
  structureTokenBudget,
} from "@/lib/scriptureLength";
import {
  isCriticalStoryIssue,
  splitStoryIssues,
} from "@/lib/storyIssueSeverity";
import {
  callCompatibleModel,
  cleanGeneratedText,
  type DeepSeekCallOptions,
} from "@/app/aiProxy";

// ── Debug 日志 ─────────────────────────────────────────────
// 设为 true 时打印每次 AI 调用和检查结果到控制台
const DEBUG = true;

function logDebug(...args: unknown[]) {
  if (!DEBUG) return;
  // 使用 ANSI 颜色区分阶段
  const prefix = "%c[translatePipeline]";
  const style = "color:#8e44ad;font-weight:bold";
  console.log(prefix, style, ...args);
}

function logDebugStage(stage: string, ...args: unknown[]) {
  if (!DEBUG) return;
  const colors: Record<string, string> = {
    input: "#2980b9",
    output: "#27ae60",
    assessment: "#e67e22",
    decision: "#c0392b",
  };
  const color = colors[stage] || "#7f8c8d";
  console.log(`%c[${stage}]`, `color:${color};font-weight:bold`, ...args);
}

// ── 类型定义 ───────────────────────────────────────────────

type GenerationMode =
  | "local_primary"
  | "structured"
  | "auto_repaired"
  | "best_effort";

export type TranslatePipelineOptions = {
  text: string;
  direction: ScriptureDirection;
  mode: ScriptureMode;
  plainMode: PlainMode;
  level: ScriptureLevel;
  edition: ScriptureEdition;
  apiKey: string;
  apiModel?: string;
  variation: number;
};

export type TranslatePipelineResult = {
  result: string;
  verses: Array<{ number: number; text: string }>;
  warning?: string;
  generationMode?: string;
  error?: string;
};

// ── 固定常量（从 route.ts 复制） ──────────────────────────

const VALID_MODES = new Set<ScriptureMode>([
  "original", "babel", "loaves", "david", "prodigal",
  "samaritan", "ark", "solomon", "jonah",
]);
const VALID_LEVELS = new Set<ScriptureLevel>(["light", "standard", "grand"]);
const VALID_EDITIONS = new Set<ScriptureEdition>(["cuv", "sigao", "kjv"]);
const VALID_DIRECTIONS = new Set<ScriptureDirection>(["to_scripture", "to_plain"]);
const VALID_PLAIN_MODES = new Set<PlainMode>(["direct", "explain", "subtext", "roast"]);

// ── 验证 ───────────────────────────────────────────────────

function validateInput(options: TranslatePipelineOptions): string | null {
  const { text, direction, edition, mode, level, plainMode, apiKey } = options;

  if (!apiKey || apiKey.length < 20 || /\s/.test(apiKey)) {
    return "请先配置有效的模型 API Key。";
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return "请先输入要转换的文字。";
  }
  if (!VALID_DIRECTIONS.has(direction) || !VALID_LEVELS.has(level)) {
    return "转换选项无效。";
  }
  const isPlain = direction === "to_plain";
  if (!isPlain && !VALID_EDITIONS.has(edition)) {
    return "译本风格选项无效。";
  }
  if (!isPlain && !VALID_MODES.has(mode)) {
    return "文体选项无效。";
  }
  if (isPlain && !VALID_PLAIN_MODES.has(plainMode)) {
    return "释义方式无效。";
  }
  const maxInputLength = 3000;
  if (trimmed.length > maxInputLength) {
    return isPlain
      ? "文体文本最多 3000 字，请分批解释。"
      : "现代文案最多 3000 字，请分批改写。";
  }
  if (options.apiModel && !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/u.test(options.apiModel)) {
    return "模型名称格式无效；请只使用字母、数字、点、横线、斜线或冒号。";
  }
  return null;
}

// ── 辅助函数 ───────────────────────────────────────────────

function finalizeScriptureResult(
  source: string,
  value: string,
  edition: ScriptureEdition = "cuv",
) {
  let result = value.trim();
  if (edition === "cuv") {
    result = normalizeCuvSceneLexicon(source, normalizeUnionNarration(result));
    if (
      hasForbiddenMoralization(source, result) ||
      !definitionTermsArePreserved(source, result)
    ) {
      result = renderSafeFactualSource(source);
    }
  }
  return { result, verses: segmentScriptureText(result) };
}

function buildScriptureResponse(
  source: string,
  value: string,
  edition: ScriptureEdition,
  generationMode: GenerationMode,
  warning?: string,
) {
  return {
    ...finalizeScriptureResult(source, value, edition),
    generationMode,
    ...(warning ? { warning } : {}),
  };
}

function planningCallTimeout(sourceLength: number): number {
  if (sourceLength >= 1000) return 36000;
  if (sourceLength >= 500) return 30000;
  if (sourceLength >= 250) return 26000;
  return 22000;
}

function shouldExposeUpstreamError(error: unknown): boolean {
  return [400, 401, 402, 403, 404, 422, 429].includes(
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: number }).status || 0)
      : 0,
  );
}

// ── 主管线 ─────────────────────────────────────────────────

export async function translatePipeline(
  options: TranslatePipelineOptions,
): Promise<TranslatePipelineResult> {
  // 1. 输入验证
  const validationError = validateInput(options);
  if (validationError) {
    return { error: validationError, result: "", verses: [] };
  }

  const text = options.text.trim();
  const isPlainDirection = options.direction === "to_plain";
  const maxTokens = 4096;
  const budgetMs = 45000;
  const deadlineAt = Date.now() + budgetMs;
  logDebugStage("input", `方向=${options.direction}, 版本=${options.edition}, 模式=${options.mode}, 强度=${options.level}, 变化=${options.variation}`);
  logDebugStage("input", "原文:", text);

  // 构建 call 参数
  const buildCallOptions = (
    overrides: Partial<DeepSeekCallOptions>,
  ): DeepSeekCallOptions => ({
    apiKey: options.apiKey,
    model: options.apiModel || undefined,
    deadlineAt,
    maxTokens: Math.min(maxTokens, overrides.maxTokens || 4096),
    temperature: overrides.temperature ?? 0.2,
    systemPrompt: overrides.systemPrompt || "",
    userPrompt: overrides.userPrompt || "",
    ...overrides,
  });

  try {
    // 2. 白话方向：单次调用
    if (isPlainDirection) {
      logDebugStage("output", "── to_plain 方向：单次调用 ──");
      const result = await callCompatibleModel(buildCallOptions({
        maxTokens: 900,
        temperature: 0.25,
        systemPrompt: PLAIN_SYSTEM_PROMPT,
        userPrompt: buildPlainPrompt(text, options.level, options.plainMode),
      }));
      return { result, verses: [] };
    }

    // 3. 经文方向
    const sourceGenre = classifyScriptureSource(text);
    const lengthTarget = getScriptureLengthTarget(text, sourceGenre, options.level, options.edition);

    // 3a. 本地定义渲染
    if (options.edition === "cuv" && options.mode === "original" && sourceGenre === "definition") {
      return buildScriptureResponse(text, renderDefinitionSource(text), options.edition, "local_primary");
    }

    // 3b. 本地格言匹配
    const recognizableAphorism =
      options.edition === "cuv" && sourceGenre === "aphorism"
        ? renderRecognizableSourceAphorism(text)
        : "";
    if (recognizableAphorism && options.level !== "grand" && options.variation === 0) {
      return buildScriptureResponse(text, recognizableAphorism, options.edition, "local_primary");
    }

    // 3c. CUV 骨架管线
    if (options.edition === "cuv" && options.mode === "original") {
      let plan: ScriptureSkeletonPlan | null = null;
      let bestPlan: ScriptureSkeletonPlan | null = null;
      let bestScore = -1;
      let bestIssues: string[] = [];
      let previousIssues: string[] = [];

      for (let attempt = 0; attempt < 2 && Date.now() < deadlineAt - 4500; attempt += 1) {
        try {
          logDebugStage("output", `── Phase 1 骨架识别 第${attempt + 1}/${2}次调用 ──`);
          const systemPrompt1 = "你是和合本风格改写器的结构编辑。先保持输入原有文本类型：定义仍是定义，事实仍是事实，通知仍是通知，格言仍是格言，祝愿仍是祝愿，故事才整理成故事。只输出严格 JSON，不得选择经文，不得写正文。人物故事只在顶层 reflection 中提取一组由原文支持的人物、具体行为、实际结果、逻辑关系、褒贬方向和逐字证据；不得在 units 中写故事格言，不得凭空添加祝福、咒诅、因果或评价。";
          const userPrompt1 = `${buildSkeletonIdentificationPrompt(text, previousIssues, options.level)}\n本次变化编号：${options.variation}。编号大于零时，可在语义兼容的骨架之间换一种表达。`;
          logDebugStage("input", "系统提示词:", systemPrompt1);
          logDebugStage("input", "用户提示词:", userPrompt1);
          logDebugStage("input", `参数: temp=0.05, jsonObject=true, maxTokens=${structureTokenBudget(text, sourceGenre, options.level)}`);
          const maxTokens1 = Math.min(maxTokens, structureTokenBudget(text, sourceGenre, options.level));
          const rawPlan = await callCompatibleModel({
            apiKey: options.apiKey,
            model: options.apiModel || undefined,
            deadlineAt,
            maxTokens: maxTokens1,
            temperature: 0.05,
            jsonObject: true,
            callTimeoutMs: planningCallTimeout([...text].length),
            systemPrompt: systemPrompt1,
            userPrompt: userPrompt1,
          });
          logDebugStage("output", "AI 返回:", rawPlan);
          const parsedPlan = parseScriptureSkeletonPlan(rawPlan);
          if (!parsedPlan) {
            logDebugStage("assessment", "JSON 解析失败，设 previousIssues 重试");
            previousIssues = ["返回内容不是可解析的完整结构 JSON"];
            continue;
          }
          logDebugStage("assessment", "JSON 解析成功");
          const groundedPlan = groundScriptureSkeletonPlan(parsedPlan, text);
          const planIssues = assessScriptureStoryPlan(groundedPlan, text);
          const candidateResult = renderScriptureSkeletonPlan(groundedPlan, text);
          const resultAssessment = assessScriptureStoryResult(text, candidateResult);
          const lengthAssessment = assessScriptureLength(candidateResult, lengthTarget, options.edition);
          const allIssues = [
            ...planIssues,
            ...resultAssessment.issues,
            ...(lengthAssessment.acceptable ? [] : [lengthAssessment.issue]),
          ];
          const { critical, advisory } = splitStoryIssues(allIssues, text, options.level);
          const assessment = {
            acceptable: critical.length === 0 && lengthAssessment.acceptable,
            score: Math.max(0, resultAssessment.score - critical.length * 0.24 - advisory.length * 0.025),
            issues: allIssues,
            critical,
          };
          logDebugStage("assessment", `acceptable=${assessment.acceptable}, score=${assessment.score.toFixed(3)}, critical=${critical.length}, advisory=${advisory.length}`);
          if (critical.length > 0) {
            logDebugStage("assessment", "关键问题:", critical);
          }
          if (advisory.length > 0) {
            logDebugStage("assessment", "建议问题:", advisory);
          }
          if (assessment.score > bestScore) {
            logDebugStage("decision", `保存最佳方案: score=${assessment.score.toFixed(3)} (之前best=${bestScore})`);
          }
          if (assessment.critical.length === 0 && assessment.score > bestScore) {
            bestScore = assessment.score;
            bestPlan = groundedPlan;
            bestIssues = assessment.issues;
          }
          if (assessment.acceptable) {
            logDebugStage("decision", "✅ 方案可接受，跳出重试循环");
            plan = groundedPlan;
            bestIssues = assessment.issues;
            break;
          }
          previousIssues = assessment.critical.length
            ? assessment.critical
            : assessment.issues.filter((issue) => /篇幅/u.test(issue));
          if (!previousIssues.length) {
            logDebugStage("decision", "无反馈问题，接受当前方案");
            plan = groundedPlan;
            break;
          }
          logDebugStage("decision", `需要重试，反馈问题: ${previousIssues.slice(0, 3).join("; ")}`);
        } catch (error) {
          if (shouldExposeUpstreamError(error)) throw error;
          logDebugStage("decision", `调用异常: ${error instanceof Error ? error.message : String(error)}，设 previousIssues 重试`);
          previousIssues = ["上一次结构生成中断，必须重新输出完整 JSON"];
        }
      }

      plan ??= bestPlan;

      if (plan) {
        const rendered = renderScriptureSkeletonPlan(plan, text);
        const warning = bestIssues.length
          ? "正文已经生成；系统保留了事实正确的最佳版本，个别篇幅或风格指标可能未完全达到目标。"
          : undefined;
        return buildScriptureResponse(
          text,
          rendered,
          options.edition,
          bestPlan && bestScore ? "auto_repaired" : warning ? "best_effort" : "structured",
          warning,
        );
      }


      logDebugStage("decision", `── Phase 1 结束 ── plan=${plan ? "有方案" : "null"}, bestPlan=${bestPlan ? "有" : "null"}, bestScore=${bestScore.toFixed(3)}`);

      logDebugStage("decision", "── Phase 2 降级直接生成 ──");
      let rescueResult = "";
      let rescueIssues: string[] = [];
      let rescueScore = Number.NEGATIVE_INFINITY;

      for (let attempt = 0; attempt < 2 && Date.now() < deadlineAt - 2500; attempt += 1) {
        try {
          logDebugStage("output", `── Phase 2 直接生成 第${attempt + 1}/${2}次调用 ──`);
          const systemPrompt2 = SCRIPTURE_SYSTEM_PROMPT;
          const userPrompt2 = `${buildScripturePrompt(text, options.mode, options.level)}\n\n${buildLengthInstruction(lengthTarget, options.level)}`;
          logDebugStage("input", "系统提示词:", systemPrompt2);
          logDebugStage("input", "用户提示词:", userPrompt2);
          logDebugStage("input", `参数: temp=${attempt === 0 ? 0.42 : 0.28}, maxTokens=${Math.min(maxTokens, Math.max(1200, structureTokenBudget(text, sourceGenre, options.level) + 700))}`);
          const generated = await callCompatibleModel({
            apiKey: options.apiKey,
            model: options.apiModel || undefined,
            deadlineAt,
            maxTokens: Math.min(maxTokens, Math.max(1200, structureTokenBudget(text, sourceGenre, options.level) + 700)),
            temperature: attempt === 0 ? 0.42 : 0.28,
            callTimeoutMs: Math.max(10000, Math.min(24000, deadlineAt - Date.now() - 1000)),
            systemPrompt: systemPrompt2,
            userPrompt: userPrompt2,
          });
          logDebugStage("output", "AI 返回:", generated);
          const resultAssessment = assessScriptureStoryResult(text, generated);
          const lengthAssessment = assessScriptureLength(generated, lengthTarget, options.edition);
          const allIssues = [
            ...resultAssessment.issues,
            ...(lengthAssessment.acceptable ? [] : [lengthAssessment.issue]),
          ];
          const { critical } = splitStoryIssues(allIssues, text, options.level);
          const score =
            resultAssessment.score -
            critical.length * 2 -
            Math.abs(lengthAssessment.actual - lengthTarget.ideal) / 1000;
          const factuallySafe = critical.length === 0 && resultAssessment.score >= 0.58;

          logDebugStage("assessment", `factuallySafe=${factuallySafe}, score=${score.toFixed(3)}, resultScore=${resultAssessment.score.toFixed(3)}, critical=${critical.length}, actualLength=${lengthAssessment.actual}, idealLength=${lengthTarget.ideal}`);
          if (critical.length > 0) {
            logDebugStage("assessment", "关键问题:", critical);
          }
          if (allIssues.length > 0) {
            logDebugStage("assessment", "所有问题:", allIssues);
          }

          if (factuallySafe && score > rescueScore) {
            rescueScore = score;
            rescueResult = generated;
            rescueIssues = allIssues;
            logDebugStage("decision", `保存 best_effort: score=${score.toFixed(3)}`);
          }
          if (factuallySafe && lengthAssessment.acceptable) {
            logDebugStage("decision", "✅ 直接生成结果可接受，返回 auto_repaired");
            return buildScriptureResponse(text, generated, options.edition, "auto_repaired");
          }
          logDebugStage("decision", factuallySafe ? "结果事实安全但篇幅不达标，继续尝试" : "结果事实不安全，继续尝试");
        } catch (error) {
          if (shouldExposeUpstreamError(error)) throw error;
          logDebugStage("decision", `调用异常: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (rescueResult) {
        logDebugStage("decision", `采用 best_effort 方案, score=${rescueScore.toFixed(3)}`);
        return buildScriptureResponse(
          text,
          rescueResult,
          options.edition,
          "best_effort",
          `结构化生成未通过，已改用直接生成的最佳版本；${rescueIssues[0] || "个别指标未完全达到目标"}。`,
        );
      }

      logDebugStage("decision", "❌ 全部 4 次调用均未通过检查，返回错误");
      return {
        error: `本次未能在时间预算内生成可靠的和合本改写；系统没有返回近似原文的保守稿。请点击\u201C再写一次\u201D，或缩短输入后重试。`,
        result: "",
        verses: [],
      };

    }

    // 3d. 非 CUV 版本（思高/KJV）
    if (options.edition !== "cuv") {
      let bestResult = "";
      let bestDistance = Number.POSITIVE_INFINITY;
      let retryIssues: string[] = [];

      for (let attempt = 0; attempt < 2 && Date.now() < deadlineAt - 3500; attempt += 1) {
        let generated = "";
        try {
          logDebugStage("output", `── ${options.edition} 版本 第${attempt + 1}/${2}次调用 ──`);
          const systemPrompt3 = options.edition === "kjv" ? KJV_SYSTEM_PROMPT : SIGAO_SYSTEM_PROMPT;
          const userPrompt3 = buildEditionPrompt(text, options.edition, buildLengthInstruction(lengthTarget, options.level), options.variation, retryIssues);
          logDebugStage("input", "系统提示词:", systemPrompt3);
          logDebugStage("input", "用户提示词:", userPrompt3);
          generated = await callCompatibleModel({
            apiKey: options.apiKey,
            model: options.apiModel || undefined,
            deadlineAt,
            maxTokens: Math.min(maxTokens, Math.max(700, structureTokenBudget(text, sourceGenre, options.level))),
            temperature: attempt === 0 ? 0.42 : 0.25,
            systemPrompt: systemPrompt3,
            userPrompt: userPrompt3,
          });
          logDebugStage("output", "AI 返回:", generated);
        } catch (error) {
          if (shouldExposeUpstreamError(error) || attempt > 0) throw error;
          logDebugStage("decision", `调用异常，设 retryIssues 重试: ${error instanceof Error ? error.message : String(error)}`);
          retryIssues = ["The previous generation was interrupted; return one complete rewritten text."];
          continue;
        }
        const lengthAssessment = assessScriptureLength(generated, lengthTarget, options.edition);
        const storyIssues =
          options.edition === "sigao" && sourceGenre === "story"
            ? assessScriptureStoryResult(text, generated).issues.filter((issue) =>
                isCriticalStoryIssue(issue, text, options.level),
              )
            : [];
        const distance = Math.abs(lengthAssessment.actual - lengthTarget.ideal) + storyIssues.length * 1000;
        logDebugStage("assessment", `lengthAcceptable=${lengthAssessment.acceptable}, storyIssues=${storyIssues.length}, distance=${distance.toFixed(0)}`);
        if (storyIssues.length > 0) {
          logDebugStage("assessment", "关键故事问题:", storyIssues);
        }
        if (distance < bestDistance) {
          bestDistance = distance;
          bestResult = generated;
          logDebugStage("decision", `更新最佳距离: ${bestDistance.toFixed(0)}`);
        }
        if (lengthAssessment.acceptable && storyIssues.length === 0) {
          logDebugStage("decision", `✅ ${options.edition} 版本结果可接受`);
          return buildScriptureResponse(text, generated, options.edition, attempt ? "auto_repaired" : "structured");
        }
        retryIssues = [...(lengthAssessment.acceptable ? [] : [lengthAssessment.issue]), ...storyIssues];
        logDebugStage("decision", `需要重试，问题: ${retryIssues.slice(0, 3).join("; ")}`);
      }
      if (bestResult) {
        logDebugStage("decision", `采用 best_effort 方案, distance=${bestDistance.toFixed(0)}`);
        return buildScriptureResponse(text, bestResult, options.edition, "best_effort", "正文已经生成，但篇幅或事实校验仍有轻微偏差；系统展示了本次最佳版本。");
      }
    }

    // 3e. 兜底常规生成
    const generated = await callCompatibleModel(buildCallOptions({
      maxTokens,
      temperature: 0.55,
      systemPrompt: SCRIPTURE_SYSTEM_PROMPT,
      userPrompt: buildScripturePrompt(text, options.mode, options.level),
    }));
    return buildScriptureResponse(text, generated, options.edition, "structured");

  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      logDebugStage("decision", "❌ 总超时");
      return {
        error: `模型请求超时，系统没有返回近似原文的保守稿；请点击\u201C再写一次\u201D，或缩短输入后重试。`,
        result: "",
        verses: [],
      };
    }
    const message = error instanceof Error ? error.message : "转换失败，请稍后重试。";
    logDebugStage("decision", `❌ 未捕获异常: ${message}`);
    return { error: message, result: "", verses: [] };
  }
}
