import { useRef, useState } from "react";

import { createContextModalUi } from "../../components/ContextModal/ui";
import { TrashIcon } from "../../components/Icons";
import type { NoteRecord } from "../../types";
import { classNames } from "../../utils/classNames";
import { getNotesChrome } from "./chrome";
import { getNoteLineCount, isScratchpadNoteId } from "./model";

type NoteEditorProps = {
  isDark: boolean;
  readOnly?: boolean;
  note: NoteRecord | null;
  onChange: (noteId: string, patch: Partial<Pick<NoteRecord, "title" | "body">>) => void;
  onDelete: (noteId: string) => void;
};

export function NoteEditor({
  isDark,
  readOnly = false,
  note,
  onChange,
  onDelete,
}: NoteEditorProps) {
  const ui = createContextModalUi(isDark);
  const chrome = getNotesChrome();
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  if (!note) {
    return (
      <section className="glass-card flex min-h-[380px] flex-1 items-center justify-center overflow-hidden px-6 text-center">
        <div>
          <div className="text-sm font-medium text-[var(--color-text-primary)]">{chrome.emptyStateTitle}</div>
          <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">{chrome.emptyStateBody}</p>
        </div>
      </section>
    );
  }

  const isScratchpad = isScratchpadNoteId(note.id);
  const lineCount = getNoteLineCount(note.body);

  return (
    <section className="glass-card flex min-h-[380px] flex-1 flex-col overflow-hidden px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isScratchpad ? (
            <div className="truncate text-xl font-semibold text-[var(--color-text-primary)] md:text-2xl">
              {chrome.scratchpadTitle}
            </div>
          ) : (
            <input
              aria-label={chrome.titleLabel}
              className="w-full bg-transparent text-xl font-semibold text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] md:text-2xl"
              value={note.title}
              disabled={readOnly}
              placeholder={chrome.titlePlaceholder}
              onChange={(event) => onChange(note.id, { title: event.target.value })}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-[var(--color-text-secondary)]">
          <label className="inline-flex items-center gap-2 whitespace-nowrap">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(event) => setShowLineNumbers(event.target.checked)}
            />
            <span>{chrome.lineNumbersLabel}</span>
          </label>
          {readOnly ? <span className="rounded-full bg-[var(--glass-panel-bg)] px-2.5 py-1">{chrome.readOnlyBadge}</span> : null}
          {!isScratchpad ? (
            <button
              type="button"
              className={classNames(ui.buttonDangerClass, "inline-flex items-center gap-2 rounded-xl px-3 py-1.5")}
              onClick={() => onDelete(note.id)}
              disabled={readOnly}
            >
              <TrashIcon size={14} />
              {chrome.deleteLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[24px] bg-[var(--glass-panel-bg)]/45">
        <div className="flex h-full min-h-[420px]">
          {showLineNumbers ? (
            <div
              ref={gutterRef}
              aria-hidden="true"
              className="hidden h-full w-14 shrink-0 overflow-hidden px-3 py-4 text-right font-mono text-xs leading-6 text-[var(--color-text-tertiary)] md:block"
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <div key={index + 1}>{index + 1}</div>
              ))}
            </div>
          ) : null}

          <textarea
            aria-label={chrome.bodyLabel}
            className={classNames(
              "h-full min-h-[420px] flex-1 resize-none bg-transparent py-4 font-mono text-[13px] leading-6 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]",
              showLineNumbers ? "pr-4" : "px-4"
            )}
            value={note.body}
            disabled={readOnly}
            placeholder={chrome.bodyPlaceholder}
            onChange={(event) => onChange(note.id, { body: event.target.value })}
            onScroll={(event) => {
              if (gutterRef.current) {
                gutterRef.current.scrollTop = event.currentTarget.scrollTop;
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}
