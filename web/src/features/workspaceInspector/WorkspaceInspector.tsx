import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon, RefreshIcon } from "../../components/Icons";
import { classNames } from "../../utils/classNames";
import { WorkspaceDiffViewer } from "./WorkspaceDiffViewer";
import { WorkspaceFilePreview } from "./WorkspaceFilePreview";
import { WorkspaceFileTree } from "./WorkspaceFileTree";
import { useWorkspaceInspectorStore } from "./workspaceInspectorStore";
import type { WorkspaceInspectorTab } from "./workspaceTypes";

type WorkspaceInspectorProps = {
  groupId: string;
  isDark: boolean;
  width: number;
  activeTab: WorkspaceInspectorTab;
  onTabChange: (tab: WorkspaceInspectorTab) => void;
  onClose: () => void;
  onResizeWidth: (width: number) => void;
};

const INSPECTOR_TABS: WorkspaceInspectorTab[] = ["files", "preview", "diff"];

export function WorkspaceInspector({
  groupId,
  isDark,
  width,
  activeTab,
  onTabChange,
  onClose,
  onResizeWidth,
}: WorkspaceInspectorProps) {
  const { t } = useTranslation("layout");
  const refresh = useWorkspaceInspectorStore((state) => state.refresh);
  const loadDiff = useWorkspaceInspectorStore((state) => state.loadDiff);
  const selectedPath = useWorkspaceInspectorStore((state) => state.selectedPath);
  const selectedFile = useWorkspaceInspectorStore((state) => state.selectedFile);
  const selectedDiff = useWorkspaceInspectorStore((state) => state.selectedDiff);
  const gitStatus = useWorkspaceInspectorStore((state) => state.gitStatus);
  const loadingFile = useWorkspaceInspectorStore((state) => state.loadingFile);
  const loadingDiff = useWorkspaceInspectorStore((state) => state.loadingDiff);
  const loadingStatus = useWorkspaceInspectorStore((state) => state.loadingStatus);

  useEffect(() => {
    if (!groupId) return;
    void refresh(groupId);
  }, [groupId, refresh]);

  useEffect(() => {
    if (!groupId || activeTab !== "diff") return;
    void loadDiff(groupId, selectedPath);
  }, [activeTab, groupId, loadDiff, selectedPath]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const handlePointerMove = (moveEvent: PointerEvent) => {
      onResizeWidth(startWidth + (startX - moveEvent.clientX));
    };
    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handleRefresh = () => {
    if (!groupId) return;
    void refresh(groupId);
  };

  const handleDiffSelect = (path: string) => {
    void loadDiff(groupId, path);
  };

  return (
    <aside
      style={{ width }}
      className={classNames(
        "relative flex h-full min-h-0 shrink-0 flex-col border-l border-[var(--glass-border-subtle)] bg-[var(--glass-panel-bg)] shadow-[-18px_0_48px_rgba(15,23,42,0.08)]",
        isDark && "shadow-[-18px_0_48px_rgba(0,0,0,0.35)]",
      )}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("workspaceInspectorResize")}
        onPointerDown={onPointerDown}
        className="absolute inset-y-0 left-0 z-10 w-1 cursor-col-resize touch-none hover:bg-[var(--color-accent)]"
      />

      <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-3 py-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">{t("workspaceInspector")}</div>
          <div className="truncate text-[11px] text-[var(--color-text-tertiary)]">
            {groupId ? t("workspaceInspectorReadOnly") : t("workspaceInspectorNoGroup")}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)]"
            title={t("workspaceInspectorRefresh")}
            aria-label={t("workspaceInspectorRefresh")}
          >
            <RefreshIcon size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)]"
            title={t("workspaceInspectorClose")}
            aria-label={t("workspaceInspectorClose")}
          >
            <CloseIcon size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 border-b border-[var(--glass-border-subtle)] p-2" role="tablist">
        {INSPECTOR_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => onTabChange(tab)}
            className={classNames(
              "rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-[var(--glass-tab-bg-active)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-tertiary)] hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)]",
            )}
          >
            {tab === "files"
              ? t("workspaceInspectorFiles")
              : tab === "preview"
                ? t("workspaceInspectorPreview")
                : t("workspaceInspectorDiff")}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "files" ? (
          <WorkspaceFileTree groupId={groupId} onFileSelect={() => onTabChange("preview")} />
        ) : activeTab === "preview" ? (
          <WorkspaceFilePreview groupId={groupId} preview={selectedFile} loading={loadingFile} selectedPath={selectedPath} />
        ) : (
          <WorkspaceDiffViewer
            status={gitStatus}
            diffData={selectedDiff}
            loading={loadingDiff || loadingStatus}
            onSelectPath={handleDiffSelect}
          />
        )}
      </div>
    </aside>
  );
}
