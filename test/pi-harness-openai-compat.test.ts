import { test } from "node:test";
import assert from "node:assert/strict";
import { createPiHarness } from "../src/harness/pi-harness.ts";
import { setAliyunBaseUrl } from "../src/model/pi-models.ts";
import type { HarnessTurnInput } from "../src/harness/harness.ts";

interface RecordedRequest {
  url: string;
  authorization?: string;
  body: Record<string, unknown>;
}

function turn(sessionId: string): HarnessTurnInput {
  return {
    session: { id: sessionId } as HarnessTurnInput["session"],
    input: "hi",
    systemPrompt: "BASE",
    history: [],
    tools: {} as HarnessTurnInput["tools"],
    scopeLabel: "scope" as HarnessTurnInput["scopeLabel"],
    orgScopeId: "org:test" as HarnessTurnInput["orgScopeId"],
    emit: async (entry) => ({ ...entry, seq: 1 }) as Awaited<ReturnType<HarnessTurnInput["emit"]>>,
    recordModelCall: () => undefined,
  };
}

const CANNED_COMPLETION_SSE = [
  'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","content":"done"}}]}',
  "",
  'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":1,"total_tokens":6}}',
  "",
  "data: [DONE]",
  "",
].join("\n");

async function captureTurnRequests(
  harness: ReturnType<typeof createPiHarness>,
  sessionId: string,
): Promise<RecordedRequest[]> {
  const requests: RecordedRequest[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: String(url),
      authorization: new Headers(init?.headers).get("authorization") ?? undefined,
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return new Response(CANNED_COMPLETION_SSE, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  }) as typeof globalThis.fetch;
  try {
    await harness.turns.runTurn(turn(sessionId)).catch(() => undefined);
  } finally {
    globalThis.fetch = realFetch;
  }
  return requests;
}

test("a DeepSeek turn speaks chat completions to api.deepseek.com, never the Responses API", async () => {
  const harness = createPiHarness({
    defaultModelId: "deepseek-v4-flash",
    resolveProviderKeys: async () => ({ deepseek: "sk-deepseek-test" }),
  });
  const requests = await captureTurnRequests(harness, "deepseek-turn");
  const completion = requests.find((request) => request.url.includes("deepseek"));
  assert.ok(completion, "the turn called the DeepSeek endpoint");
  assert.equal(completion.url, "https://api.deepseek.com/chat/completions");
  assert.equal(completion.body.model, "deepseek-v4-flash");
  assert.equal(completion.authorization, "Bearer sk-deepseek-test");
  assert.ok(!requests.some((request) => request.url.includes("/responses")), "no Responses API call");
});

test("the dated DeepSeek snapshot sends its own id on the wire", async () => {
  const harness = createPiHarness({
    defaultModelId: "deepseek-v4-flash-0731",
    resolveProviderKeys: async () => ({ deepseek: "sk-deepseek-test" }),
  });
  const requests = await captureTurnRequests(harness, "deepseek-snapshot-turn");
  const completion = requests.find((request) => request.url.includes("deepseek"));
  assert.equal(completion?.url, "https://api.deepseek.com/chat/completions");
  assert.equal(completion?.body.model, "deepseek-v4-flash-0731");
});

test("a MiniMax CN turn speaks chat completions to the MiniMax OpenAI endpoint", async () => {
  const harness = createPiHarness({
    defaultModelId: "MiniMax-M3",
    resolveProviderKeys: async () => ({ "minimax-cn": "sk-minimax-test" }),
  });
  const requests = await captureTurnRequests(harness, "minimax-turn");
  const completion = requests.find((request) => request.url.includes("minimaxi"));
  assert.ok(completion, "the turn called the MiniMax CN endpoint");
  assert.equal(completion.url, "https://api.minimaxi.com/v1/chat/completions");
  assert.equal(completion.body.model, "MiniMax-M3");
  assert.equal(completion.authorization, "Bearer sk-minimax-test");
  assert.ok(!requests.some((request) => request.url.includes("/anthropic")), "no Anthropic-protocol fallback");
});

test("a GLM turn speaks chat completions to the Z.AI CN coding endpoint", async () => {
  const harness = createPiHarness({
    defaultModelId: "glm-5.2",
    resolveProviderKeys: async () => ({ "zai-coding-cn": "sk-zai-test" }),
  });
  const requests = await captureTurnRequests(harness, "glm-turn");
  const completion = requests.find((request) => request.url.includes("bigmodel"));
  assert.ok(completion, "the turn called the Z.AI CN endpoint");
  assert.equal(completion.url, "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions");
  assert.equal(completion.body.model, "glm-5.2");
  assert.equal(completion.authorization, "Bearer sk-zai-test");
});

test("a Kimi turn speaks chat completions to the Moonshot CN endpoint", async () => {
  const harness = createPiHarness({
    defaultModelId: "kimi-k3",
    resolveProviderKeys: async () => ({ "moonshotai-cn": "sk-kimi-test" }),
  });
  const requests = await captureTurnRequests(harness, "kimi-turn");
  const completion = requests.find((request) => request.url.includes("moonshot"));
  assert.ok(completion, "the turn called the Moonshot CN endpoint");
  assert.equal(completion.url, "https://api.moonshot.cn/v1/chat/completions");
  assert.equal(completion.body.model, "kimi-k3");
  assert.equal(completion.authorization, "Bearer sk-kimi-test");
});

test("a Qwen turn speaks chat completions to the Aliyun endpoint via the registered runtime provider", async () => {
  const harness = createPiHarness({
    defaultModelId: "qwen3.8-max",
    resolveProviderKeys: async () => ({ aliyun: "sk-aliyun-test" }),
  });
  try {
    const requests = await captureTurnRequests(harness, "qwen-turn");
    const completion = requests.find((request) => request.url.includes("dashscope"));
    assert.ok(completion, "the turn called the public Aliyun endpoint by default");
    assert.equal(completion.url, "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    assert.equal(completion.body.model, "qwen3.8-max");
    assert.equal(completion.authorization, "Bearer sk-aliyun-test");
    assert.ok(!requests.some((request) => request.url.includes("/responses")), "no Responses API call");

    setAliyunBaseUrl("https://ws-abc123.cn-beijing.maas.aliyuncs.com/compatible-mode/v1");
    const workspaceHarness = createPiHarness({
      defaultModelId: "qwen3.8-max",
      resolveProviderKeys: async () => ({ aliyun: "sk-aliyun-test" }),
    });
    const workspaceRequests = await captureTurnRequests(workspaceHarness, "qwen-workspace-turn");
    const workspaceCompletion = workspaceRequests.find((request) => request.url.includes("maas.aliyuncs.com"));
    assert.equal(
      workspaceCompletion?.url,
      "https://ws-abc123.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
      "setAliyunBaseUrl points qwen clones at the workspace MaaS endpoint",
    );
  } finally {
    setAliyunBaseUrl();
  }
});
