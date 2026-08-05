import { getModel } from "@earendil-works/pi-ai";
import type { Api, Model } from "@earendil-works/pi-ai";

const KNOWN_PROVIDERS = [
  "anthropic",
  "openai",
  "openrouter",
  "minimax-cn",
  "deepseek",
  "moonshotai-cn",
  "aliyun",
] as const;

const MINIMAX_CN_OPENAI_BASE_URL = "https://api.minimaxi.com/v1";

const ALIYUN_OPENAI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

const ALIYUN_COMPAT = {
  supportsStore: false,
  supportsDeveloperRole: false,
  thinkingFormat: "qwen",
} as const;

const MINIMAX_CN_COMPAT = {
  supportsStore: false,
  supportsDeveloperRole: false,
  requiresReasoningContentOnAssistantMessages: true,
} as const;

const CLONE_TEMPLATES: Readonly<Record<string, { template: string; name: string; overrides?: Partial<PiModel> }>> = {
  "claude-fable-5": { template: "claude-opus-4-8", name: "Claude Fable 5" },
  "claude-opus-5": { template: "claude-opus-4-8", name: "Claude Opus 5" },
  "claude-sonnet-5": { template: "claude-sonnet-4-6", name: "Claude Sonnet 5" },
  "gpt-5.6-sol": { template: "gpt-5.5", name: "GPT-5.6 Sol" },
  "gpt-5.6-terra": { template: "gpt-5.5", name: "GPT-5.6 Terra" },
  "gpt-5.6-luna": { template: "gpt-5.5", name: "GPT-5.6 Luna" },
  "MiniMax-M2.7": {
    template: "MiniMax-M2.7",
    name: "MiniMax M2.7",
    overrides: { api: "openai-completions", baseUrl: MINIMAX_CN_OPENAI_BASE_URL, compat: { ...MINIMAX_CN_COMPAT } },
  },
  "MiniMax-M2.7-highspeed": {
    template: "MiniMax-M2.7-highspeed",
    name: "MiniMax M2.7 Highspeed",
    overrides: { api: "openai-completions", baseUrl: MINIMAX_CN_OPENAI_BASE_URL, compat: { ...MINIMAX_CN_COMPAT } },
  },
  "deepseek-v4-flash-0731": { template: "deepseek-v4-flash", name: "DeepSeek V4 Flash (0731)" },
};

const STANDALONE_MODELS: Readonly<Record<string, PiModel>> = {
  "qwen3.8-max": {
    id: "qwen3.8-max",
    name: "Qwen 3.8 Max",
    api: "openai-completions",
    provider: "aliyun",
    baseUrl: ALIYUN_OPENAI_BASE_URL,
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 1.7, output: 5, cacheRead: 0.17, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 131_072,
    compat: { ...ALIYUN_COMPAT },
  } as PiModel,
  "qwen3.7-max": {
    id: "qwen3.7-max",
    name: "Qwen 3.7 Max",
    api: "openai-completions",
    provider: "aliyun",
    baseUrl: ALIYUN_OPENAI_BASE_URL,
    reasoning: true,
    input: ["text"],
    cost: { input: 1.7, output: 5, cacheRead: 0.17, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 65_536,
    compat: { ...ALIYUN_COMPAT },
  } as PiModel,
  "qwen3.7-plus": {
    id: "qwen3.7-plus",
    name: "Qwen 3.7 Plus",
    api: "openai-completions",
    provider: "aliyun",
    baseUrl: ALIYUN_OPENAI_BASE_URL,
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.3, output: 1.1, cacheRead: 0.03, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 64_000,
    compat: { ...ALIYUN_COMPAT },
  } as PiModel,
  "qwen3.6-plus": {
    id: "qwen3.6-plus",
    name: "Qwen 3.6 Plus",
    api: "openai-completions",
    provider: "aliyun",
    baseUrl: ALIYUN_OPENAI_BASE_URL,
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.3, output: 1.7, cacheRead: 0.03, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 65_536,
    compat: { ...ALIYUN_COMPAT },
  } as PiModel,
  "qwen3.6-flash": {
    id: "qwen3.6-flash",
    name: "Qwen 3.6 Flash",
    api: "openai-completions",
    provider: "aliyun",
    baseUrl: ALIYUN_OPENAI_BASE_URL,
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.17, output: 1, cacheRead: 0.017, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 65_536,
    compat: { ...ALIYUN_COMPAT },
  } as PiModel,
  "MiniMax-M3": {
    id: "MiniMax-M3",
    name: "MiniMax M3",
    api: "openai-completions",
    provider: "minimax-cn",
    baseUrl: MINIMAX_CN_OPENAI_BASE_URL,
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 128_000,
    compat: { ...MINIMAX_CN_COMPAT },
  } as PiModel,
  "glm-5.2": {
    id: "glm-5.2",
    name: "GLM 5.2",
    api: "openai-completions",
    provider: "zai-coding-cn",
    baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 131_072,
    thinkingLevelMap: { minimal: null, low: "high", medium: "high", high: "high", max: "max" },
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      supportsReasoningEffort: true,
      thinkingFormat: "zai",
      zaiToolStream: true,
    },
  } as PiModel,
  "kimi-k3": {
    id: "kimi-k3",
    name: "Kimi K3",
    api: "openai-completions",
    provider: "moonshotai-cn",
    baseUrl: "https://api.moonshot.cn/v1",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 },
    contextWindow: 1_048_576,
    maxTokens: 131_072,
    thinkingLevelMap: { off: null, minimal: null, low: "low", medium: null, high: "high", xhigh: null, max: "max" },
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      supportsReasoningEffort: true,
      maxTokensField: "max_tokens",
      supportsStrictMode: false,
      thinkingFormat: "openai",
      requiresReasoningContentOnAssistantMessages: true,
      deferredToolsMode: "kimi",
    },
  } as PiModel,
};

type PiModel = Model<Api>;

function builtinModel(id: string): PiModel | undefined {
  for (const provider of KNOWN_PROVIDERS) {
    const model = getModel(provider, id as Parameters<typeof getModel>[1]) as PiModel | undefined;
    if (model) return model;
  }
  return undefined;
}

export function getBaseModel(id: string, fallback?: { name: string; provider: string }): PiModel {
  const clone = CLONE_TEMPLATES[id];
  if (clone) {
    const template = builtinModel(clone.template);
    if (template) return cloneModel(template, id, clone.name, clone.overrides);
  }
  const standalone = STANDALONE_MODELS[id];
  if (standalone) return structuredClone(standalone);
  const builtin = builtinModel(id);
  if (builtin) return builtin;
  if (fallback?.provider === "openrouter") {
    const template = getModel("openrouter", "openrouter/auto" as Parameters<typeof getModel>[1]) as PiModel | undefined;
    if (template) return cloneModel(template, id, fallback.name);
  }
  throw new Error(`Unsupported model: ${id}`);
}

function cloneModel(model: PiModel, id: string, name: string, overrides: Partial<PiModel> = {}): PiModel {
  return { ...structuredClone(model), ...overrides, id, name };
}

const fastModeByScope = new Map<string, Set<string>>();
let lastFastModeIds = new Set<string>();

export function setFastModeModelIds(scopeKey: string | null, ids: readonly string[] | undefined): void {
  lastFastModeIds = new Set(ids ?? []);
  if (scopeKey !== null) fastModeByScope.set(scopeKey, lastFastModeIds);
}

export function modelSupportsFastMode(scopeKey: string | null, modelId: string | undefined): boolean {
  const ids = (scopeKey !== null ? fastModeByScope.get(scopeKey) : undefined) ?? lastFastModeIds;
  return !!modelId && ids.has(modelId);
}
