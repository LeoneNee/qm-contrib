import { test } from "node:test";
import assert from "node:assert/strict";
import { getBaseModel, modelSupportsFastMode, setFastModeModelIds } from "../src/pi-models.ts";

test("web UI resolves models from the shared catalog without privileging a provider", () => {
  const anthropic = getBaseModel("claude-opus-4-8");
  assert.equal(anthropic.id, "claude-opus-4-8");
  assert.equal(anthropic.provider, "anthropic");
  assert.equal(anthropic.api, "anthropic-messages");

  const openai = getBaseModel("gpt-5.6-sol");
  assert.equal(openai.id, "gpt-5.6-sol");
  assert.equal(openai.provider, "openai");

  const openrouter = getBaseModel("openrouter/auto");
  assert.equal(openrouter.provider, "openrouter");

  assert.throws(() => getBaseModel("claude-not-real"), /Unsupported/);
});

test("models this pi-ai build lacks are cloned from a template of their own provider", () => {
  const fable = getBaseModel("claude-fable-5");
  assert.equal(fable.id, "claude-fable-5");
  assert.equal(fable.name, "Claude Fable 5");
  assert.equal(fable.provider, "anthropic");

  const sol = getBaseModel("gpt-5.6-sol");
  assert.equal(sol.id, "gpt-5.6-sol");
  assert.equal(sol.name, "GPT-5.6 Sol");
  assert.equal(sol.provider, "openai", "an OpenAI model never resolves through an Anthropic template");
});

test("OpenAI-compatible providers resolve chat-completions models in the browser", () => {
  const m3 = getBaseModel("MiniMax-M3");
  assert.equal(m3.id, "MiniMax-M3");
  assert.equal(m3.provider, "minimax-cn");
  assert.equal(m3.api, "openai-completions", "MiniMax CN runs chat completions, never the Responses API");
  assert.equal(m3.baseUrl, "https://api.minimaxi.com/v1");

  const m27 = getBaseModel("MiniMax-M2.7");
  assert.equal(m27.provider, "minimax-cn");
  assert.equal(m27.api, "openai-completions");
  assert.equal(m27.baseUrl, "https://api.minimaxi.com/v1");

  for (const id of ["MiniMax-M2.7", "MiniMax-M2.7-highspeed"] as const) {
    const model = getBaseModel(id);
    const compat = model.compat as Record<string, unknown> | undefined;
    assert.equal(
      compat?.requiresReasoningContentOnAssistantMessages,
      true,
      `${id} must echo reasoning content on assistant messages or the MiniMax endpoint rejects follow-up turns`,
    );
  }

  const flash = getBaseModel("deepseek-v4-flash");
  assert.equal(flash.provider, "deepseek");
  assert.equal(flash.api, "openai-completions");

  const snapshot = getBaseModel("deepseek-v4-flash-0731");
  assert.equal(snapshot.id, "deepseek-v4-flash-0731");
  assert.equal(snapshot.provider, "deepseek");
  assert.equal(snapshot.api, "openai-completions");

  const glm = getBaseModel("glm-5.2");
  assert.equal(glm.provider, "zai-coding-cn");
  assert.equal(glm.api, "openai-completions");
  assert.equal(glm.baseUrl, "https://open.bigmodel.cn/api/coding/paas/v4");

  const kimi = getBaseModel("kimi-k3");
  assert.equal(kimi.provider, "moonshotai-cn");
  assert.equal(kimi.api, "openai-completions");
  assert.equal(kimi.baseUrl, "https://api.moonshot.cn/v1");

  for (const id of ["qwen3.8-max", "qwen3.7-max", "qwen3.7-plus", "qwen3.6-plus", "qwen3.6-flash"] as const) {
    const model = getBaseModel(id);
    assert.equal(model.id, id);
    assert.equal(model.provider, "aliyun");
    assert.equal(model.api, "openai-completions");
    assert.equal(model.baseUrl, "https://dashscope.aliyuncs.com/compatible-mode/v1");
    assert.equal(model.reasoning, true);
    assert.deepEqual(
      model.input,
      id === "qwen3.7-max" ? ["text"] : ["text", "image"],
      `${id} modality mirrors the core registry (qwen3.7-max rejects image content parts; the rest accept them)`,
    );
    const compat = model.compat as Record<string, unknown> | undefined;
    assert.equal(compat?.thinkingFormat, "qwen", `${id} speaks the Qwen thinking wire format`);
  }
});

test("fast-mode support is fed from core's runtime config, not a hardcoded client copy", () => {
  setFastModeModelIds(null, []);
  assert.equal(modelSupportsFastMode(null, "claude-opus-4-8"), false);

  setFastModeModelIds(null, ["claude-opus-4-8", "claude-opus-4-7"]);
  assert.equal(modelSupportsFastMode(null, "claude-opus-4-8"), true);
  assert.equal(modelSupportsFastMode(null, "claude-sonnet-4-6"), false);
  assert.equal(modelSupportsFastMode(null, "claude-haiku-4-5"), false);
  assert.equal(modelSupportsFastMode(null, undefined), false);
});
