import type { NoteRecord } from "../../types";
import { PlusIcon, ClipboardIcon } from "../../components/Icons";
import { classNames } from "../../utils/classNames";
import { getNotesChrome } from "./chrome";
import { getNoteDisplayTitle, isScratchpadNoteId } from "./model";

type NotesListProps = {
  notes: NoteRecord[];
  selectedNoteId: string | null;
  loading?: boolean;
  readOnly?: boolean;
  onCreateNote: () => void;
  onSelectNote: (noteId: string) => void;
};

function getPreview(body: string): string {
  return String(body || "").replace(/\s+/g, " ").trim();
}

export function NotesList({
  notes,
  selectedNoteId,
  loading = false,
  readOnly = false,
  onCreateNote,
  onSelectNote,
}: NotesListProps) {
  const chrome = getNotesChrome();

  return (
    <aside className="glass-card flex min-h-[280px] w-full flex-col overflow-hidden md:min-h-0 md:w-[320px] md:max-w-[320px]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            {chrome.listTitle}
          </div>
          <h2 className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">{chrome.pageTitle}</h2>
        </div>
        <button
          type="button"
          className="glass-btn-accent flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-accent-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onCreateNote}
          aria-label={chrome.createButtonLabel}
          title={chrome.createButtonLabel}
          disabled={readOnly}
        >
          <PlusIcon size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {loading ? (
          <div className="glass-card flex h-full min-h-[180px] items-center justify-center px-6 text-sm text-[var(--color-text-secondary)]">
            Loading notes...
          </div>
        ) : notes.length ? (
          <div className="space-y-2">
            {notes.map((note) => {
              const isActive = note.id === selectedNoteId;
              const isScratchpad = isScratchpadNoteId(note.id);
              const title = getNoteDisplayTitle(note, {
                scratchpadTitle: chrome.scratchpadTitle,
                untitledTitle: chrome.untitledNoteTitle,
              });
              const preview = getPreview(note.body);
              return (
                <button
                  key={note.id}
                  type="button"
                  className={classNames(
                    "glass-card w-full rounded-2xl px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
                      : "hover:border-[var(--glass-border)]"
                  )}
                  onClick={() => onSelectNote(note.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{title}</div>
                      <div className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-[var(--color-text-secondary)]">
                        {preview || chrome.bodyPlaceholder}
                      </div>
                    </div>
                    <span
                      className={classNames(
                        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                        isScratchpad
                          ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                          : "bg-slate-500/10 text-[var(--color-text-secondary)]"
                      )}
                    >
                      {isScratchpad ? chrome.scratchpadTitle : chrome.localOnlyBadge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="glass-card flex h-full min-h-[220px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--glass-panel-bg)] text-[var(--color-text-secondary)]">
              <ClipboardIcon size={28} />
            </div>
            <div className="mt-4 text-sm font-medium text-[var(--color-text-primary)]">{chrome.emptyStateTitle}</div>
            <p className="mt-2 max-w-[220px] text-xs leading-5 text-[var(--color-text-secondary)]">
              {chrome.emptyStateBody}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
