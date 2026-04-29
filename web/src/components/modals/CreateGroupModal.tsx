import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DirItem } from "../../types";
import { TemplatePreviewDetails } from "../TemplatePreviewDetails";
import type { TemplatePreviewDetailsProps } from "../TemplatePreviewDetails";
import { useModalA11y } from "../../hooks/useModalA11y";
import { modalPanelClass, modalViewportClass } from "./modalFrameStyles";

function getPathLeaf(path: string): string {
  return path.split("/").filter(Boolean).pop() || "";
}

function shouldAutoSyncGroupName(groupName: string, previousPath: string): boolean {
  return !groupName || groupName === getPathLeaf(previousPath);
}

function FlatFolderIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 6.75h5.4l1.8 2.1h9.3v8.4a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2V6.75Z" />
      <path d="M3.75 8.85h17.5" />
    </svg>
  );
}

export interface CreateGroupModalProps {
  isOpen: boolean;
  busy: string;

  dirItems: DirItem[];
  currentDir: string;
  parentDir: string | null;
  showDirBrowser: boolean;

  createGroupPath: string;
  setCreateGroupPath: (path: string) => void;
  createGroupName: string;
  setCreateGroupName: (name: string) => void;
  createGroupMode: "interactive" | "collaboration";
  setCreateGroupMode: (mode: "interactive" | "collaboration") => void;
  createGroupTemplateFile: File | null;
  templatePreview: TemplatePreviewDetailsProps["template"] | null;
  templateError: string;
  templateBusy: boolean;
  onSelectTemplate: (file: File | null) => void;

  dirBrowseError?: string;
  onFetchDirContents: (path: string) => void;
  onCreateDirectory: (parentPath: string, name: string) => Promise<{ ok: true; path: string } | { ok: false; message: string }>;
  onCloseDirBrowser: () => void;
  onCreateGroup: () => void;
  onClose: () => void;
  onCancelAndReset: () => void;
}

export function CreateGroupModal({
  isOpen,
  busy,
  dirItems,
  currentDir,
  parentDir,
  showDirBrowser,
  createGroupPath,
  setCreateGroupPath,
  createGroupName,
  setCreateGroupName,
  createGroupMode,
  setCreateGroupMode,
  createGroupTemplateFile,
  templatePreview,
  templateError,
  templateBusy,
  dirBrowseError,
  onSelectTemplate,
  onFetchDirContents,
  onCreateDirectory,
  onCloseDirBrowser,
  onCreateGroup,
  onClose,
  onCancelAndReset,
}: CreateGroupModalProps) {
  const { t } = useTranslation("modals");
  const { modalRef } = useModalA11y(isOpen, onClose);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderError, setNewFolderError] = useState("");
  const [newFolderBusy, setNewFolderBusy] = useState(false);
  const modeOptions: Array<{
    value: "interactive" | "collaboration";
    title: string;
    description: string;
  }> = [
    {
      value: "interactive",
      title: t("createGroup.interactiveMode"),
      description: t("createGroup.interactiveModeHint"),
    },
    {
      value: "collaboration",
      title: t("createGroup.collaborationMode"),
      description: t("createGroup.collaborationModeHint"),
    },
  ];
  if (!isOpen) return null;

  const resetNewFolder = () => {
    setIsCreatingFolder(false);
    setNewFolderName("");
    setNewFolderError("");
    setNewFolderBusy(false);
  };

  const handleCreateFolder = async () => {
    const folderName = newFolderName.trim();
    if (!folderName) {
      setNewFolderError(t("createGroup.folderNameRequired"));
      return;
    }
    if (!currentDir) return;

    setNewFolderBusy(true);
    setNewFolderError("");
    const result = await onCreateDirectory(currentDir, folderName);
    setNewFolderBusy(false);

    if (!result.ok) {
      setNewFolderError(result.message || t("createGroup.folderCreateFailed"));
      return;
    }

    setCreateGroupPath(result.path);
    if (shouldAutoSyncGroupName(createGroupName, createGroupPath)) {
      setCreateGroupName(getPathLeaf(result.path) || folderName);
    }
    resetNewFolder();
  };

  return (
    <div
      className={modalViewportClass("fullscreen", "backdrop-blur-sm animate-fade-in glass-overlay")}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-group-title"
    >
      <div
        ref={modalRef}
        className={modalPanelClass("standard", "fullscreen", "animate-scale-in")}
      >
        <div className="px-6 py-4 border-b safe-area-inset-top border-[var(--glass-border-subtle)]">
          <div id="create-group-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
            {t("createGroup.title")}
          </div>
          <div className="text-sm mt-1 text-[var(--color-text-muted)]">{t("createGroup.subtitle")}</div>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto min-h-0 flex-1">
          <div>
            <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)]">{t("createGroup.projectDirectory")}</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono min-h-[44px] transition-colors glass-input text-[var(--color-text-primary)]"
                value={createGroupPath}
                onChange={(e) => {
                  const nextPath = e.target.value;
                  setCreateGroupPath(nextPath);
                  if (shouldAutoSyncGroupName(createGroupName, createGroupPath)) {
                    setCreateGroupName(getPathLeaf(nextPath));
                  }
                }}
                placeholder={t("createGroup.pathPlaceholder")}
              />
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] glass-btn text-[var(--color-text-secondary)]"
                onClick={() => onFetchDirContents(createGroupPath || "~")}
              >
                {t("createGroup.browse")}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)]">{t("createGroup.groupName")}</label>
            <input
              className="w-full rounded-xl px-4 py-2.5 text-sm min-h-[44px] transition-colors glass-input text-[var(--color-text-primary)]"
              value={createGroupName}
              onChange={(e) => setCreateGroupName(e.target.value)}
              placeholder={t("createGroup.groupNamePlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)]">{t("createGroup.modeLabel")}</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {modeOptions.map((option) => {
                const selected = createGroupMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    className={[
                      "rounded-xl px-4 py-3 text-left transition-all border",
                      selected
                        ? "border-blue-500/60 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.18)]"
                        : "border-[var(--glass-border-subtle)] glass-panel hover:bg-[var(--glass-tab-bg-hover)]",
                    ].join(" ")}
                    onClick={() => setCreateGroupMode(option.value)}
                  >
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{option.title}</div>
                    <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{option.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)]">
              {t("createGroup.blueprintLabel")}
            </label>
            <div className="rounded-xl px-4 py-3 glass-panel">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label
                  className={`inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors glass-btn text-[var(--color-text-secondary)] ${(templateBusy || busy === "create") ? "pointer-events-none opacity-50" : ""}`}
                >
                  <input
                    key={createGroupTemplateFile ? createGroupTemplateFile.name : "none"}
                    type="file"
                    accept=".yaml,.yml,.json"
                    className="sr-only"
                    disabled={templateBusy || busy === "create"}
                    onChange={(e) => {
                      const f = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                      onSelectTemplate(f);
                    }}
                  />
                  {t("createGroup.selectBlueprintFile")}
                </label>
                <div className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-muted)]">
                  {createGroupTemplateFile ? createGroupTemplateFile.name : t("createGroup.noBlueprintFile")}
                </div>
                {createGroupTemplateFile && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg text-sm min-h-[40px] transition-colors glass-btn text-[var(--color-text-secondary)]"
                    disabled={templateBusy || busy === "create"}
                    onClick={() => onSelectTemplate(null)}
                  >
                    {t("common:reset")}
                  </button>
                )}
              </div>
              {templateBusy && (
                <div className="mt-2 text-xs text-[var(--color-text-muted)]">{t("createGroup.loadingBlueprint")}</div>
              )}
              {!templateBusy && templateError && (
                <div className="mt-2 text-xs text-rose-600 dark:text-rose-400">{templateError}</div>
              )}
              {!templateBusy && createGroupTemplateFile && !!templatePreview && (
                <div className="mt-3">
                  <TemplatePreviewDetails
                    template={templatePreview}
                    detailsOpenByDefault={true}
                    wrap={false}
                  />
                </div>
              )}
              <div className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                {t("createGroup.blueprintHint")}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[var(--glass-border-subtle)]">
          <div className="flex gap-3">
            <button
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-sm font-semibold shadow-lg disabled:opacity-50 transition-all min-h-[44px]"
              onClick={onCreateGroup}
              disabled={
                !createGroupPath.trim() ||
                busy === "create" ||
                templateBusy ||
                (!!createGroupTemplateFile && !templatePreview) ||
                (!!createGroupTemplateFile && !!templateError)
              }
            >
              {busy === "create" ? t("createGroup.creating") : createGroupTemplateFile ? t("createGroup.createFromBlueprint") : t("createGroup.createGroup")}
            </button>
            <button
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] glass-btn text-[var(--color-text-secondary)]"
              onClick={onCancelAndReset}
            >
              {t("common:cancel")}
            </button>
          </div>
        </div>
      </div>
      {showDirBrowser && (
        <div
          className={modalViewportClass("sheet", "!z-[60] bg-black/20 backdrop-blur-sm")}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onCloseDirBrowser();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t("createGroup.directoryBrowserTitle")}
        >
          <div className={modalPanelClass("wide", "sheet", "h-[82vh] max-h-[calc(100vh-2rem)] sm:rounded-3xl")}>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--glass-border-subtle)] px-5 py-4">
              <div className="min-w-0">
                <div className="text-base font-semibold text-[var(--color-text-primary)]">{t("createGroup.directoryBrowserTitle")}</div>
                <div className="mt-1 truncate font-mono text-xs text-[var(--color-text-muted)]">
                  {currentDir || createGroupPath || "~"}
                </div>
              </div>
            </div>

            <div className={`min-h-0 flex-1 overflow-auto ${dirBrowseError ? "bg-rose-500/10" : ""}`}>
              {dirBrowseError ? (
                <div className="px-5 py-5 text-sm text-rose-600 dark:text-rose-400">{dirBrowseError}</div>
              ) : (
                <>
                  {isCreatingFolder && (
                    <div className="border-b border-[var(--glass-border-subtle)] px-5 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <input
                          className="min-h-[44px] flex-1 rounded-xl px-4 py-2.5 text-sm transition-colors glass-input text-[var(--color-text-primary)]"
                          value={newFolderName}
                          onChange={(e) => {
                            setNewFolderName(e.target.value);
                            if (newFolderError) setNewFolderError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleCreateFolder();
                            if (e.key === "Escape") resetNewFolder();
                          }}
                          placeholder={t("createGroup.newFolderNamePlaceholder")}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="min-h-[44px] rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-50"
                            disabled={newFolderBusy || !newFolderName.trim()}
                            onClick={() => void handleCreateFolder()}
                          >
                            {newFolderBusy ? t("createGroup.creatingFolder") : t("createGroup.createFolder")}
                          </button>
                          <button
                            type="button"
                            className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium transition-colors glass-btn text-[var(--color-text-secondary)]"
                            disabled={newFolderBusy}
                            onClick={resetNewFolder}
                          >
                            {t("common:cancel")}
                          </button>
                        </div>
                      </div>
                      {newFolderError && (
                        <div className="mt-2 text-xs text-rose-600 dark:text-rose-400">{newFolderError}</div>
                      )}
                    </div>
                  )}
                  {parentDir && (
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-5 py-3 text-left border-b min-h-[48px] hover:bg-[var(--glass-tab-bg-hover)] border-[var(--glass-border-subtle)]"
                      onClick={() => {
                        onFetchDirContents(parentDir);
                        setCreateGroupPath(parentDir);
                        setCreateGroupName(getPathLeaf(parentDir));
                      }}
                    >
                      <FlatFolderIcon className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
                      <span className="text-sm font-medium text-[var(--color-text-muted)]">..</span>
                    </button>
                  )}
                  {dirItems.filter((d) => d.is_dir).length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">{t("createGroup.noSubdirectories")}</div>
                  )}
                  {dirItems
                    .filter((d) => d.is_dir)
                    .map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        className="w-full flex items-center gap-3 px-5 py-3 text-left min-h-[48px] hover:bg-[var(--glass-tab-bg-hover)]"
                        onClick={() => {
                          setCreateGroupPath(item.path);
                          setCreateGroupName(getPathLeaf(item.path) || item.name);
                          onFetchDirContents(item.path);
                        }}
                      >
                        <FlatFolderIcon className="h-5 w-5 shrink-0 text-blue-500" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text-secondary)]">{item.name}</span>
                      </button>
                    ))}
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--glass-border-subtle)] px-5 py-4 sm:flex-row sm:items-center">
              <button
                type="button"
                className="min-h-[44px] rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-50 sm:w-40"
                disabled={!currentDir}
                onClick={() => {
                  if (currentDir) {
                    setCreateGroupPath(currentDir);
                    if (shouldAutoSyncGroupName(createGroupName, createGroupPath)) {
                      setCreateGroupName(getPathLeaf(currentDir));
                    }
                  }
                  onCloseDirBrowser();
                }}
              >
                {t("createGroup.useCurrentDirectory")}
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium transition-colors glass-btn text-[var(--color-text-secondary)] disabled:opacity-50 sm:w-40"
                disabled={!currentDir || newFolderBusy}
                onClick={() => {
                  setIsCreatingFolder(true);
                  setNewFolderError("");
                }}
              >
                {t("createGroup.newFolder")}
              </button>
              <div className="hidden flex-1 sm:block" />
              <button
                type="button"
                className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium transition-colors glass-btn text-[var(--color-text-secondary)] sm:w-32"
                onClick={onCloseDirBrowser}
              >
                {t("common:cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
