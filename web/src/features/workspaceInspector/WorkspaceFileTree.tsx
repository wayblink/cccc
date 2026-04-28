import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon } from "../../components/Icons";
import { classNames } from "../../utils/classNames";
import { useWorkspaceInspectorStore } from "./workspaceInspectorStore";
import type { WorkspaceGitStatusItem, WorkspaceTreeItem } from "./workspaceTypes";

type WorkspaceFileTreeProps = {
  groupId: string;
  onFileSelect: (path: string) => void;
};

function badgeForStatus(status: string): string {
  if (status === "untracked") return "?";
  if (status === "conflicted") return "!";
  if (status === "added") return "A";
  if (status === "deleted") return "D";
  if (status === "renamed") return "R";
  return "M";
}

function statusForItem(
  item: WorkspaceTreeItem,
  statusByPath: Record<string, WorkspaceGitStatusItem>,
): WorkspaceGitStatusItem | null {
  const exact = statusByPath[item.path];
  if (exact) return exact;
  if (!item.is_dir) return null;
  const prefix = item.path ? `${item.path}/` : "";
  return Object.values(statusByPath).find((status) => status.path.startsWith(prefix)) || null;
}

export function WorkspaceFileTree({ groupId, onFileSelect }: WorkspaceFileTreeProps) {
  const { t } = useTranslation("layout");
  const treeByDir = useWorkspaceInspectorStore((state) => state.treeByDir);
  const expandedDirs = useWorkspaceInspectorStore((state) => state.expandedDirs);
  const loadingDirs = useWorkspaceInspectorStore((state) => state.loadingDirs);
  const statusByPath = useWorkspaceInspectorStore((state) => state.statusByPath);
  const selectedPath = useWorkspaceInspectorStore((state) => state.selectedPath);
  const error = useWorkspaceInspectorStore((state) => state.error);
  const toggleDir = useWorkspaceInspectorStore((state) => state.toggleDir);
  const selectFile = useWorkspaceInspectorStore((state) => state.selectFile);
  const rootListing = treeByDir[""];
  const hasNoGroup = !String(groupId || "").trim();

  const rootItems = useMemo(() => rootListing?.items || [], [rootListing]);

  if (hasNoGroup) {
    return <div className="p-4 text-sm text-[var(--color-text-tertiary)]">{t("workspaceInspectorNoGroup")}</div>;
  }

  if (!rootListing && loadingDirs[""]) {
    return <div className="p-4 text-sm text-[var(--color-text-tertiary)]">{t("workspaceInspectorLoading")}</div>;
  }

  if (!rootListing && error) {
    return <div className="p-4 text-sm text-rose-500">{error}</div>;
  }

  if (rootListing && rootItems.length === 0) {
    return <div className="p-4 text-sm text-[var(--color-text-tertiary)]">{t("workspaceInspectorEmptyDir")}</div>;
  }

  const handleToggle = (path: string) => {
    void toggleDir(groupId, path);
  };
  const handleSelect = (path: string) => {
    void selectFile(groupId, path);
    onFileSelect(path);
  };

  return (
    <div className="h-full min-h-0 overflow-auto py-2">
      {rootItems.map((item) => (
        <TreeNode
          key={item.path}
          item={item}
          depth={0}
          selectedPath={selectedPath}
          expandedDirs={expandedDirs}
          loadingDirs={loadingDirs}
          treeByDir={treeByDir}
          statusByPath={statusByPath}
          onToggle={handleToggle}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

function TreeNode({
  item,
  depth,
  selectedPath,
  expandedDirs,
  loadingDirs,
  treeByDir,
  statusByPath,
  onToggle,
  onSelect,
}: {
  item: WorkspaceTreeItem;
  depth: number;
  selectedPath: string;
  expandedDirs: Record<string, boolean>;
  loadingDirs: Record<string, boolean>;
  treeByDir: Record<string, { items: WorkspaceTreeItem[] }>;
  statusByPath: Record<string, WorkspaceGitStatusItem>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const { t } = useTranslation("layout");
  const expanded = !!expandedDirs[item.path];
  const listing = treeByDir[item.path];
  const status = statusForItem(item, statusByPath);
  const active = selectedPath === item.path;

  return (
    <>
      <button
        type="button"
        onClick={() => (item.is_dir ? onToggle(item.path) : onSelect(item.path))}
        className={classNames(
          "flex w-full items-center gap-2 rounded-none px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--glass-tab-bg-hover)]",
          active ? "bg-[var(--glass-tab-bg-active)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]",
        )}
        style={{ paddingLeft: 10 + depth * 14 }}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--color-text-tertiary)]">
          {item.is_dir ? expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} /> : <FileIcon size={13} />}
        </span>
        {item.is_dir ? <FolderIcon size={14} className="shrink-0 text-amber-500" /> : null}
        <span className="min-w-0 flex-1 truncate">{item.name}</span>
        {status ? (
          <span className="shrink-0 rounded-md bg-[var(--glass-tab-bg-active)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-tertiary)]">
            {badgeForStatus(status.status)}
          </span>
        ) : null}
      </button>
      {item.is_dir && expanded ? (
        <>
          {loadingDirs[item.path] ? (
            <div className="px-2 py-1 text-xs text-[var(--color-text-tertiary)]" style={{ paddingLeft: 28 + depth * 14 }}>
              {t("workspaceInspectorLoading")}
            </div>
          ) : null}
          {listing?.items.length === 0 ? (
            <div className="px-2 py-1 text-xs text-[var(--color-text-tertiary)]" style={{ paddingLeft: 28 + depth * 14 }}>
              {t("workspaceInspectorEmptyDir")}
            </div>
          ) : null}
          {(listing?.items || []).map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedDirs={expandedDirs}
              loadingDirs={loadingDirs}
              treeByDir={treeByDir}
              statusByPath={statusByPath}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </>
      ) : null}
    </>
  );
}
