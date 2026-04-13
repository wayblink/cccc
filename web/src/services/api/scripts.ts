import type {
  ScriptAttachResult,
  ScriptDefinition,
  ScriptDetail,
  ScriptKind,
  ScriptOutputSnapshot,
  ScriptRuntimeStatus,
} from "../../types";
import { ApiResponse, apiJson, asOptionalString, asRecord, asString } from "./base";

type ScriptUpsertPayload = {
  name: string;
  kind: ScriptKind;
  command: string;
  cwd: string;
  env: Record<string, string>;
};

function normalizeScriptKind(value: unknown): ScriptKind {
  return value === "task" ? "task" : "service";
}

function normalizeScriptDefinition(value: unknown): ScriptDefinition | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id).trim();
  const name = asString(record.name).trim();
  if (!id || !name) return null;
  const envRecord = asRecord(record.env) ?? {};
  const env = Object.fromEntries(
    Object.entries(envRecord)
      .map(([key, rawValue]) => [String(key || "").trim(), asString(rawValue)])
      .filter(([key]) => key),
  );
  return {
    id,
    name,
    kind: normalizeScriptKind(record.kind),
    command: asString(record.command),
    cwd: asString(record.cwd) || ".",
    env,
    created_at: asOptionalString(record.created_at) || undefined,
    updated_at: asOptionalString(record.updated_at) || undefined,
  };
}

function normalizeScriptRuntimeStatus(value: unknown, scriptId?: string): ScriptRuntimeStatus {
  const record = asRecord(value) ?? {};
  const status = asString(record.status).trim() || "idle";
  const pidValue = Number(record.pid);
  const exitCodeValue = Number(record.exit_code);
  return {
    script_id: asOptionalString(record.script_id) || scriptId,
    status,
    pid: Number.isFinite(pidValue) ? pidValue : null,
    started_at: asOptionalString(record.started_at),
    updated_at: asOptionalString(record.updated_at),
    exit_code: Number.isFinite(exitCodeValue) ? exitCodeValue : null,
    result: asOptionalString(record.result),
  };
}

function normalizeScriptOutputSnapshot(value: unknown, scriptId?: string): ScriptOutputSnapshot | null {
  const record = asRecord(value);
  if (!record) return null;
  const exitCodeValue = Number(record.exit_code);
  return {
    script_id: asOptionalString(record.script_id) || scriptId,
    text: asString(record.text),
    updated_at: asOptionalString(record.updated_at),
    exit_code: Number.isFinite(exitCodeValue) ? exitCodeValue : null,
    result: asOptionalString(record.result),
  };
}

function normalizeScriptDetailPayload(value: unknown): ScriptDetail | null {
  const record = asRecord(value);
  if (!record) return null;
  const script = normalizeScriptDefinition(record.script);
  if (!script) return null;
  return {
    script,
    runtime: normalizeScriptRuntimeStatus(record.runtime, script.id),
    last_output: normalizeScriptOutputSnapshot(record.last_output, script.id),
  };
}

function normalizeScriptAttachPayload(value: unknown, scriptId: string): ScriptAttachResult {
  const record = asRecord(value) ?? {};
  return {
    script_id: asOptionalString(record.script_id) || scriptId,
    runtime: normalizeScriptRuntimeStatus(record.runtime, scriptId),
    output: normalizeScriptOutputSnapshot(record.output, scriptId),
  };
}

function asScriptDetailResponse(
  resp: ApiResponse<{
    script?: unknown;
    runtime?: unknown;
    last_output?: unknown;
  }>,
): ApiResponse<ScriptDetail> {
  if (!resp.ok) return resp as ApiResponse<ScriptDetail>;
  const detail = normalizeScriptDetailPayload(resp.result);
  if (!detail) {
    return {
      ok: false,
      error: {
        code: "PARSE_ERROR",
        message: "Invalid script detail response",
      },
    };
  }
  return { ok: true, result: detail };
}

export async function listScripts(): Promise<ApiResponse<{ scripts: ScriptDefinition[] }>> {
  const resp = await apiJson<{ scripts?: unknown }>("/api/v1/scripts");
  if (!resp.ok) return resp as ApiResponse<{ scripts: ScriptDefinition[] }>;
  const rawScripts = Array.isArray(resp.result.scripts) ? resp.result.scripts : [];
  return {
    ok: true,
    result: {
      scripts: rawScripts
        .map((item) => normalizeScriptDefinition(item))
        .filter((item): item is ScriptDefinition => !!item),
    },
  };
}

export async function getScript(scriptId: string): Promise<ApiResponse<ScriptDetail>> {
  return asScriptDetailResponse(
    await apiJson<{ script?: unknown; runtime?: unknown; last_output?: unknown }>(
      `/api/v1/scripts/${encodeURIComponent(scriptId)}`,
    ),
  );
}

export async function createScript(payload: ScriptUpsertPayload): Promise<ApiResponse<ScriptDetail>> {
  return asScriptDetailResponse(
    await apiJson<{ script?: unknown; runtime?: unknown; last_output?: unknown }>("/api/v1/scripts", {
      method: "POST",
      body: JSON.stringify({ ...payload, by: "user" }),
    }),
  );
}

export async function updateScript(scriptId: string, payload: ScriptUpsertPayload): Promise<ApiResponse<ScriptDetail>> {
  return asScriptDetailResponse(
    await apiJson<{ script?: unknown; runtime?: unknown; last_output?: unknown }>(
      `/api/v1/scripts/${encodeURIComponent(scriptId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ ...payload, by: "user" }),
      },
    ),
  );
}

export async function deleteScript(
  scriptId: string,
): Promise<ApiResponse<{ script_id: string; deleted: boolean }>> {
  return apiJson<{ script_id: string; deleted: boolean }>(
    `/api/v1/scripts/${encodeURIComponent(scriptId)}?by=user`,
    { method: "DELETE" },
  );
}

export async function runScript(scriptId: string): Promise<ApiResponse<ScriptDetail>> {
  return asScriptDetailResponse(
    await apiJson<{ script?: unknown; runtime?: unknown; last_output?: unknown }>(
      `/api/v1/scripts/${encodeURIComponent(scriptId)}/run?by=user`,
      { method: "POST" },
    ),
  );
}

export async function stopScript(scriptId: string): Promise<ApiResponse<ScriptDetail>> {
  return asScriptDetailResponse(
    await apiJson<{ script?: unknown; runtime?: unknown; last_output?: unknown }>(
      `/api/v1/scripts/${encodeURIComponent(scriptId)}/stop?by=user`,
      { method: "POST" },
    ),
  );
}

export async function restartScript(scriptId: string): Promise<ApiResponse<ScriptDetail>> {
  return asScriptDetailResponse(
    await apiJson<{ script?: unknown; runtime?: unknown; last_output?: unknown }>(
      `/api/v1/scripts/${encodeURIComponent(scriptId)}/restart?by=user`,
      { method: "POST" },
    ),
  );
}

export async function attachScript(scriptId: string): Promise<ApiResponse<ScriptAttachResult>> {
  const resp = await apiJson<{ script_id?: unknown; runtime?: unknown; output?: unknown }>(
    `/api/v1/scripts/${encodeURIComponent(scriptId)}/attach?by=user`,
  );
  if (!resp.ok) return resp as ApiResponse<ScriptAttachResult>;
  return { ok: true, result: normalizeScriptAttachPayload(resp.result, scriptId) };
}
