import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auxiliaryModelFor,
  auxiliaryModelForProvider,
  defaultModelForHarness,
  defaultModelForProvider,
  modelServiceable,
  modelSupportedByHarness,
  onlyProvider,
  resolveModel,
  getRequiredModel,
  setAliyunBaseUrl,
  MODEL_PROVIDERS,
  NO_PROVIDERS_AVAILABLE,
  SELECTABLE_BASE_MODELS,
  contextTokenBudgetForModel,
} from "../src/model/pi-models.ts";

test("every selectable base model resolves against the pi-ai registry", () => {
  for (const m of SELECTABLE_BASE_MODELS) {
    const model = getRequiredModel(m.id);
    assert.equal(model.id, m.id);
    assert.ok(
      (MODEL_PROVIDERS as readonly string[]).includes(String(model.provider)),
      `${m.id} has unexpected provider ${model.provider}`,
    );
  }
});

test("selectable models span providers (multi-provider is wired)", () => {
  const providers = new Set(SELECTABLE_BASE_MODELS.map((m) => getRequiredModel(m.id).provider));
  assert.ok(providers.has("anthropic"), "expected at least one Anthropic model");
  assert.ok(providers.has("openai"), "expected at least one OpenAI model (gpt-5.6)");
  assert.ok(providers.has("openrouter"), "expected an OpenRouter-hosted open-model option");
  assert.ok(providers.has("minimax-cn"), "expected a MiniMax CN option");
  assert.ok(providers.has("deepseek"), "expected a DeepSeek option");
  assert.ok(providers.has("zai-coding-cn"), "expected a Z.AI GLM CN option");
  assert.ok(providers.has("moonshotai-cn"), "expected a Kimi CN option");
  assert.ok(providers.has("aliyun"), "expected an Aliyun Bailian option");
});

test("unknown models are not silently accepted", () => {
  assert.equal(resolveModel("claude-not-a-real-model"), undefined);
  assert.throws(() => getRequiredModel("claude-not-a-real-model"), /Unsupported model/);
});

test("native harnesses reject cross-provider pins and choose their own defaults", () => {
  assert.equal(modelSupportedByHarness("claude-opus-4-8", "claude"), true);
  assert.equal(modelSupportedByHarness("gpt-5.6-sol", "claude"), false);
  assert.equal(modelSupportedByHarness("gpt-5.6-sol", "codex"), true);
  assert.equal(modelSupportedByHarness("claude-opus-4-8", "codex"), false);
  assert.equal(modelSupportedByHarness("claude-future-9", "claude"), true);
  assert.equal(modelSupportedByHarness("gpt-future-9", "codex"), true);
  assert.equal(defaultModelForHarness("codex", "claude-opus-4-8"), "gpt-5.6-sol");
});

test("the default base model follows the providers a deployment can actually bill", () => {
  for (const provider of MODEL_PROVIDERS) {
    const only = onlyProvider(provider);
    const chosen = defaultModelForHarness("pi", undefined, only);
    assert.equal(
      modelServiceable(chosen, only),
      true,
      `a ${provider}-only deployment must default to a model ${provider} can serve, got ${chosen}`,
    );
  }
  assert.equal(defaultModelForHarness("pi", undefined, onlyProvider("openrouter")), "openrouter/auto");
  assert.equal(defaultModelForHarness("pi", undefined, onlyProvider("openai")), "gpt-5.6-sol");
});

test("provider-blind callers and explicit pins keep the shipped default", () => {
  assert.equal(defaultModelForHarness("pi"), "claude-opus-5");
  assert.equal(defaultModelForHarness("pi", undefined, onlyProvider("anthropic")), "claude-opus-5");
  assert.equal(
    defaultModelForHarness("pi", "claude-sonnet-5", onlyProvider("openrouter")),
    "claude-sonnet-5",
    "an explicit pin is never silently swapped — the mismatch is rejected at config load instead",
  );
  assert.equal(
    defaultModelForHarness("pi", undefined, NO_PROVIDERS_AVAILABLE),
    "claude-opus-5",
    "with no provider at all the shipped default stands rather than an arbitrary pick",
  );
});

test("a provider that cannot serve a harness has no default model for it", () => {
  assert.equal(defaultModelForProvider("pi", "openrouter"), "openrouter/auto");
  assert.equal(defaultModelForProvider("codex", "openai"), "gpt-5.6-sol");
  assert.equal(defaultModelForProvider("claude", "anthropic"), "claude-opus-5");
  assert.equal(defaultModelForProvider("codex", "anthropic"), undefined, "the Codex CLI runs no Anthropic model");
  assert.equal(defaultModelForProvider("claude", "openrouter"), undefined, "the Claude CLI runs no OpenRouter model");
  assert.equal(defaultModelForProvider("opencode", "openrouter"), undefined, "opencode has no OpenRouter route");
});

test("the curated catalog contains only current model families", () => {
  assert.deepEqual(
    SELECTABLE_BASE_MODELS.map((model) => model.id),
    [
      "claude-fable-5",
      "claude-opus-5",
      "claude-opus-4-8",
      "claude-sonnet-5",
      "claude-haiku-4-5",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "openrouter/auto",
      "MiniMax-M3",
      "MiniMax-M2.7",
      "MiniMax-M2.7-highspeed",
      "deepseek-v4-flash",
      "deepseek-v4-flash-0731",
      "glm-5.2",
      "kimi-k3",
      "qwen3.8-max",
      "qwen3.7-max",
      "qwen3.7-plus",
      "qwen3.6-plus",
      "qwen3.6-flash",
    ],
  );
  assert.equal(getRequiredModel("gpt-5.6-sol").contextWindow, 1_050_000);
});

test("auxiliary models come from the configured base model's own provider", () => {
  assert.equal(
    auxiliaryModelFor("claude-opus-5"),
    "claude-haiku-4-5",
    "the deployment default resolves an Anthropic auxiliary",
  );
  assert.equal(auxiliaryModelFor("claude-opus-4-8"), "claude-haiku-4-5");
  assert.equal(auxiliaryModelFor("claude-fable-5"), "claude-haiku-4-5");
  assert.equal(
    auxiliaryModelFor("gpt-5.6-sol"),
    "gpt-5.6-luna",
    "an OpenAI deployment gets an OpenAI auxiliary, never Haiku",
  );
  assert.equal(auxiliaryModelFor("gpt-5.6-terra"), "gpt-5.6-luna");
});

test("the Anthropic auxiliary is resolvable by provider, so Anthropic-only surfaces keep working", () => {
  assert.equal(auxiliaryModelForProvider("anthropic"), "claude-haiku-4-5");
  assert.equal(auxiliaryModelForProvider("openai"), "gpt-5.6-luna");
  assert.equal(auxiliaryModelForProvider("nope"), undefined);
});

test("auxiliary selection falls back to the base model when its provider has no cheaper sibling", () => {
  assert.equal(
    auxiliaryModelFor("openrouter/auto"),
    "openrouter/auto",
    "the only OpenRouter entry is its own auxiliary",
  );
  assert.equal(
    auxiliaryModelFor("claude-not-a-real-model"),
    "claude-not-a-real-model",
    "an unresolvable base is returned untouched",
  );
});

test("an auxiliary is never less serviceable than the base model it was derived from", () => {
  const providerSets = [
    onlyProvider("anthropic"),
    onlyProvider("openai"),
    onlyProvider("openrouter"),
    NO_PROVIDERS_AVAILABLE,
  ];
  for (const m of SELECTABLE_BASE_MODELS) {
    const auxiliary = auxiliaryModelFor(m.id);
    assert.equal(
      getRequiredModel(auxiliary).provider,
      getRequiredModel(m.id).provider,
      `${m.id} resolved a cross-provider auxiliary (${auxiliary})`,
    );
    for (const providers of providerSets) {
      assert.equal(
        modelServiceable(auxiliary, providers),
        modelServiceable(m.id, providers),
        `${m.id} -> ${auxiliary} changed serviceability under ${JSON.stringify(providers)}`,
      );
    }
  }
});

test("OpenAI-compatible providers resolve chat-completions models, never the Responses API", () => {
  for (const id of [
    "MiniMax-M3",
    "MiniMax-M2.7",
    "MiniMax-M2.7-highspeed",
    "deepseek-v4-flash",
    "deepseek-v4-flash-0731",
    "glm-5.2",
    "kimi-k3",
    "qwen3.8-max",
    "qwen3.7-max",
    "qwen3.7-plus",
    "qwen3.6-plus",
    "qwen3.6-flash",
  ]) {
    const model = getRequiredModel(id);
    assert.equal(model.api, "openai-completions", `${id} must use chat completions (no Responses API)`);
    assert.equal(model.reasoning, true);
  }
  assert.equal(getRequiredModel("MiniMax-M3").provider, "minimax-cn");
  assert.equal(getRequiredModel("MiniMax-M3").baseUrl, "https://api.minimaxi.com/v1");
  assert.equal(getRequiredModel("MiniMax-M2.7").baseUrl, "https://api.minimaxi.com/v1");
  assert.equal(getRequiredModel("deepseek-v4-flash").provider, "deepseek");
  assert.equal(getRequiredModel("deepseek-v4-flash").baseUrl, "https://api.deepseek.com");
  assert.equal(getRequiredModel("glm-5.2").provider, "zai-coding-cn");
  assert.equal(getRequiredModel("glm-5.2").baseUrl, "https://open.bigmodel.cn/api/coding/paas/v4");
  assert.equal(getRequiredModel("kimi-k3").provider, "moonshotai-cn");
  assert.equal(getRequiredModel("kimi-k3").baseUrl, "https://api.moonshot.cn/v1");
  for (const id of ["qwen3.8-max", "qwen3.7-max", "qwen3.7-plus", "qwen3.6-plus", "qwen3.6-flash"]) {
    assert.equal(getRequiredModel(id).provider, "aliyun", `${id} bills Aliyun, not the template's token plan`);
    assert.equal(getRequiredModel(id).baseUrl, "https://dashscope.aliyuncs.com/compatible-mode/v1");
  }
});

test("the dated DeepSeek snapshot keeps the template's wire compat and thinking map", () => {
  const snapshot = getRequiredModel("deepseek-v4-flash-0731");
  assert.equal(snapshot.id, "deepseek-v4-flash-0731", "the dated id is what the API receives");
  assert.deepEqual(snapshot.compat, getRequiredModel("deepseek-v4-flash").compat);
  assert.deepEqual(snapshot.thinkingLevelMap, getRequiredModel("deepseek-v4-flash").thinkingLevelMap);
  assert.equal(snapshot.contextWindow, 1_000_000);
});

test("MiniMax clones carry OpenAI-endpoint compat and their own pricing", () => {
  const m3 = getRequiredModel("MiniMax-M3");
  assert.equal(m3.contextWindow, 1_000_000);
  assert.equal(m3.maxTokens, 128_000);
  assert.deepEqual(m3.cost, { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 });
  const compat = m3.compat as Record<string, unknown>;
  assert.equal(compat.supportsStore, false);
  assert.equal(compat.requiresReasoningContentOnAssistantMessages, true);
  for (const [id, input, output] of [
    ["MiniMax-M2.7", 0.3, 1.2],
    ["MiniMax-M2.7-highspeed", 0.6, 2.4],
  ] as const) {
    const model = getRequiredModel(id);
    assert.deepEqual(
      model.cost,
      { input, output, cacheRead: 0.06, cacheWrite: 0.375 },
      `${id} cache pricing matches the vendor table (cache read is not input-derived)`,
    );
    assert.equal(model.contextWindow, 204_800);
    const cloneCompat = model.compat as Record<string, unknown>;
    assert.equal(cloneCompat.requiresReasoningContentOnAssistantMessages, true, `${id} echoes reasoning content`);
  }
});

test("Aliyun clones re-point Qwen token-plan templates at the workspace endpoint", () => {
  const max = getRequiredModel("qwen3.8-max");
  assert.equal(max.id, "qwen3.8-max", "the workspace model id is what the API receives");
  assert.equal(max.provider, "aliyun");
  assert.equal(max.api, "openai-completions");
  assert.equal(max.reasoning, true);
  assert.equal(max.contextWindow, 1_000_000);
  assert.equal(max.maxTokens, 131_072);
  assert.deepEqual(max.cost, { input: 1.7, output: 5, cacheRead: 0.17, cacheWrite: 0 });
  const compat = max.compat as Record<string, unknown>;
  assert.equal(compat.thinkingFormat, "qwen", "Qwen wire compat survives the clone");
  assert.equal(compat.supportsStore, false);
  assert.equal(auxiliaryModelForProvider("aliyun"), "qwen3.6-flash");
});

test("ALIYUN_BASE_URL re-points every Aliyun model at a workspace MaaS endpoint", () => {
  const before = getRequiredModel("qwen3.7-plus").baseUrl;
  setAliyunBaseUrl("https://ws-example.cn-beijing.maas.aliyuncs.com/compatible-mode/v1");
  try {
    for (const id of ["qwen3.8-max", "qwen3.7-max", "qwen3.7-plus", "qwen3.6-plus", "qwen3.6-flash"]) {
      assert.equal(getRequiredModel(id).baseUrl, "https://ws-example.cn-beijing.maas.aliyuncs.com/compatible-mode/v1");
    }
    setAliyunBaseUrl("   ");
    assert.equal(
      getRequiredModel("qwen3.7-plus").baseUrl,
      before,
      "blank ALIYUN_BASE_URL falls back to the default endpoint",
    );
  } finally {
    setAliyunBaseUrl(undefined);
  }
  assert.equal(getRequiredModel("qwen3.7-plus").baseUrl, before);
});

test("the new providers have pi-harness defaults but no opencode route", () => {
  assert.equal(defaultModelForProvider("pi", "minimax-cn"), "MiniMax-M3");
  assert.equal(defaultModelForProvider("pi", "deepseek"), "deepseek-v4-flash");
  assert.equal(defaultModelForProvider("pi", "zai-coding-cn"), "glm-5.2");
  assert.equal(defaultModelForProvider("pi", "moonshotai-cn"), "kimi-k3");
  assert.equal(defaultModelForProvider("pi", "aliyun"), "qwen3.8-max");
  for (const provider of ["minimax-cn", "deepseek", "zai-coding-cn", "moonshotai-cn", "aliyun"] as const) {
    assert.equal(defaultModelForProvider("opencode", provider), undefined, `opencode wires no ${provider} provider`);
  }
});

test("context token budget is half of each model's real input room", () => {
  assert.equal(getRequiredModel("claude-fable-5").contextWindow, 1_000_000);
  assert.equal(contextTokenBudgetForModel("claude-fable-5"), Math.floor((1_000_000 - 128_000) * 0.5));
  const sol = contextTokenBudgetForModel("gpt-5.6-sol");
  assert.equal(sol, Math.floor((1_050_000 - 128_000) * 0.5));
  assert.ok(sol !== undefined && sol < 1_050_000 * 0.5, "budget stays below half the window");
  assert.equal(contextTokenBudgetForModel("claude-not-a-real-model"), undefined);
  assert.equal(
    contextTokenBudgetForModel("MiniMax-M2.7"),
    Math.floor((204_800 - 131_072) * 0.5),
    "MiniMax M2.7's 131k max output leaves a genuinely small input room — budget follows the catalog",
  );
  const tightWindow = new Set(["MiniMax-M2.7", "MiniMax-M2.7-highspeed"]);
  for (const m of SELECTABLE_BASE_MODELS) {
    const budget = contextTokenBudgetForModel(m.id);
    const floor = tightWindow.has(m.id) ? 30_000 : 60_000;
    assert.ok(budget !== undefined && budget >= floor, `${m.id} budget ${budget} suspiciously small`);
  }
});
