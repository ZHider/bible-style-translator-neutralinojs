import { NextRequest, NextResponse } from "next/server";
import { normalizeCuvSceneLexicon } from "@/lib/cuvLexicon";
import {
  buildPlainPrompt,
  buildScripturePrompt,
  PLAIN_SYSTEM_PROMPT,
  SCRIPTURE_SYSTEM_PROMPT,
  type PlainMode,
  type ScriptureDirection,
  type ScriptureLevel,
  type ScriptureMode,
} from "@/lib/prompt";
import { normalizeUnionNarration } from "@/lib/scriptureQuality";
import {
  buildSkeletonIdentificationPrompt,
  parseScriptureSkeletonPlan,
  renderEmergencyScripture,
  renderScriptureSkeletonPlan,
} from "@/lib/scriptureSkeletons";

export const runtime = "nodejs";

const VALID_MODES = new Set<ScriptureMode>([
  "original",
  "babel",
  "loaves",
  "david",
  "prodigal",
  "samaritan",
  "ark",
  "solomon",
  "jonah",
]);
const VALID_LEVELS = new Set<ScriptureLevel>(["light", "standard", "grand"]);
const VALID_DIRECTIONS = new Set<ScriptureDirection>([
  "to_scripture",
  "to_plain",
]);
const VALID_PLAIN_MODES = new Set<PlainMode>([
  "direct",
  "explain",
  "subtext",
  "roast",
]);

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_WINDOW_LIMIT = 12;
const RATE_DAY_LIMIT = 60;

type RateRecord = {
  windowStartedAt: number;
  windowCount: number;
  day: string;
  dayCount: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  scriptureRateLimit?: Map<string, RateRecord>;
};
const rateLimit =
  globalForRateLimit.scriptureRateLimit ?? new Map<string, RateRecord>();
globalForRateLimit.scriptureRateLimit = rateLimit;

function getShanghaiDay(now: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("cf-connecting-ip") || "unknown";
  const clientId = request.headers.get("x-client-id")?.slice(0, 80) || "anonymous";
  return `${ip}:${clientId}`;
}

function getUserApiKey(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const day = getShanghaiDay(now);
  const current = rateLimit.get(key);

  if (!current) {
    rateLimit.set(key, {
      windowStartedAt: now,
      windowCount: 1,
      day,
      dayCount: 1,
    });
    return null;
  }
  if (current.day !== day) {
    current.day = day;
    current.dayCount = 0;
  }
  if (now - current.windowStartedAt >= RATE_WINDOW_MS) {
    current.windowStartedAt = now;
    current.windowCount = 0;
  }
  if (current.windowCount >= RATE_WINDOW_LIMIT) {
    const retryAfter = Math.max(
      1,
      Math.ceil((RATE_WINDOW_MS - (now - current.windowStartedAt)) / 1000),
    );
    return { message: `请求稍多，请在 ${retryAfter} 秒后再试。`, retryAfter };
  }
  if (current.dayCount >= RATE_DAY_LIMIT) {
    return { message: "今日请求次数已达上限，请明日再来。", retryAfter: 3600 };
  }

  current.windowCount += 1;
  current.dayCount += 1;
  rateLimit.set(key, current);
  return null;
}

function cleanGeneratedText(value: string) {
  return value
    .trim()
    .replace(/^```(?:json|text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^#{1,6}\s+[^\n]+\n+/u, "")
    .replace(/^(?:改写结果|译文|正文|现代释义)[：:]\s*/u, "")
    .trim();
}

function upstreamErrorMessage(status: number, raw: string) {
  const normalized = raw.toLowerCase();
  if (status === 401 || status === 403) {
    return "API Key 无效或没有权限，请检查后重试。";
  }
  if (
    status === 402 ||
    normalized.includes("insufficient balance") ||
    normalized.includes("insufficient quota")
  ) {
    return "DeepSeek 账户余额或额度不足，请充值后重试。";
  }
  if (status === 429) {
    return "DeepSeek 当前请求繁忙或触发限流，请稍后再试。";
  }
  return "上游模型暂时没有回应，请稍后再试。";
}

type DeepSeekCallOptions = {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  deadlineAt: number;
  temperature?: number;
};

async function callDeepSeek(options: DeepSeekCallOptions) {
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com")
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const configuredCallTimeout = Number(
    process.env.DEEPSEEK_CALL_TIMEOUT_MS || "22000",
  );
  const callTimeout = Number.isFinite(configuredCallTimeout)
    ? Math.min(Math.max(configuredCallTimeout, 8000), 45000)
    : 22000;
  const remainingTime = options.deadlineAt - Date.now();
  if (remainingTime < 1000) {
    throw new DOMException("请求时间预算已用尽", "TimeoutError");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userPrompt },
      ],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(
      Math.max(1000, Math.min(callTimeout, remainingTime)),
    ),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error(upstreamErrorMessage(response.status, raw)), {
      status: response.status,
    });
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> };
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("上游返回了无法解析的内容，请稍后再试。");
  }
  const result = payload.choices?.[0]?.message?.content;
  if (!result?.trim()) throw new Error("模型没有生成有效内容，请重试。");
  return cleanGeneratedText(result);
}

function shouldExposeUpstreamError(error: unknown) {
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status: number }).status)
      : 0;
  return [401, 402, 403, 429].includes(status);
}

export async function POST(request: NextRequest) {
  const apiKey = getUserApiKey(request);
  if (!apiKey || apiKey.length < 20 || /\s/.test(apiKey)) {
    return NextResponse.json(
      { error: "请先配置有效的 DeepSeek API Key。" },
      { status: 401 },
    );
  }

  const limited = checkRateLimit(getClientKey(request));
  if (limited) {
    return NextResponse.json(
      { error: limited.message },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const direction = payload.direction as ScriptureDirection;
  const mode = payload.mode as ScriptureMode;
  const level = payload.level as ScriptureLevel;
  const plainMode = payload.plainMode as PlainMode;
  const isPlainDirection = direction === "to_plain";

  if (!text) {
    return NextResponse.json({ error: "请先输入要转换的文字。" }, { status: 400 });
  }
  if (!VALID_DIRECTIONS.has(direction) || !VALID_LEVELS.has(level)) {
    return NextResponse.json({ error: "转换选项无效。" }, { status: 400 });
  }
  if (!isPlainDirection && !VALID_MODES.has(mode)) {
    return NextResponse.json({ error: "文体选项无效。" }, { status: 400 });
  }
  if (isPlainDirection && !VALID_PLAIN_MODES.has(plainMode)) {
    return NextResponse.json({ error: "释义方式无效。" }, { status: 400 });
  }

  const maxInputLength = 3000;
  if (text.length > maxInputLength) {
    return NextResponse.json(
      {
        error: isPlainDirection
          ? "文体文本最多 3000 字，请分批解释。"
          : "现代文案最多 3000 字，请分批改写。",
      },
      { status: 400 },
    );
  }

  const configuredMax = Number(process.env.MAX_OUTPUT_TOKENS || "4096");
  const maxTokens = Number.isFinite(configuredMax)
    ? Math.min(Math.max(configuredMax, 512), 4096)
    : 4096;
  const configuredBudget = Number(
    process.env.TRANSLATE_TIME_BUDGET_MS || "45000",
  );
  const budgetMs = Number.isFinite(configuredBudget)
    ? Math.min(Math.max(configuredBudget, 30000), 90000)
    : 45000;
  const deadlineAt = Date.now() + budgetMs;

  try {
    if (isPlainDirection) {
      const result = await callDeepSeek({
        apiKey,
        deadlineAt,
        systemPrompt: PLAIN_SYSTEM_PROMPT,
        userPrompt: buildPlainPrompt(text, level, plainMode),
        maxTokens: Math.min(maxTokens, 900),
        temperature: 0.25,
      });
      return NextResponse.json({ result });
    }

    if (mode === "original") {
      let plan = null;
      for (let attempt = 0; attempt < 2 && Date.now() < deadlineAt - 3000; attempt += 1) {
        try {
          const rawPlan = await callDeepSeek({
            apiKey,
            deadlineAt,
            systemPrompt:
              "你是圣经小故事的情节编辑。把输入重组为连贯故事骨架，只保留人物阵营、核心冲突、关键因果、决定局势的发言、动作归属、伤害对象与结局；寒暄、重复对白和次要动作可以合并、调序或改成叙述。只输出严格 JSON，不得选择经文，不得写正文。",
            userPrompt: buildSkeletonIdentificationPrompt(text),
            maxTokens,
            temperature: 0.05,
          });
          plan = parseScriptureSkeletonPlan(rawPlan);
          if (plan) break;
        } catch (error) {
          if (shouldExposeUpstreamError(error)) throw error;
        }
      }

      const rendered = plan
        ? renderScriptureSkeletonPlan(plan)
        : renderEmergencyScripture(text);
      const result = normalizeCuvSceneLexicon(
        text,
        normalizeUnionNarration(rendered),
      );
      return NextResponse.json({ result });
    }

    const generated = await callDeepSeek({
      apiKey,
      deadlineAt,
      systemPrompt: SCRIPTURE_SYSTEM_PROMPT,
      userPrompt: buildScripturePrompt(text, mode, level),
      maxTokens,
      temperature: 0.55,
    });
    const result = normalizeCuvSceneLexicon(
      text,
      normalizeUnionNarration(generated),
    );
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json(
        { result: renderEmergencyScripture(text) },
        { status: 200 },
      );
    }
    const message = error instanceof Error ? error.message : "转换失败，请稍后重试。";
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status: number }).status)
        : 502;
    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
