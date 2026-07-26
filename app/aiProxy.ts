/**
 * AI API 调用代理 —— 桌面端（Neutralinojs）通过 Neutralino.net.post 直连 DeepSeek，
 * 绕过 WebView CORS 限制。不依赖任何 Node.js API。
 */

// Neutralino.net 不识别 @types 声明，需扩展全局
declare const Neutralino: {
  net: {
    post: (
      url: string,
      options: {
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
      },
    ) => Promise<{
      status: number;
      statusText: string;
      body: string;
      headers: Record<string, string>;
    }>;
  };
};

export type DeepSeekCallOptions = {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  deadlineAt: number;
  temperature?: number;
  jsonObject?: boolean;
  model?: string;
  systemRole?: boolean;
  tokenField?: "max_tokens" | "max_completion_tokens";
  omitTemperature?: boolean;
  reasoningControl?: "deepseek" | "qwen" | false;
  callTimeoutMs?: number;
};

export type ModelCapability = {
  model: string;
  jsonObject: boolean;
  systemRole: boolean;
  tokenField: "max_tokens" | "max_completion_tokens";
  temperature: boolean;
  reasoningControl: "deepseek" | "qwen" | false;
};

// ── 配置（桌面端硬编码默认值，用户可在界面中覆盖） ─────────────────────

export function modelBaseUrl(): string {
  // 桌面端固定使用 DeepSeek 官方 API
  return "https://api.deepseek.com";
}

export function configuredModel(): string {
  return "deepseek-v4-flash";
}

export function providerReasoningControl(baseUrl: string): "deepseek" | "qwen" | false {
  if (/deepseek/u.test(baseUrl)) return "deepseek";
  if (/dashscope|aliyun|qwen/u.test(baseUrl)) return "qwen";
  return false;
}

export function providerModelCandidates(baseUrl: string, preferred: string): string[] {
  const providerCandidates = /dashscope|aliyun|qwen/u.test(baseUrl)
    ? ["qwen-plus", "qwen-turbo", "qwen-max"]
    : /bigmodel|zhipu|glm/u.test(baseUrl)
      ? ["glm-4-flash", "glm-4-plus", "glm-4"]
      : /moonshot|kimi/u.test(baseUrl)
        ? ["kimi-k2-turbo-preview", "moonshot-v1-8k"]
        : /openai/u.test(baseUrl)
          ? ["gpt-4.1-mini", "gpt-4o-mini"]
          : /deepseek/u.test(baseUrl)
            ? ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"]
            : [];
  return [...new Set([preferred, ...providerCandidates])];
}

// ── 兼容性检测 ─────────────────────────────────────────────

export function isModelNameCompatibilityError(raw: string): boolean {
  return /supported api model|unsupported model|model.{0,20}(?:not found|does not exist|not supported|invalid)|invalid.{0,12}model/u.test(raw);
}

export function isJsonModeCompatibilityError(raw: string): boolean {
  return /response_format|json_object|json mode|structured output/u.test(raw) &&
    /unsupported|not support|unknown|invalid|unrecognized|not allowed/u.test(raw);
}

export function isSystemRoleCompatibilityError(raw: string): boolean {
  return /system.{0,20}(?:role|message)|role.{0,20}system/u.test(raw) &&
    /unsupported|not support|invalid|not allowed/u.test(raw);
}

export function isTokenFieldCompatibilityError(raw: string): boolean {
  return /max_tokens|max_completion_tokens/u.test(raw) &&
    /unsupported|unknown|unrecognized|invalid/u.test(raw);
}

export function isTemperatureCompatibilityError(raw: string): boolean {
  return /temperature/u.test(raw) &&
    /unsupported|not support|unknown|unrecognized|invalid|only the default/u.test(raw);
}

export function isReasoningControlCompatibilityError(raw: string): boolean {
  return /thinking|enable_thinking|reasoning/u.test(raw) &&
    /unsupported|not support|unknown|unrecognized|invalid|not allowed|extra inputs/u.test(raw);
}

export function extractSupportedModels(raw: string): string[] {
  const matches = raw.match(
    /\b(?:deepseek|qwen|glm|gpt|o\d|kimi|moonshot|mistral|llama|claude)[A-Za-z0-9._-]*\b/giu,
  ) || [];
  return [...new Set(matches)].sort((left, right) => {
    const fast = (value: string) => Number(/flash|mini|turbo/u.test(value));
    return fast(right) - fast(left);
  });
}

export function upstreamErrorMessage(status: number, raw: string): string {
  const normalized = raw.toLowerCase();
  if (status === 400 && normalized.includes("supported api model names")) {
    return "当前配置的模型名称不受接口支持，请将模型名改为 deepseek-v4-flash 或接口列出的可用模型。";
  }
  if (status === 400) {
    return "模型拒绝了本次请求参数，系统没有使用固定兜底稿冒充结果；请检查接口模型配置后重试。";
  }
  if (status === 401 || status === 403) {
    return "模型接口的 API Key 无效或没有权限，请检查 Key、接口地址与模型后重试。";
  }
  if (status === 402 || normalized.includes("insufficient balance") || normalized.includes("insufficient quota")) {
    return "模型接口账户余额或额度不足，请充值后重试。";
  }
  if (status === 429) {
    return "模型接口当前繁忙或触发限流，请稍后再试。";
  }
  return "上游模型暂时没有回应，请稍后再试。";
}

// ── 核心调用 ───────────────────────────────────────────────

export function cleanGeneratedText(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json|text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^#{1,6}\s+[^\n]+\n+/u, "")
    .replace(/^(?:改写结果|译文|正文|现代释义)[：:]\s*/u, "")
    .trim();
}

function errorRaw(error: unknown): string {
  return typeof error === "object" && error && "raw" in error
    ? String((error as { raw?: string }).raw || "")
    : "";
}

function errorStatus(error: unknown): number {
  return typeof error === "object" && error && "status" in error
    ? Number((error as { status?: number }).status || 0)
    : 0;
}

async function callDeepSeek(options: DeepSeekCallOptions): Promise<string> {
  const baseUrl = modelBaseUrl();
  const model = options.model || configuredModel();
  const configuredCallTimeout = 22000;
  const callTimeout = Math.min(Math.max(configuredCallTimeout, 8000), 45000);
  const remainingTime = options.deadlineAt - Date.now();
  if (remainingTime < 1000) {
    throw new DOMException("请求时间预算已用尽", "TimeoutError");
  }

  const messages = options.systemRole === false
    ? [{ role: "user" as const, content: `${options.systemPrompt}\n\n${options.userPrompt}` }]
    : [
        { role: "system" as const, content: options.systemPrompt },
        { role: "user" as const, content: options.userPrompt },
      ];

  const bodyObj: Record<string, unknown> = {
    model,
    messages,
    ...(options.omitTemperature ? {} : { temperature: options.temperature ?? 0.2 }),
    ...(options.reasoningControl === "deepseek"
      ? { thinking: { type: "disabled" } }
      : options.reasoningControl === "qwen"
        ? { enable_thinking: false }
        : {}),
    [options.tokenField || "max_tokens"]: options.maxTokens,
    stream: false,
    ...(options.jsonObject ? { response_format: { type: "json_object" } } : {}),
  };

  const response = await Neutralino.net.post(`${baseUrl}/chat/completions`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(bodyObj),
    timeout: Math.max(1000, Math.min(callTimeout, remainingTime)),
  });

  const raw = response.body;
  if (response.status >= 400) {
    throw Object.assign(
      new Error(upstreamErrorMessage(response.status, raw)),
      { status: response.status, raw, model },
    );
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

const modelCapabilityCache = new Map<string, ModelCapability>();

export async function callCompatibleModel(options: DeepSeekCallOptions): Promise<string> {
  const baseUrl = modelBaseUrl();
  const preferred = options.model?.trim() || configuredModel();
  const cacheKey = `${baseUrl}|${preferred}`;
  const cached = modelCapabilityCache.get(cacheKey);
  const modelQueue = providerModelCandidates(baseUrl, preferred);
  if (cached) {
    modelQueue.splice(0, modelQueue.length, cached.model, ...modelQueue);
  }

  let capability: ModelCapability = cached || {
    model: modelQueue.shift() || preferred,
    jsonObject: Boolean(options.jsonObject),
    systemRole: true,
    tokenField: "max_tokens",
    temperature: true,
    reasoningControl: providerReasoningControl(baseUrl),
  };
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await callDeepSeek({
        ...options,
        model: capability.model,
        jsonObject: options.jsonObject ? capability.jsonObject : false,
        systemRole: capability.systemRole,
        tokenField: capability.tokenField,
        omitTemperature: !capability.temperature,
        reasoningControl: capability.reasoningControl,
      });
      modelCapabilityCache.set(cacheKey, capability);
      return result;
    } catch (error) {
      lastError = error;
      const status = errorStatus(error);
      const raw = errorRaw(error).toLowerCase();
      if (![400, 404, 422].includes(status)) throw error;

      if (options.jsonObject && capability.jsonObject && isJsonModeCompatibilityError(raw)) {
        capability = { ...capability, jsonObject: false };
        continue;
      }
      if (capability.systemRole && isSystemRoleCompatibilityError(raw)) {
        capability = { ...capability, systemRole: false };
        continue;
      }
      if (isTokenFieldCompatibilityError(raw)) {
        capability = {
          ...capability,
          tokenField:
            capability.tokenField === "max_tokens"
              ? "max_completion_tokens"
              : "max_tokens",
        };
        continue;
      }
      if (capability.temperature && isTemperatureCompatibilityError(raw)) {
        capability = { ...capability, temperature: false };
        continue;
      }
      if (capability.reasoningControl && isReasoningControlCompatibilityError(raw)) {
        capability = { ...capability, reasoningControl: false };
        continue;
      }
      if (isModelNameCompatibilityError(raw)) {
        const offered = extractSupportedModels(raw);
        for (const modelName of [...offered, ...modelQueue]) {
          if (modelName && modelName !== capability.model) {
            capability = { ...capability, model: modelName };
            modelQueue.splice(0, modelQueue.length, ...modelQueue.filter((item) => item !== modelName));
            break;
          }
        }
        if (capability.model !== (error as { model?: string }).model) continue;
      }
      throw error;
    }
  }
  throw lastError;
}
