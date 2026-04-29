import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CopyIcon, FileIcon } from "../../components/Icons";
import { useCopyFeedback } from "../../hooks/useCopyFeedback";
import { classNames } from "../../utils/classNames";
import { workspaceImagePreviewUrl } from "./workspaceApi";
import type { WorkspaceFilePreview as WorkspaceFilePreviewData } from "./workspaceTypes";

type WorkspaceFilePreviewProps = {
  groupId: string;
  preview: WorkspaceFilePreviewData | null;
  loading: boolean;
  selectedPath: string;
};

function formatBytes(value: number): string {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImagePreview(preview: WorkspaceFilePreviewData): boolean {
  return preview.preview_type === "image" || preview.mime_type === "image/png" || preview.mime_type === "image/jpeg";
}

export function WorkspaceFilePreview({ groupId, preview, loading, selectedPath }: WorkspaceFilePreviewProps) {
  const { t } = useTranslation("layout");
  const copyWithFeedback = useCopyFeedback();
  const lines = useMemo(() => (preview?.content || "").split(/\r?\n/), [preview?.content]);
  const imageUrl = useMemo(
    () => (preview && groupId && isImagePreview(preview) ? workspaceImagePreviewUrl(groupId, preview.path) : ""),
    [groupId, preview],
  );

  if (loading) {
    return <div className="p-4 text-sm text-[var(--color-text-tertiary)]">{t("workspaceInspectorLoading")}</div>;
  }

  if (!preview) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-[var(--color-text-tertiary)]">
        <FileIcon size={28} />
        <p>{selectedPath ? t("workspaceInspectorLoadFailed") : t("workspaceInspectorSelectFile")}</p>
      </div>
    );
  }

  const copyPath = () => {
    void copyWithFeedback(preview.path, { successMessage: t("workspaceInspectorCopied") });
  };
  const copyContent = () => {
    void copyWithFeedback(preview.content, { successMessage: t("workspaceInspectorCopied") });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--glass-border-subtle)] px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <FileIcon size={16} />
              <span className="truncate">{preview.path}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
              <span>{formatBytes(preview.size)}</span>
              {preview.mime_type ? <span>{preview.mime_type}</span> : null}
              {preview.truncated ? (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-amber-500">
                  {t("workspaceInspectorTruncatedPreview")}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={copyPath}
              className="rounded-lg border border-[var(--glass-border-subtle)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--glass-tab-bg-hover)]"
            >
              <CopyIcon size={13} className="mr-1 inline" />
              {t("workspaceInspectorCopyPath")}
            </button>
            {!preview.is_binary ? (
              <button
                type="button"
                onClick={copyContent}
                className="rounded-lg border border-[var(--glass-border-subtle)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--glass-tab-bg-hover)]"
              >
                <CopyIcon size={13} className="mr-1 inline" />
                {t("workspaceInspectorCopyContent")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {imageUrl ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[linear-gradient(45deg,rgba(148,163,184,.12)_25%,transparent_25%),linear-gradient(-45deg,rgba(148,163,184,.12)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(148,163,184,.12)_75%),linear-gradient(-45deg,transparent_75%,rgba(148,163,184,.12)_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0] p-5">
          <img
            src={imageUrl}
            alt={preview.path}
            className="max-h-full max-w-full rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--color-surface)] object-contain shadow-sm"
          />
        </div>
      ) : preview.is_binary ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-[var(--color-text-tertiary)]">
          {t("workspaceInspectorBinaryFile")}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto bg-black/[0.025]">
          <pre className="min-w-max py-3 font-mono text-[12px] leading-5 text-[var(--color-text-primary)]">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[3.5rem_minmax(0,1fr)]">
                <span className="select-none border-r border-[var(--glass-border-subtle)] pr-3 text-right text-[var(--color-text-tertiary)]">
                  {index + 1}
                </span>
                <span className={classNames("whitespace-pre px-3", line.length === 0 && "text-[var(--color-text-tertiary)]")}>
                  {line || " "}
                </span>
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}
