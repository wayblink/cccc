import { useMemo } from "react";

import { useUIStore, useNotesStore } from "../../stores";
import { NoteEditor } from "./NoteEditor";
import { NotesList } from "./NotesList";
import { getNotesChrome } from "./chrome";

type NotesPageProps = {
  isDark: boolean;
  readOnly?: boolean;
};

export function NotesPage({ isDark, readOnly = false }: NotesPageProps) {
  const chrome = getNotesChrome();
  const showNotice = useUIStore((state) => state.showNotice);
  const notes = useNotesStore((state) => state.notes);
  const selectedNoteId = useNotesStore((state) => state.selectedNoteId);
  const selectNote = useNotesStore((state) => state.selectNote);
  const createNote = useNotesStore((state) => state.createNote);
  const updateNote = useNotesStore((state) => state.updateNote);
  const deleteNote = useNotesStore((state) => state.deleteNote);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) || notes[0] || null,
    [notes, selectedNoteId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col p-4 md:p-5">
      <div className="mb-4 flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <NotesList
          notes={notes}
          selectedNoteId={selectedNote?.id || null}
          readOnly={readOnly}
          onCreateNote={() => {
            if (readOnly) return;
            createNote();
            showNotice({ message: chrome.createNotice });
          }}
          onSelectNote={selectNote}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <NoteEditor
            isDark={isDark}
            readOnly={readOnly}
            note={selectedNote}
            onChange={(noteId, patch) => {
              if (readOnly) return;
              updateNote(noteId, patch);
            }}
            onDelete={(noteId) => {
              if (readOnly) return;
              if (deleteNote(noteId)) {
                showNotice({ message: chrome.deleteNotice });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
