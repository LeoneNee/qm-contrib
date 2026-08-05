import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chat = readFileSync(new URL("../src/chat.ts", import.meta.url), "utf8");
const split = readFileSync(new URL("../src/split.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/shell.ts", import.meta.url), "utf8");
const convTypes = readFileSync(new URL("../src/conv-types.ts", import.meta.url), "utf8");

test("ChatSurface exposes reattachHost for in-place host re-mount", () => {
  assert.match(convTypes, /reattachHost\(\): void;/);
});

test("reattachHost rebuilds chatState.host and re-renders the existing surface state", () => {
  assert.match(chat, /function reattachHost\(\): void \{/);
  assert.match(chat, /chatState\.host = document\.createElement\("div"\)/);
  assert.match(chat, /readOnlyView \? "custom-chat readonly-chat" : "custom-chat"/);
  assert.match(chat, /readonlyRedraw\?\.\(\)/);
  assert.match(chat, /drawActiveChat\(chatState\.agent\)/);
  assert.match(chat, /if \(chatState\.agent\) \{\s*drawActiveChat\(chatState\.agent\);\s*return;\s*\}/);
});

test("split canvas exports reparentCanvasHost and re-renders every pane on re-attach", () => {
  assert.match(split, /export function reparentCanvasHost\(target: HTMLElement\): void \{/);
  assert.match(split, /canvasHost\.parentElement !== target/);
  assert.match(split, /dockApi\?\.layout\(window\.innerWidth, window\.innerHeight, true\)/);
  assert.match(split, /c\.conversation\.reattachHost\(\)/);
  assert.doesNotMatch(split, /reparentCanvasHost[\s\S]{0,200}\}\s*if \(!canvasHost\)/);
  assert.doesNotMatch(split, /reparentCanvasHost[\s\S]{0,200}disposeDock/);
});

test("shell locale change is synchronous and reattaches only a mounted chat host", () => {
  assert.match(shell, /const viewingChat = mainConversation\(\)\.state\.host\?\.isConnected === true;/);
  assert.match(shell, /onLocaleChange\(\(\) => \{[\s\S]{0,300}restoreLocaleRerender\(viewingChat\)/);
  assert.match(shell, /function restoreLocaleRerender\(viewingChat: boolean\): void \{/);
  assert.match(shell, /if \(viewingChat\) \{[\s\S]{0,200}reattachHost\(\)/);
  assert.match(shell, /reparentCanvasHost\(appState\.mainEl\)[\s\S]{0,120}drawCanvas\(\)/);
  assert.match(shell, /refreshActiveView\(appState\.currentView\)/);
  assert.doesNotMatch(shell, /restoreLocaleRerender[\s\S]{0,200}await refreshSessions/);
});