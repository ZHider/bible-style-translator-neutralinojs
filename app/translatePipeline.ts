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
          const rawPlan = await callCompatibleModel(buildCallOptions({
            maxTokens: Math.min(
              maxTokens,
              structureTokenBudget(text, sourceGenre, options.level),
            ),
            temperature: 0.05,
            jsonObject: true,
            callTimeoutMs: planningCallTimeout([...text].length),
            systemPrompt:
              "你是和合本风格改写器的结构编辑。先保持输入原有文本类型：定义仍是定义，事实仍是事实，通知仍是通知，格言仍是格言，祝愿仍是祝愿，故事才整理成故事。只输出严格 JSON，不得选择经文，不得写正文。人物故事只在顶层 reflection 中提取一组由原文支持的人物、具体行为、实际结果、逻辑关系、褒贬方向和逐字证据；不得在 units 中写故事格言，不得凭空添加祝福、咒诅、因果或评价。",
            userPrompt: `${buildSkeletonIdentificationPrompt(text, previousIssues, options.level)}\n本次变化编号：${options.variation}。编号大于零时，可在语义兼容的骨架之间换一种表达。`,
          }));
          const parsedPlan = parseScriptureSkeletonPlan(rawPlan);
          if (!parsedPlan) {
            previousIssues = ["返回内容不是可解析的完整结构 JSON"];
            continue;
          }
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
            score: Math.max(
              0,
              resultAssessment.score - critical.length * 0.24 - advisory.length * 0.025,
            ),
            issues: allIssues,
            critical,
          };

          if (assessment.critical.length === 0 && assessment.score > bestScore) {
            bestScore = assessment.score;
            bestPlan = groundedPlan;
            bestIssues = assessment.issues;
          }
          if (assessment.acceptable) {
            plan = groundedPlan;
            bestIssues = assessment.issues;
            break;
          }
          previousIssues = assessment.critical.length
            ? assessment.critical
            : assessment.issues.filter((issue) => /篇幅/u.test(issue));
          if (!previousIssues.length) {
            plan = groundedPlan;
            break;
          }
        } catch (error) {
          if (shouldExposeUpstreamError(error)) throw error;
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

      // 降级：直接生成
      let rescueResult = "";
      let rescueIssues: string[] = [];
      let rescueScore = Number.NEGATIVE_INFINITY;

      for (let attempt = 0; attempt < 2 && Date.now() < deadlineAt - 2500; attempt += 1) {
        try {
          const generated = await callCompatibleModel(buildCallOptions({
            maxTokens: Math.min(
              maxTokens,
              Math.max(1200, structureTokenBudget(text, sourceGenre, options.level) + 700),
            ),
            temperature: attempt === 0 ? 0.42 : 0.28,
            callTimeoutMs: Math.max(10000, Math.min(24000, deadlineAt - Date.now() - 1000)),
            systemPrompt: SCRIPTURE_SYSTEM_PROMPT,
            userPrompt: `${buildScripturePrompt(text, options.mode, options.level)}\n\n${buildLengthInstruction(lengthTarget, options.level)}`,
          }));
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

          if (factuallySafe && score > rescueScore) {
            rescueScore = score;
            rescueResult = generated;
            rescueIssues = allIssues;
          }
          if (factuallySafe && lengthAssessment.acceptable) {
            return buildScriptureResponse(text, generated, options.edition, "auto_repaired");
          }
        } catch (error) {
          if (shouldExposeUpstreamError(error)) throw error;
        }
      }

      if (rescueResult) {
        return buildScriptureResponse(
          text,
          rescueResult,
          options.edition,
          "best_effort",
          `结构化生成未通过，已改用直接生成的最佳版本；${rescueIssues[0] || "个别指标未完全达到目标"}。`,
        );
      }

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
          generated = await callCompatibleModel(buildCallOptions({
            maxTokens: Math.min(
              maxTokens,
              Math.max(700, structureTokenBudget(text, sourceGenre, options.level)),
            ),
            temperature: attempt === 0 ? 0.42 : 0.25,
            systemPrompt: options.edition === "kjv" ? KJV_SYSTEM_PROMPT : SIGAO_SYSTEM_PROMPT,
            userPrompt: buildEditionPrompt(
              text,
              options.edition,
              buildLengthInstruction(lengthTarget, options.level),
              options.variation,
              retryIssues,
            ),
          }));
        } catch (error) {
          if (shouldExposeUpstreamError(error) || attempt > 0) throw error;
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
        if (distance < bestDistance) {
          bestDistance = distance;
          bestResult = generated;
        }
        if (lengthAssessment.acceptable && storyIssues.length === 0) {
          return buildScriptureResponse(
            text,
            generated,
            options.edition,
            attempt ? "auto_repaired" : "structured",
          );
        }
        retryIssues = [
          ...(lengthAssessment.acceptable ? [] : [lengthAssessment.issue]),
          ...storyIssues,
        ];
      }
      if (bestResult) {
        return buildScriptureResponse(
          text,
          bestResult,
          options.edition,
          "best_effort",
          "正文已经生成，但篇幅或事实校验仍有轻微偏差；系统展示了本次最佳版本。",
        );
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
      return {
        error: `模型请求超时，系统没有返回近似原文的保守稿；请点击\u201C再写一次\u201D，或缩短输入后重试。`,
        result: "",
        verses: [],
      };
    }
    const message = error instanceof Error ? error.message : "转换失败，请稍后重试。";
    return { error: message, result: "", verses: [] };
  }
}
