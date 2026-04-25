import { useEffect, useMemo, useState } from "react";

import type { MessageAttachment } from "../../types";
import { fetchTextAttachment, saveTextAttachment } from "../../services/api";
import { classNames } from "../../utils/classNames";
import { deriveAttachmentTitle } from "../../utils/messageAttachments";
import { createContextModalUi } from "../ContextModal/ui";
import { ModalFrame } from "../modals/ModalFrame";

type TextDocumentViewerModalProps = {
  attachment: MessageAttachment;
  blobGroupId: string;
  isDark: boolean;
  onClose: () => void;
};

export function TextDocumentViewerModal({
  attachment,
  blobGroupId,
  isDark,
  onClose,
}: TextDocumentViewerModalProps) {
  const ui = useMemo(() => createContextModalUi(isDark), [isDark]);
  const [currentAttachment, setCurrentAttachment] = useState<MessageAttachment>(attachment);
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState(() => String(attachment.title || deriveAttachmentTitle(String(attachment.path || "")) || "document.txt"));
  const [mimeType, setMimeType] = useState(() => String(attachment.mime_type || "text/plain"));
  const [busy, setBusy] = useState<"idle" | "loading" | "saving">("loading");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const path = String(attachment.path || "").trim();
    if (!blobGroupId || !path) return;

    let cancelled = false;
    fetchTextAttachment(blobGroupId, path).then((resp) => {
      if (cancelled) return;
      if (!resp.ok) {
        setBusy("idle");
        setError(resp.error.message || "Failed to load document");
        return;
      }
      setContent(String(resp.result.content || ""));
      setFilename(String(resp.result.title || attachment.title || deriveAttachmentTitle(path) || "document.txt"));
      setMimeType(String(resp.result.mime_type || attachment.mime_type || "text/plain"));
      setCurrentAttachment({
        ...attachment,
        path: resp.result.path,
        title: resp.result.title,
        mime_type: resp.result.mime_type,
        bytes: resp.result.bytes,
      });
      setBusy("idle");
    }).catch((err) => {
      if (cancelled) return;
      setBusy("idle");
      setError(err instanceof Error ? err.message : "Failed to load document");
    });

    return () => {
      cancelled = true;
    };
  }, [attachment, blobGroupId]);

  const handleSave = async () => {
    if (!blobGroupId || busy !== "idle") return;
    setBusy("saving");
    setError("");
    setStatus("");
    const resp = await saveTextAttachment(blobGroupId, {
      filename: filename || deriveAttachmentTitle(String(currentAttachment.path || "")) || "document.txt",
      content,
      mimeType,
    });
    if (!resp.ok) {
      setBusy("idle");
      setError(resp.error.message || "Failed to save document");
      return;
    }
    const savedAttachment = resp.result.attachment;
    setCurrentAttachment(savedAttachment);
    setFilename(String(savedAttachment.title || filename || deriveAttachmentTitle(String(savedAttachment.path || ""))));
    setMimeType(String(savedAttachment.mime_type || mimeType || "text/plain"));
    setIsEditing(false);
    setBusy("idle");
    setStatus("Saved as a new document version");
  };

  return (
    <ModalFrame
      isOpen={!!attachment}
      isDark={isDark}
      onClose={busy === "saving" ? () => {} : onClose}
      titleId="text-document-viewer-title"
      title={String(currentAttachment.title || deriveAttachmentTitle(String(currentAttachment.path || "")) || "Document")}
      closeAriaLabel="Close document viewer"
      panelClassName="h-full w-full max-w-4xl sm:h-[82vh]"
      headerActions={(
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                className={ui.buttonSecondaryClass}
                onClick={() => setIsEditing(false)}
                disabled={busy !== "idle"}
                aria-label={`Cancel editing ${String(currentAttachment.title || "document")}`}
              >
                Cancel
              </button>
              <button
                type="button"
                className={ui.buttonPrimaryClass}
                onClick={handleSave}
                disabled={busy !== "idle"}
                aria-label="Save document changes"
              >
                {busy === "saving" ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={ui.buttonPrimaryClass}
              onClick={() => setIsEditing(true)}
              disabled={busy !== "idle"}
              aria-label={`Edit document ${String(currentAttachment.title || "document")}`}
            >
              Edit
            </button>
          )}
        </div>
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
          <div className="min-w-0 flex-1 truncate">{String(currentAttachment.path || "")}</div>
          <div className="flex items-center gap-3">
            <span>{mimeType || "text/plain"}</span>
            <span>{busy === "loading" ? "Loading..." : `${Number(currentAttachment.bytes || content.length || 0)} bytes`}</span>
          </div>
        </div>
        {status ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            <div className="font-medium">{status}</div>
            <div className="mt-1 break-all text-xs opacity-90">{String(currentAttachment.path || "")}</div>
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : null}
        {isEditing ? (
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onInput={(event) => setContent((event.target as HTMLTextAreaElement).value)}
            className={classNames(ui.textareaClass, "min-h-[360px] flex-1 font-mono text-[13px] leading-6")}
            aria-label={`Document editor for ${String(currentAttachment.title || "document")}`}
            disabled={busy === "loading" || busy === "saving"}
          />
        ) : (
          <div
            className={classNames(
              "min-h-[360px] flex-1 overflow-auto rounded-xl border px-4 py-3 font-mono text-[13px] leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]",
              "border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] text-[var(--color-text-primary)]",
            )}
          >
            {content}
          </div>
        )}
      </div>
    </ModalFrame>
  );
}
