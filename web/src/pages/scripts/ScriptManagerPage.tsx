import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useUIStore } from "../../stores";
import type { ApiResponse } from "../../services/api/base";
import {
  attachScript,
  createScript,
  deleteScript,
  getScript,
  listScripts,
  restartScript,
  runScript,
  stopScript,
  updateScript,
} from "../../services/api";
import type {
  ScriptDefinition,
  ScriptDetail,
  ScriptOutputSnapshot,
  ScriptRuntimeStatus,
} from "../../types";
import { classNames } from "../../utils/classNames";
import { ScriptConsole } from "./ScriptConsole";
import { ScriptEditor } from "./ScriptEditor";
import { ScriptList } from "./ScriptList";
import { getScriptManagerChrome } from "./chrome";
import {
  buildScriptPayload,
  chooseSelectedScriptId,
  createEmptyScriptDraft,
  draftFromScript,
  shouldPollScript,
  type ScriptEditorDraft,
  upsertScriptDefinition,
} from "./model";

type ScriptManagerPageProps = {
  isDark: boolean;
  readOnly?: boolean;
};

function formatApiError<T>(resp: ApiResponse<T>, fallback: string): string {
  return resp.ok ? fallback : `${resp.error.code}: ${resp.error.message}`;
}

export function ScriptManagerPage({ isDark, readOnly }: ScriptManagerPageProps) {
  const chrome = getScriptManagerChrome();
  const showError = useUIStore((state) => state.showError);
  const showNotice = useUIStore((state) => state.showNotice);

  const [scripts, setScripts] = useState<ScriptDefinition[]>([]);
  const [runtimeById, setRuntimeById] = useState<Record<string, ScriptRuntimeStatus | undefined>>({});
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScriptEditorDraft>(() => createEmptyScriptDraft());
  const [detail, setDetail] = useState<ScriptDetail | null>(null);
  const [output, setOutput] = useState<ScriptOutputSnapshot | null>(null);
  const [isDraftNew, setIsDraftNew] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionBusy, setActionBusy] = useState<"run" | "stop" | "restart" | null>(null);
  const [polling, setPolling] = useState(false);

  const selectedScriptIdRef = useRef<string | null>(null);
  const detailRequestRef = useRef(0);
  const attachInFlightRef = useRef(false);

  useEffect(() => {
    selectedScriptIdRef.current = selectedScriptId;
  }, [selectedScriptId]);

  const applyDetail = useCallback((nextDetail: ScriptDetail) => {
    setDetail(nextDetail);
    setOutput(nextDetail.last_output);
    setDraft(draftFromScript(nextDetail.script));
    setIsDraftNew(false);
    setSelectedScriptId(nextDetail.script.id);
    setRuntimeById((prev) => ({ ...prev, [nextDetail.script.id]: nextDetail.runtime }));
    setScripts((prev) => upsertScriptDefinition(prev, nextDetail.script));
  }, []);

  const enterCreateMode = useCallback(() => {
    detailRequestRef.current += 1;
    setSelectedScriptId(null);
    setDetail(null);
    setOutput(null);
    setDraft(createEmptyScriptDraft());
    setIsDraftNew(true);
    setPolling(false);
  }, []);

  const loadScriptDetail = useCallback(async (scriptId: string) => {
    const nextId = String(scriptId || "").trim();
    if (!nextId) return;
    detailRequestRef.current += 1;
    const requestId = detailRequestRef.current;
    setSelectedScriptId(nextId);
    setLoadingDetail(true);
    const resp = await getScript(nextId);
    if (requestId !== detailRequestRef.current) return;
    setLoadingDetail(false);
    if (!resp.ok) {
      showError(formatApiError(resp, "Failed to load script"));
      return;
    }
    applyDetail(resp.result);
  }, [applyDetail, showError]);

  const refreshScripts = useCallback(async (preferredId?: string | null) => {
    setLoadingList(true);
    const resp = await listScripts();
    setLoadingList(false);
    if (!resp.ok) {
      showError(formatApiError(resp, "Failed to load scripts"));
      return;
    }

    const nextScripts = resp.result.scripts;
    setScripts(nextScripts);
    const nextSelectedId = chooseSelectedScriptId(nextScripts, preferredId ?? selectedScriptIdRef.current);
    if (!nextSelectedId) {
      enterCreateMode();
      return;
    }
    await loadScriptDetail(nextSelectedId);
  }, [enterCreateMode, loadScriptDetail, showError]);

  useEffect(() => {
    void refreshScripts();
  }, [refreshScripts]);

  useEffect(() => {
    const activeScriptId = String(detail?.script.id || "").trim();
    if (!activeScriptId || activeScriptId !== selectedScriptId || !shouldPollScript(detail?.runtime.status)) {
      setPolling(false);
      return undefined;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    const scheduleNext = () => {
      timeoutId = globalThis.setTimeout(() => {
        void tick();
      }, 1000);
    };

    const tick = async () => {
      if (cancelled || attachInFlightRef.current) return;
      attachInFlightRef.current = true;
      const resp = await attachScript(activeScriptId);
      attachInFlightRef.current = false;
      if (cancelled) return;
      if (!resp.ok) {
        setPolling(false);
        showError(formatApiError(resp, "Failed to attach script output"));
        return;
      }
      if (selectedScriptIdRef.current !== activeScriptId) return;

      const nextRuntime = resp.result.runtime;
      const nextOutput = resp.result.output;
      setRuntimeById((prev) => ({ ...prev, [activeScriptId]: nextRuntime }));
      setOutput(nextOutput);
      setDetail((prev) => {
        if (!prev || prev.script.id !== activeScriptId) return prev;
        return {
          ...prev,
          runtime: nextRuntime,
          last_output: nextOutput,
        };
      });

      const keepPolling = shouldPollScript(nextRuntime.status);
      setPolling(keepPolling);
      if (keepPolling) scheduleNext();
    };

    setPolling(true);
    void tick();

    return () => {
      cancelled = true;
      if (timeoutId) globalThis.clearTimeout(timeoutId);
    };
  }, [detail, selectedScriptId, showError]);

  const handleSave = useCallback(async () => {
    const payload = buildScriptPayload(draft);
    if (!payload.name) {
      showError("Script name is required.");
      return;
    }
    if (!payload.command) {
      showError("Command is required.");
      return;
    }

    setSaving(true);
    const resp = isDraftNew || !selectedScriptId
      ? await createScript(payload)
      : await updateScript(selectedScriptId, payload);
    setSaving(false);

    if (!resp.ok) {
      showError(formatApiError(resp, isDraftNew ? "Failed to create script" : "Failed to update script"));
      return;
    }

    applyDetail(resp.result);
    showNotice({ message: isDraftNew ? "Script created" : "Script saved" });
  }, [applyDetail, draft, isDraftNew, selectedScriptId, showError, showNotice]);

  const handleDelete = useCallback(async () => {
    if (!selectedScriptId || isDraftNew) {
      enterCreateMode();
      return;
    }
    setDeleting(true);
    const resp = await deleteScript(selectedScriptId);
    setDeleting(false);
    if (!resp.ok) {
      showError(formatApiError(resp, "Failed to delete script"));
      return;
    }
    showNotice({ message: "Script deleted" });
    setRuntimeById((prev) => {
      const next = { ...prev };
      delete next[selectedScriptId];
      return next;
    });
    await refreshScripts();
  }, [enterCreateMode, isDraftNew, refreshScripts, selectedScriptId, showError, showNotice]);

  const runAction = useCallback(async (kind: "run" | "stop" | "restart") => {
    const currentScriptId = String(selectedScriptIdRef.current || "").trim();
    if (!currentScriptId) return;
    setActionBusy(kind);
    const resp = kind === "run"
      ? await runScript(currentScriptId)
      : kind === "stop"
        ? await stopScript(currentScriptId)
        : await restartScript(currentScriptId);
    setActionBusy(null);
    if (!resp.ok) {
      showError(formatApiError(resp, `Failed to ${kind} script`));
      return;
    }
    applyDetail(resp.result);
  }, [applyDetail, showError]);

  const selectedRuntime = useMemo(() => {
    if (detail) return detail.runtime;
    if (selectedScriptId) return runtimeById[selectedScriptId] || null;
    return null;
  }, [detail, runtimeById, selectedScriptId]);

  return (
    <div className="flex h-full min-h-0 flex-col p-4 md:p-5">
      {chrome.showPageHeader ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              Local Automation
            </div>
            <h1 className="mt-1 text-xl font-semibold text-[var(--color-text-primary)] md:text-2xl">Script Manager</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
              Configure reusable shell commands, run one script instance at a time, and inspect the latest console output.
            </p>
          </div>
          <div
            className={classNames(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              isDark ? "bg-white/5 text-slate-200" : "bg-black/5 text-slate-700"
            )}
          >
            {readOnly ? "Read-only" : "Single-instance runtime"}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <ScriptList
          scripts={scripts}
          selectedScriptId={selectedScriptId}
          runtimeById={runtimeById}
          loading={loadingList}
          onCreateScript={enterCreateMode}
          onSelectScript={(scriptId) => {
            void loadScriptDetail(scriptId);
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <ScriptEditor
            isDark={isDark}
            readOnly={readOnly}
            draft={draft}
            runtime={selectedRuntime}
            isNew={isDraftNew}
            loading={loadingDetail}
            saving={saving}
            deleting={deleting}
            actionBusy={actionBusy}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            onSave={() => void handleSave()}
            onDelete={() => void handleDelete()}
            onRun={() => void runAction("run")}
            onStop={() => void runAction("stop")}
            onRestart={() => void runAction("restart")}
          />
          <ScriptConsole
            scriptName={detail?.script.name || draft.name || undefined}
            runtime={selectedRuntime}
            output={output}
            polling={polling}
          />
        </div>
      </div>
    </div>
  );
}
