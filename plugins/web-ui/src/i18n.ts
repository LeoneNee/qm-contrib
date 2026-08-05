import { zhUiCore } from "./zh/ui-core.ts";
import { zhShell } from "./zh/shell.ts";
import { zhChat } from "./zh/chat.ts";
import { zhSessions } from "./zh/sessions.ts";
import { zhSkills } from "./zh/skills.ts";
import { zhResources } from "./zh/resources.ts";
import { zhDeploys } from "./zh/deploys.ts";

export type Locale = "zh" | "en";

export const LANG_STORAGE_KEY = "webui:lang";

const ZH: Record<string, string> = {
  ...zhUiCore,
  ...zhShell,
  ...zhChat,
  ...zhSessions,
  ...zhSkills,
  ...zhResources,
  ...zhDeploys,
};

function readStoredLocale(): Locale | null {
  try {
    const v = globalThis.localStorage?.getItem(LANG_STORAGE_KEY);
    return v === "en" || v === "zh" ? v : null;
  } catch {
    return null;
  }
}

let locale: Locale = readStoredLocale() ?? (typeof document === "undefined" ? "en" : "zh");

const listeners = new Set<(l: Locale) => void>();

export function currentLocale(): Locale {
  return locale;
}

export function intlLocale(): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}

export function onLocaleChange(cb: (l: Locale) => void): void {
  listeners.add(cb);
}

export function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  try {
    globalThis.localStorage?.setItem(LANG_STORAGE_KEY, next);
  } catch {
    void 0;
  }
  applyDocumentLang();
  for (const cb of listeners) cb(next);
}

export function applyDocumentLang(): void {
  if (typeof document !== "undefined") document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
}

export function t(en: string, params?: Record<string, string | number>): string {
  let out = locale === "zh" ? (ZH[en] ?? en) : en;
  if (params) for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

applyDocumentLang();
