import type { ScriptOutputSnapshot, ScriptRuntimeStatus } from "../../types";
import { classNames } from "../../utils/classNames";
import { getScriptManagerChrome } from "./chrome";

type ScriptConsoleProps = {
  scriptName?: string;
  runtime: ScriptRuntimeStatus | null;
  output: ScriptOutputSnapshot | null;
  polling?: boolean;
};

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "--";
  const numeric = Date.parse(value);
  if (Number.isNaN(numeric)) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(numeric));
}

function getResultTone(result: string | null | undefined): string {
  switch (String(result || "").trim().toLowerCase()) {
    case "success":
      return "text-emerald-600 dark:text-emerald-300";
    case "failed":
      return "text-rose-600 dark:text-rose-300";
    case "stopped":
      return "text-amber-600 dark:text-amber-300";
    default:
      return "text-[var(--color-text-secondary)]";
  }
}

export function ScriptConsole({ scriptName, runtime, output, polling = false }: ScriptConsoleProps) {
  const chrome = getScriptManagerChrome();
  const text = output?.text || "";
  const result = output?.result ?? runtime?.result ?? null;
  const exitCode = output?.exit_code ?? runtime?.exit_code ?? null;

  return (
    <section className="glass-card flex min-h-[280px] flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            Latest Output
          </div>
          <h2 className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">Console</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          {chrome.consoleShowScriptName && scriptName ? (
            <span className="rounded-full bg-[var(--glass-panel-bg)] px-2.5 py-1">{scriptName}</span>
          ) : null}
          <span className="rounded-full bg-[var(--glass-panel-bg)] px-2.5 py-1 capitalize">
            {polling ? "Streaming" : runtime?.status || "idle"}
          </span>
          {result ? (
            <span className={classNames("rounded-full bg-[var(--glass-panel-bg)] px-2.5 py-1 capitalize", getResultTone(result))}>
              {result}
            </span>
          ) : null}
          {typeof exitCode === "number" ? (
            <span className="rounded-full bg-[var(--glass-panel-bg)] px-2.5 py-1">Exit {exitCode}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-3 text-xs text-[var(--color-text-secondary)] md:grid-cols-3">
        <div>
          <div className="uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Started</div>
          <div className="mt-1 text-[var(--color-text-primary)]">{formatTimestamp(runtime?.started_at)}</div>
        </div>
        <div>
          <div className="uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Updated</div>
          <div className="mt-1 text-[var(--color-text-primary)]">{formatTimestamp(output?.updated_at ?? runtime?.updated_at)}</div>
        </div>
        <div>
          <div className="uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">PID</div>
          <div className="mt-1 text-[var(--color-text-primary)]">{runtime?.pid ?? "--"}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-slate-950/90 px-5 py-4 text-slate-100">
        <pre className="h-full min-h-[220px] overflow-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-slate-100">
          {text || (polling ? "Waiting for script output..." : "No output captured for the latest run.")}
        </pre>
      </div>
    </section>
  );
}
