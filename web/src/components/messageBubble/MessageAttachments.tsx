import { useState } from "react";

import type { MessageAttachment } from "../../types";
import { withAuthToken } from "../../services/api";
import { classNames } from "../../utils/classNames";
import { deriveAttachmentTitle, isImageAttachment, isSvgAttachment, isTextEditableAttachment } from "../../utils/messageAttachments";
import { FileIcon } from "../Icons";
import { ImagePreview } from "./ImagePreview";
import { TextDocumentViewerModal } from "./TextDocumentViewerModal";

export function MessageAttachments({
  attachments,
  blobGroupId,
  isUserMessage,
  isDark,
  attachmentKeyPrefix,
  downloadTitle,
}: {
  attachments: MessageAttachment[];
  blobGroupId: string;
  isUserMessage: boolean;
  isDark: boolean;
  attachmentKeyPrefix: string;
  downloadTitle: (name: string) => string;
}) {
  const imageAttachments = attachments.filter((attachment) => isImageAttachment(attachment));
  const fileAttachments = attachments.filter((attachment) => !isImageAttachment(attachment));
  const [activeDocumentPath, setActiveDocumentPath] = useState("");
  const activeDocument = fileAttachments.find((attachment) => String(attachment.path || "") === activeDocumentPath) || null;

  if (attachments.length <= 0 || !blobGroupId) return null;

  return (
    <>
      {imageAttachments.length > 0 && (
        <div className="mt-3 flex max-w-full flex-wrap items-start gap-2">
          {imageAttachments.map((attachment, index) => {
            const parts = String(attachment.path || "").split("/");
            const blobName = parts[parts.length - 1] || "";
            const href = attachment.local_preview_url || withAuthToken(
              `/api/v1/groups/${encodeURIComponent(blobGroupId)}/blobs/${encodeURIComponent(blobName)}`
            );
            const label = attachment.title || blobName || "image";
            return (
              <ImagePreview
                key={`img:${attachmentKeyPrefix}:${index}`}
                href={href}
                alt={label}
                isSvg={isSvgAttachment(attachment)}
                isUserMessage={isUserMessage}
                isDark={isDark}
              />
            );
          })}
        </div>
      )}
      {fileAttachments.length > 0 && (
        <div className="mt-3 flex max-w-full flex-wrap items-start gap-2">
          {fileAttachments.map((attachment, index) => {
            const parts = String(attachment.path || "").split("/");
            const blobName = parts[parts.length - 1] || "";
            const href = attachment.local_preview_url || withAuthToken(
              `/api/v1/groups/${encodeURIComponent(blobGroupId)}/blobs/${encodeURIComponent(blobName)}`
            );
            const label = attachment.title || deriveAttachmentTitle(blobName) || "file";
            const editable = isTextEditableAttachment(attachment);
            return (
              <div
                key={`file:${attachmentKeyPrefix}:${index}`}
                className={classNames(
                  "inline-flex max-w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                  isUserMessage
                    ? "bg-blue-700/50 text-white border border-blue-500"
                    : "glass-btn border border-[var(--glass-border-subtle)] text-[var(--color-text-secondary)]",
                )}
              >
                <a
                  href={href}
                  className="inline-flex min-w-0 items-center gap-2"
                  title={downloadTitle(label)}
                  download
                >
                  <FileIcon size={14} className="opacity-70 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </a>
                {editable ? (
                  <button
                    type="button"
                    className={classNames(
                      "rounded border px-2 py-0.5 text-[11px] font-medium",
                      isUserMessage
                        ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
                        : "border-[var(--glass-border-subtle)] bg-[var(--glass-tab-bg)] text-[var(--color-text-primary)] hover:bg-[var(--glass-tab-bg-hover)]"
                    )}
                    aria-label={`View ${label}`}
                    onClick={() => setActiveDocumentPath(String(attachment.path || ""))}
                  >
                    View
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {activeDocument ? (
        <TextDocumentViewerModal
          key={String(activeDocument.path || activeDocument.title || "attachment")}
          attachment={activeDocument}
          blobGroupId={blobGroupId}
          isDark={isDark}
          onClose={() => setActiveDocumentPath("")}
        />
      ) : null}
    </>
  );
}
