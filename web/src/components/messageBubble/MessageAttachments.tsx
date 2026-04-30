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
            const attachmentPath = String(attachment.path || "");
            const parts = attachmentPath.split("/");
            const blobName = parts[parts.length - 1] || "";
            const label = attachment.title || deriveAttachmentTitle(blobName) || "file";
            const href = attachment.local_preview_url || withAuthToken(
              `/api/v1/groups/${encodeURIComponent(blobGroupId)}/blobs/${encodeURIComponent(blobName)}`
            );
            const chipClassName = classNames(
              "inline-flex max-w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors",
              isUserMessage
                ? "bg-blue-700/50 text-white border border-blue-500"
                : "glass-btn border border-[var(--glass-border-subtle)] text-[var(--color-text-secondary)]",
            );
            const chipContent = (
              <>
                <FileIcon size={13} className="opacity-60 flex-shrink-0" />
                <span
                  className="truncate font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {label}
                </span>
              </>
            );

            if (isTextEditableAttachment(attachment)) {
              return (
                <button
                  key={`file:${attachmentKeyPrefix}:${index}`}
                  type="button"
                  className={chipClassName}
                  onClick={() => setActiveDocumentPath(attachmentPath)}
                  aria-label={`View ${label}`}
                  title={`View ${label}`}
                >
                  {chipContent}
                </button>
              );
            }

            return (
              <a
                key={`file:${attachmentKeyPrefix}:${index}`}
                href={href}
                download={label}
                className={chipClassName}
                aria-label={downloadTitle(label)}
                title={downloadTitle(label)}
              >
                {chipContent}
              </a>
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
