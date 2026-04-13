import { createContextModalUi } from "../../components/ContextModal/ui";
import { PlayIcon, RefreshIcon, StopIcon, TrashIcon } from "../../components/Icons";
import type { ScriptEditorDraft } from "./model";
import type { ScriptRuntimeStatus } from "../../types";
import { classNames } from "../../utils/classNames";
import { getScriptManagerChrome } from "./chrome";

type ScriptEditorProps = {
  isDark: boolean;
  readOnly?: boolean;
  draft: ScriptEditorDraft;
  runtime: ScriptRuntimeStatus | null;
  isNew: boolean;
  loading?: boolean;
  saving?: boolean;
  deleting?: boolean;
  actionBusy?: "run" | "stop" | "restart" | null;
  onChange: (patch: Partial<ScriptEditorDraft>) => void;
  onSave: () => void;
  onDelete: () => void;
  onRun: () => void;
  onStop: () => void;
  onRestart: () => void;
};

export function ScriptEditor({
  isDark,
  readOnly,
  draft,
  runtime,
  isNew,
  loading = false,
  saving = false,
  deleting = false,
  actionBusy = null,
  onChange,
  onSave,
  onDelete,
  onRun,
  onStop,
  onRestart,
}: ScriptEditorProps) {
  const ui = createContextModalUi(isDark);
  const chrome = getScriptManagerChrome();
  const runtimeStatus = String(runtime?.status || "idle");
  const canRunActions = !readOnly && !isNew;
  const isRunning = runtimeStatus === "running";

  return (
    <section className="glass-card flex min-h-[380px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-3.5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            {chrome.editorTitle}
          </div>
          {chrome.editorShowScriptName ? (
            <h2 className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">
              {isNew ? "New Script" : draft.name || "Script Details"}
            </h2>
          ) : null}
          <div className={classNames("flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]", chrome.editorShowScriptName ? "mt-2" : "mt-1.5")}>
            <span className="rounded-full bg-[var(--glass-panel-bg)] px-2.5 py-1 capitalize">
              {draft.kind}
            </span>
            <span className="rounded-full bg-[var(--glass-panel-bg)] px-2.5 py-1 capitalize">
              Status: {runtimeStatus}
            </span>
            {chrome.editorShowPid && runtime?.pid ? (
              <span className="rounded-full bg-[var(--glass-panel-bg)] px-2.5 py-1">PID {runtime.pid}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={classNames(
              ui.buttonSecondaryClass,
              "inline-flex items-center gap-2 rounded-xl px-3 py-1.5",
              "disabled:opacity-50"
            )}
            onClick={onRun}
            disabled={!canRunActions || saving || deleting || actionBusy !== null}
          >
            <PlayIcon size={14} />
            Run
          </button>
          <button
            type="button"
            className={classNames(
              ui.buttonSecondaryClass,
              "inline-flex items-center gap-2 rounded-xl px-3 py-1.5",
              "disabled:opacity-50"
            )}
            onClick={onRestart}
            disabled={!canRunActions || saving || deleting || actionBusy !== null}
          >
            <RefreshIcon size={14} />
            Restart
          </button>
          <button
            type="button"
            className={classNames(
              ui.buttonSecondaryClass,
              "inline-flex items-center gap-2 rounded-xl px-3 py-1.5",
              "disabled:opacity-50"
            )}
            onClick={onStop}
            disabled={!canRunActions || !isRunning || saving || deleting || actionBusy !== null}
          >
            <StopIcon size={14} />
            Stop
          </button>
          {!isNew ? (
            <button
              type="button"
              className={classNames(ui.buttonDangerClass, "inline-flex items-center gap-2 rounded-xl px-3 py-1.5")}
              onClick={onDelete}
              disabled={Boolean(readOnly) || saving || deleting || actionBusy !== null}
            >
              <TrashIcon size={14} />
              Delete
            </button>
          ) : null}
          <button
            type="button"
            className="glass-btn-accent rounded-xl px-4 py-1.5 text-sm font-medium text-[var(--color-accent-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSave}
            disabled={Boolean(readOnly) || loading || saving || deleting || actionBusy !== null}
          >
            {saving ? "Saving..." : isNew ? "Create Script" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="space-y-4">
          <div
            className={classNames(
              "grid gap-4",
              chrome.editorNameTypeColumns === "equal"
                ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                : "lg:grid-cols-[minmax(0,1.1fr)_220px]"
            )}
          >
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Name</span>
              <input
                className={ui.inputClass}
                value={draft.name}
                disabled={Boolean(readOnly) || loading || saving || deleting}
                placeholder="Local dev server"
                onChange={(event) => onChange({ name: event.target.value })}
              />
            </label>

            <div className="space-y-2 justify-self-start lg:w-full">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Type</span>
              <div className="flex flex-wrap justify-start gap-2">
                {(["service", "task"] as const).map((kind) => {
                  const active = draft.kind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      className={classNames(
                        "rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all",
                        active
                          ? "glass-btn-accent text-[var(--color-accent-primary)]"
                          : "glass-btn text-[var(--color-text-secondary)]",
                      )}
                      disabled={Boolean(readOnly) || loading || saving || deleting}
                      onClick={() => onChange({ kind })}
                    >
                      {kind}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Working Directory</span>
            <input
              className={classNames(ui.inputClass, "font-mono text-[13px]")}
              value={draft.cwd}
              disabled={Boolean(readOnly) || loading || saving || deleting}
              placeholder="."
              onChange={(event) => onChange({ cwd: event.target.value })}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Command</span>
            <textarea
              className={classNames(ui.textareaClass, "min-h-[140px] font-mono text-[13px]")}
              value={draft.command}
              disabled={Boolean(readOnly) || loading || saving || deleting}
              placeholder="npm run dev"
              onChange={(event) => onChange({ command: event.target.value })}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Environment</span>
            <textarea
              className={classNames(ui.textareaClass, "min-h-[180px] font-mono text-[13px]")}
              value={draft.envText}
              disabled={Boolean(readOnly) || loading || saving || deleting}
              placeholder={"PORT=3000\nNODE_ENV=development"}
              onChange={(event) => onChange({ envText: event.target.value })}
            />
          </label>

          {chrome.editorShowNotes ? (
            <div className="rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--glass-panel-bg)] px-4 py-3 text-xs leading-5 text-[var(--color-text-secondary)]">
              <div className="font-medium text-[var(--color-text-primary)]">Notes</div>
              <p className="mt-2">
                Services stay running until stopped. Tasks run once and keep only the latest output snapshot.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
