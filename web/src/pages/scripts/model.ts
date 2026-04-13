import type { ScriptDefinition, ScriptKind } from "../../types";

export type ScriptEditorDraft = {
  name: string;
  kind: ScriptKind;
  command: string;
  cwd: string;
  envText: string;
};

export function createEmptyScriptDraft(): ScriptEditorDraft {
  return {
    name: "",
    kind: "service",
    command: "",
    cwd: "",
    envText: "",
  };
}

export function draftFromScript(script: ScriptDefinition): ScriptEditorDraft {
  return {
    name: script.name,
    kind: normalizeScriptKind(script.kind),
    command: script.command,
    cwd: script.cwd,
    envText: formatScriptEnvText(script.env),
  };
}

export function parseScriptEnvText(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    if (!key) continue;
    env[key] = line.slice(eqIndex + 1);
  }
  return env;
}

export function formatScriptEnvText(env: Record<string, string> | null | undefined): string {
  return Object.entries(env || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function normalizeScriptKind(value: unknown): ScriptKind {
  return value === "task" ? "task" : "service";
}

export function shouldPollScript(status: unknown): boolean {
  return String(status || "").trim().toLowerCase() === "running";
}

export function buildScriptPayload(draft: ScriptEditorDraft): {
  name: string;
  kind: ScriptKind;
  command: string;
  cwd: string;
  env: Record<string, string>;
} {
  return {
    name: String(draft.name || "").trim(),
    kind: normalizeScriptKind(draft.kind),
    command: String(draft.command || "").trim(),
    cwd: String(draft.cwd || "").trim() || ".",
    env: parseScriptEnvText(draft.envText),
  };
}

export function upsertScriptDefinition(
  scripts: ScriptDefinition[],
  nextScript: ScriptDefinition,
): ScriptDefinition[] {
  const existingIndex = scripts.findIndex((script) => script.id === nextScript.id);
  if (existingIndex >= 0) {
    return scripts.map((script, index) => (index === existingIndex ? nextScript : script));
  }
  return [nextScript, ...scripts];
}

export function chooseSelectedScriptId(
  scripts: ScriptDefinition[],
  preferredId: string | null | undefined,
): string | null {
  const normalizedPreferredId = String(preferredId || "").trim();
  if (normalizedPreferredId && scripts.some((script) => script.id === normalizedPreferredId)) {
    return normalizedPreferredId;
  }
  return scripts[0]?.id || null;
}
