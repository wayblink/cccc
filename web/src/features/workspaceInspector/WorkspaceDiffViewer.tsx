import { useTranslation } from "react-i18next";
import { classNames } from "../../utils/classNames";
import type { WorkspaceGitDiff, WorkspaceGitStatus } from "./workspaceTypes";

export type DiffLine = {
  kind: "file" | "hunk" | "add" | "remove" | "context";
  text: string;
};

export function parseUnifiedDiffLines(diff: string): DiffLine[] {
  return String(diff || "")
    .split(/\r?\n/)
    .filter((line, index, lines) => index < lines.length - 1 || line.length > 0)
    .map((line) => {
      if (line.startsWith("diff --git ") || line.startsWith("--- ") || line.startsWith("+++ ")) {
        return { kind: "file", text: line };
      }
      if (line.startsWith("@@")) return { kind: "hunk", text: line };
      if (line.startsWith("+")) return { kind: "add", text: line };
      if (line.startsWith("-")) return { kind: "remove", text: line };
      return { kind: "context", text: line };
    });
}

type WorkspaceDiffViewerProps = {
  diff?: string;
  diffData?: WorkspaceGitDiff | null;
  status?: WorkspaceGitStatus | null;
  loading?: boolean;
  onSelectPath?: (path: string) => void;
};

function badgeForStatus(status: string): string {
  if (status === "untracked") return "?";
  if (status === "conflicted") return "!";
  if (status === "added") return "A";
  if (status === "deleted") return "D";
  if (status === "renamed") return "R";
  return "M";
}

function lineClassName(kind: DiffLine["kind"]): string {
  if (kind === "add") return "bg-emerald-500/10 text-emerald-600";
  if (kind === "remove") return "bg-rose-500/10 text-rose-600";
  if (kind === "hunk") return "bg-sky-500/10 text-sky-600";
  if (kind === "file") return "bg-[var(--glass-tab-bg-active)] text-[var(--color-text-secondary)]";
  return "text-[var(--color-text-primary)]";
}

export function WorkspaceDiffViewer({ diff, diffData, status, loading = false, onSelectPath }: WorkspaceDiffViewerProps) {
  const { t } = useTranslation("layout");
  const diffText = diffData?.diff ?? diff ?? "";
  const lines = parseUnifiedDiffLines(diffText);

  if (status && !status.is_git_repo) {
    return <div className="p-4 text-sm text-[var(--color-text-tertiary)]">{t("workspaceInspectorNonGit")}</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-[var(--color-text-tertiary)]">{t("workspaceInspectorLoading")}</div>;
  }

  const changedItems = status?.items || [];

  if (lines.length === 0) {
    return (
      <div className="flex h-full min-h-0">
        {changedItems.length > 0 ? (
          <ChangedFilesList items={changedItems} onSelectPath={onSelectPath} />
        ) : null}
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-[var(--color-text-tertiary)]">
          {t("workspaceInspectorDiffEmpty")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {changedItems.length > 0 ? <ChangedFilesList items={changedItems} onSelectPath={onSelectPath} /> : null}
      <div className="flex min-w-0 flex-1 flex-col">
        {diffData?.truncated ? (
          <div className="border-b border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-600">
            {t("workspaceInspectorTruncatedPreview")}
          </div>
        ) : null}
        <pre className="min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-5">
          {lines.map((line, index) => (
            <div
              key={`${line.kind}-${index}`}
              data-kind={line.kind}
              className={classNames("min-w-max whitespace-pre px-3", lineClassName(line.kind))}
            >
              {line.text || " "}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

function ChangedFilesList({
  items,
  onSelectPath,
}: {
  items: WorkspaceGitStatus["items"];
  onSelectPath?: (path: string) => void;
}) {
  const { t } = useTranslation("layout");
  return (
    <aside className="hidden w-40 shrink-0 border-r border-[var(--glass-border-subtle)] md:block">
      <div className="border-b border-[var(--glass-border-subtle)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
        {t("workspaceInspectorChangedFiles")}
      </div>
      <div className="max-h-full overflow-auto p-1">
        {items.map((item) => (
          <button
            key={`${item.status}-${item.path}`}
            type="button"
            onClick={() => onSelectPath?.(item.path)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-[var(--color-text-secondary)] hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--glass-tab-bg-active)] font-mono text-[10px]">
              {badgeForStatus(item.status)}
            </span>
            <span className="min-w-0 flex-1 truncate">{item.path}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
