import { create } from "zustand";

import type { NoteRecord } from "../types";
import {
  chooseSelectedNoteId,
  createNoteRecord,
  normalizeNotes,
  SCRATCHPAD_NOTE_ID,
  updateNoteRecord,
} from "../pages/notes/model";

export const NOTES_STORAGE_KEY = "cccc-notes-state";

export type NotesStateSnapshot = {
  notes: NoteRecord[];
  selectedNoteId: string;
};

interface NotesState extends NotesStateSnapshot {
  selectNote: (noteId: string | null | undefined) => void;
  createNote: () => string;
  updateNote: (noteId: string, patch: Partial<Pick<NoteRecord, "title" | "body">>) => void;
  deleteNote: (noteId: string) => boolean;
}

function createNotesStateSnapshot(value: unknown, fallbackNow = Date.now()): NotesStateSnapshot {
  const raw = value && typeof value === "object" ? (value as { notes?: unknown; selectedNoteId?: unknown }) : {};
  const notes = normalizeNotes(raw.notes, fallbackNow);
  const selectedNoteId = chooseSelectedNoteId(
    notes,
    typeof raw.selectedNoteId === "string" ? raw.selectedNoteId : null,
  ) || SCRATCHPAD_NOTE_ID;
  return { notes, selectedNoteId };
}

export function loadNotesState(): NotesStateSnapshot {
  if (typeof window === "undefined") {
    return createNotesStateSnapshot(null);
  }

  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) {
      return createNotesStateSnapshot(null);
    }
    return createNotesStateSnapshot(JSON.parse(raw));
  } catch (error) {
    console.warn("Failed to read notes from localStorage:", error);
    return createNotesStateSnapshot(null);
  }
}

function persistNotesState(snapshot: NotesStateSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Failed to persist notes:", error);
  }
}

export const useNotesStore = create<NotesState>((set) => ({
  ...loadNotesState(),
  selectNote: (noteId) => {
    set((state) => {
      const snapshot = createNotesStateSnapshot({
        notes: state.notes,
        selectedNoteId: noteId,
      });
      persistNotesState(snapshot);
      return snapshot;
    });
  },
  createNote: () => {
    let createdNoteId = SCRATCHPAD_NOTE_ID;
    set((state) => {
      const nextNote = createNoteRecord();
      createdNoteId = nextNote.id;
      const snapshot = createNotesStateSnapshot({
        notes: [...state.notes, nextNote],
        selectedNoteId: nextNote.id,
      }, nextNote.updatedAt);
      persistNotesState(snapshot);
      return snapshot;
    });
    return createdNoteId;
  },
  updateNote: (noteId, patch) => {
    const normalizedId = String(noteId || "").trim();
    if (!normalizedId) return;
    set((state) => {
      const existing = state.notes.find((note) => note.id === normalizedId);
      if (!existing) return state;
      const updated = updateNoteRecord(existing, patch);
      const snapshot = createNotesStateSnapshot({
        notes: state.notes.map((note) => (note.id === normalizedId ? updated : note)),
        selectedNoteId: state.selectedNoteId,
      }, updated.updatedAt);
      persistNotesState(snapshot);
      return snapshot;
    });
  },
  deleteNote: (noteId) => {
    const normalizedId = String(noteId || "").trim();
    if (!normalizedId || normalizedId === SCRATCHPAD_NOTE_ID) {
      return false;
    }

    let deleted = false;
    set((state) => {
      if (!state.notes.some((note) => note.id === normalizedId)) {
        return state;
      }
      deleted = true;
      const snapshot = createNotesStateSnapshot({
        notes: state.notes.filter((note) => note.id !== normalizedId),
        selectedNoteId: state.selectedNoteId === normalizedId ? SCRATCHPAD_NOTE_ID : state.selectedNoteId,
      });
      persistNotesState(snapshot);
      return snapshot;
    });
    return deleted;
  },
}));

export { createNotesStateSnapshot };
