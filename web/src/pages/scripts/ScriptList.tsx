import type { ScriptDefinition, ScriptRuntimeStatus } from "../../types";
import { PlusIcon, TerminalIcon } from "../../components/Icons";
import { classNames } from "../../utils/classNames";
import { getScriptManagerChrome } from "./chrome";

type ScriptListProps = {
  scripts: ScriptDefinition[];
  selectedScriptId: string | null;
  runtimeById: Record<string, ScriptRuntimeStatus | undefined>;
  loading?: boolean;
  onCreateScript: () => void;
  onSelectScript: (scriptId: string) => void;
};

function getStatusTone(status: string | undefined): string {
  switch (String(status || "idle").trim().toLowerCase()) {
    case "running":
      return "bg-emerald-500";
    case "failed":
      return "bg-rose-500";
    case "stopped":
      return "bg-amber-500";
    default:
      return "bg-slate-400 dark:bg-slate-500";
  }
}

export function ScriptList({
  scripts,
  selectedScriptId,
  runtimeById,
  loading = false,
  onCreateScript,
  onSelectScript,
}: ScriptListProps) {
  const chrome = getScriptManagerChrome();

  return (
    <aside className="glass-card flex min-h-[280px] w-full flex-col overflow-hidden md:min-h-0 md:w-[320px] md:max-w-[320px]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-4">
        <div>
          {chrome.listEyebrow ? (
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              {chrome.listEyebrow}
            </div>
          ) : null}
          <h2 className={classNames("text-base font-semibold text-[var(--color-text-primary)]", chrome.listEyebrow ? "mt-1" : "")}>
            {chrome.listTitle}
          </h2>
        </div>
        <button
          type="button"
          className={classNames(
            "glass-btn-accent rounded-xl text-[var(--color-accent-primary)]",
            chrome.createButtonIconOnly ? "flex h-10 w-10 items-center justify-center" : "px-3 py-2 text-sm font-medium"
          )}
          onClick={onCreateScript}
          aria-label={chrome.createButtonLabel}
          title={chrome.createButtonLabel}
        >
          {chrome.createButtonIconOnly ? <PlusIcon size={18} /> : chrome.createButtonLabel}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {loading ? (
          <div className="glass-card flex h-full min-h-[180px] items-center justify-center px-6 text-sm text-[var(--color-text-secondary)]">
            Loading scripts...
          </div>
        ) : scripts.length ? (
          <div className="space-y-2">
            {scripts.map((script) => {
              const runtime = runtimeById[script.id];
              const status = String(runtime?.status || "idle");
              const isActive = script.id === selectedScriptId;
              return (
                <button
                  key={script.id}
                  type="button"
                  className={classNames(
                    "glass-card w-full rounded-2xl px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
                      : "hover:border-[var(--glass-border)]"
                  )}
                  onClick={() => onSelectScript(script.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{script.name}</div>
                      <div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{script.cwd || "."}</div>
                    </div>
                    <span
                      className={classNames(
                        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                        script.kind === "task"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                      )}
                    >
                      {script.kind}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
                    <div className="flex min-w-0 items-center gap-2">
                      <TerminalIcon size={14} />
                      <span className="truncate">{script.command}</span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className={classNames("h-2.5 w-2.5 rounded-full", getStatusTone(status))} />
                      <span className="capitalize">{status}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="glass-card flex h-full min-h-[220px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--glass-panel-bg)] text-[var(--color-text-secondary)]">
              <TerminalIcon size={28} />
            </div>
            <div className="mt-4 text-sm font-medium text-[var(--color-text-primary)]">No scripts yet</div>
            <p className="mt-2 max-w-[220px] text-xs leading-5 text-[var(--color-text-secondary)]">
              Add a reusable local command, then run it here and keep the latest console output.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
