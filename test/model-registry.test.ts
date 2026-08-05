import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_REGISTRY,
  SELECTABLE_BASE_MODELS,
  DEFAULT_WEBUI_MODEL_IDS,
  FAST_MODE_MODEL_IDS,
  resolveModel,
  modelSupportsFastMode,
  modelServiceable,
  serviceableModelIds,
  modelProviderAvailabilityFor,
  onlyProvider,
  ALL_PROVIDERS_AVAILABLE,
  NO_PROVIDERS_AVAILABLE,
} from "../src/model/pi-models.ts";
import { validateWebTurnModelOptions } from "../src/core/turn-options.ts";

test("every registry model resolves via pi-ai (nothing offered that turns can't serve)", () => {
  for (const m of MODEL_REGISTRY) {
    assert.ok(resolveModel(m.id), `registry model ${m.id} must resolve`);
  }
});

test("picker ⊆ gate: every selectable base model is web-ui-enabled", () => {
  const webui = new Set(DEFAULT_WEBUI_MODEL_IDS);
  for (const m of SELECTABLE_BASE_MODELS) {
    assert.ok(
      webui.has(m.id),
      `${m.id} is offered in the picker but not in the web-ui gate set — this is the drift that 403s`,
    );
  }
});

test("every web-ui-enabled model passes the web-turn model gate (no 403 for an offered model)", () => {
  for (const id of DEFAULT_WEBUI_MODEL_IDS) {
    assert.equal(
      validateWebTurnModelOptions({ model: id }, null),
      null,
      `${id} must not be refused by validateWebTurnModelOptions`,
    );
  }
});

test("regression: gpt-5.6-sol is web-ui-enabled (the reported 403)", () => {
  assert.ok(DEFAULT_WEBUI_MODEL_IDS.includes("gpt-5.6-sol"));
  assert.equal(validateWebTurnModelOptions({ model: "gpt-5.6-sol" }, null), null);
});

test("FAST_MODE_MODEL_IDS derives from the registry — the web-ui client reads this, keeps no copy", () => {
  assert.deepEqual(
    [...FAST_MODE_MODEL_IDS].sort(),
    MODEL_REGISTRY.filter((m) => m.fastMode)
      .map((m) => m.id)
      .sort(),
  );
  for (const id of FAST_MODE_MODEL_IDS) assert.equal(modelSupportsFastMode(id), true);
});

test("exposure is provider-key-aware: a model whose provider is unconfigured is not serviceable", () => {
  const noOpenai = { ...onlyProvider("anthropic") };
  assert.equal(modelServiceable("gpt-5.6-sol", noOpenai), false);
  assert.equal(modelServiceable("claude-opus-4-8", noOpenai), true);
  assert.equal(modelServiceable("MiniMax-M3", noOpenai), false);
  assert.equal(modelServiceable("deepseek-v4-flash", noOpenai), false);
  assert.deepEqual(serviceableModelIds(["claude-opus-4-8", "gpt-5.6-sol"], noOpenai), ["claude-opus-4-8"]);
  assert.equal(modelServiceable("MiniMax-M3", onlyProvider("minimax-cn")), true);
  assert.equal(modelServiceable("deepseek-v4-flash-0731", onlyProvider("deepseek")), true);
  assert.equal(modelServiceable("qwen3.8-max", noOpenai), false);
  assert.equal(modelServiceable("qwen3.8-max", onlyProvider("aliyun")), true);
});

test("provider-key gating applies only to key-authed harnesses (no over-hiding on CLI-auth harnesses)", () => {
  const noKeys = { ...NO_PROVIDERS_AVAILABLE };
  assert.deepEqual(modelProviderAvailabilityFor("pi", noKeys), noKeys);
  assert.deepEqual(modelProviderAvailabilityFor("opencode", noKeys), noKeys);
  const openaiKeys = { ...NO_PROVIDERS_AVAILABLE, openai: true, openrouter: true };
  assert.deepEqual(modelProviderAvailabilityFor("pi", noKeys, openaiKeys), openaiKeys);
  assert.deepEqual(modelProviderAvailabilityFor("opencode", ALL_PROVIDERS_AVAILABLE, noKeys), {
    ...NO_PROVIDERS_AVAILABLE,
    anthropic: true,
    openai: true,
  });
  assert.deepEqual(modelProviderAvailabilityFor("codex", noKeys), noKeys);
  const codexKeys = { ...NO_PROVIDERS_AVAILABLE, openai: true };
  assert.deepEqual(modelProviderAvailabilityFor("codex", codexKeys), codexKeys);
  assert.deepEqual(modelProviderAvailabilityFor("claude", noKeys), ALL_PROVIDERS_AVAILABLE);
  assert.deepEqual(modelProviderAvailabilityFor("mock", noKeys), ALL_PROVIDERS_AVAILABLE);
});

test("web-turn gate refuses a keyless model cleanly, accepts it once the provider is configured", () => {
  const noOpenai = { ...onlyProvider("anthropic") };
  const refused = validateWebTurnModelOptions({ model: "gpt-5.6-sol" }, null, noOpenai);
  assert.match(refused ?? "", /provider isn't configured/);
  assert.equal(
    validateWebTurnModelOptions({ model: "gpt-5.6-sol" }, null, { ...onlyProvider("anthropic"), openai: true }),
    null,
  );
  const noMinimax = validateWebTurnModelOptions({ model: "MiniMax-M3" }, null, noOpenai);
  assert.match(noMinimax ?? "", /provider isn't configured/);
  assert.equal(validateWebTurnModelOptions({ model: "MiniMax-M3" }, null, onlyProvider("minimax-cn")), null);
});

test("fast-mode support is registry-driven", () => {
  assert.equal(modelSupportsFastMode("claude-opus-4-8"), true);
  assert.equal(modelSupportsFastMode("gpt-5.6-sol"), false);
  assert.equal(modelSupportsFastMode(undefined), false);
  assert.equal(modelSupportsFastMode("nonexistent-model"), false);
});
