import type { ScriptDefinition, ScriptKind, ScriptRuntimeStatus } from "../../types";

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

export function mergeScriptRuntimeStatus(
  current: ScriptRuntimeStatus | null | undefined,
  incoming: ScriptRuntimeStatus | null | undefined,
): ScriptRuntimeStatus | null {
  if (!incoming && !current) return null;
  if (!incoming) return current || null;
  if (!current) return incoming;

  const currentStatus = String(current.status || "").trim().toLowerCase();
  const incomingStatus = String(incoming.status || "").trim().toLowerCase();

  // Passive refreshes can briefly report `idle` before the runtime snapshot catches up.
  if (currentStatus === "running" && incomingStatus === "idle") {
    return {
      ...incoming,
      status: current.status,
      pid: incoming.pid ?? current.pid ?? null,
      started_at: incoming.started_at ?? current.started_at ?? null,
      updated_at: incoming.updated_at ?? current.updated_at ?? null,
      result: incoming.result ?? current.result ?? null,
    };
  }

  return {
    ...current,
    ...incoming,
    pid: incoming.pid ?? current.pid ?? null,
    started_at: incoming.started_at ?? current.started_at ?? null,
    updated_at: incoming.updated_at ?? current.updated_at ?? null,
    exit_code: incoming.exit_code ?? current.exit_code ?? null,
    result: incoming.result ?? current.result ?? null,
  };
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
