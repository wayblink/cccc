import type { MessageAttachment } from "../../types";
import { classNames } from "../../utils/classNames";
import type { TextDocumentReferenceMatch } from "../../utils/messageAttachments";

export const INLINE_DOCUMENT_LINK_CLASS_NAME = [
  "cccc-inline-document-link",
  "rounded-sm",
  "text-inherit",
  "!no-underline",
  "hover:!underline",
  "focus-visible:!underline",
  "underline-offset-2",
  "cursor-pointer",
  "transition-colors",
].join(" ");

function InlineDocumentLink({
  attachment,
  text,
  onOpenDocument,
}: {
  attachment: MessageAttachment;
  text: string;
  onOpenDocument?: (attachment: MessageAttachment) => void;
}) {
  return (
    <a
      href="#"
      data-document-link="true"
      data-document-path={String(attachment.path || "")}
      className={INLINE_DOCUMENT_LINK_CLASS_NAME}
      style={{ color: "inherit" }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenDocument?.(attachment);
      }}
    >
      {text}
    </a>
  );
}

export function InlineDocumentText({
  text,
  matches,
  onOpenDocument,
  className,
}: {
  text: string;
  matches?: TextDocumentReferenceMatch[];
  onOpenDocument?: (attachment: MessageAttachment) => void;
  className?: string;
}) {
  const content = String(text || "");
  const sortedMatches = Array.isArray(matches)
    ? matches
      .filter((match) => {
        const matchedText = String(match.matchedText || "");
        return matchedText && Number.isFinite(match.start) && Number.isFinite(match.end) && match.end > match.start;
      })
      .sort((left, right) => left.start - right.start)
    : [];

  if (sortedMatches.length <= 0) {
    return (
      <div
        className={classNames(
          "break-words whitespace-pre-wrap [overflow-wrap:anywhere]",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  const segments: JSX.Element[] = [];
  let cursor = 0;

  sortedMatches.forEach((match, index) => {
    const start = Math.max(cursor, Number(match.start || 0));
    const end = Math.max(start, Number(match.end || 0));
    if (start > cursor) {
      segments.push(
        <span key={`text:${cursor}:${start}`}>
          {content.slice(cursor, start)}
        </span>,
      );
    }
    if (end > start) {
      const visibleText = content.slice(start, end);
      segments.push(
        <InlineDocumentLink
          key={`document:${String(match.attachment.path || "attachment")}:${index}:${start}`}
          attachment={match.attachment}
          text={visibleText}
          onOpenDocument={onOpenDocument}
        />,
      );
    }
    cursor = end;
  });

  if (cursor < content.length) {
    segments.push(
      <span key={`text:${cursor}:end`}>
        {content.slice(cursor)}
      </span>,
    );
  }

  return (
    <div
      className={classNames(
        "break-words whitespace-pre-wrap [overflow-wrap:anywhere]",
        className,
      )}
    >
      {segments}
    </div>
  );
}
