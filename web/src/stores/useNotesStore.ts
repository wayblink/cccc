import { create } from "zustand";

import type { NoteRecord } from "../types";
import {
  chooseSelectedNoteId,
  createNoteRecord,
  normalizeNotes,
  SCRATCHPAD_NOTE_ID,
  updateNoteRecord,
} from "../pages/notes/model";
import {
  createUserNote,
  deleteUserNote,
  fetchUserNotes,
  importUserNotes,
  updateUserNote,
  type UserNotesSnapshot,
} from "../services/api/notes";

export const NOTES_STORAGE_KEY = "cccc-notes-state";

export type NotesStateSnapshot = {
  notes: NoteRecord[];
  selectedNoteId: string;
};

interface NotesState extends NotesStateSnapshot {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  loadNotes: () => Promise<void>;
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

function isDefaultSnapshot(snapshot: NotesStateSnapshot): boolean {
  return snapshot.notes.length === 1 && snapshot.notes[0]?.id === SCRATCHPAD_NOTE_ID && !snapshot.notes[0]?.body;
}

function hasUserContent(snapshot: NotesStateSnapshot): boolean {
  return snapshot.notes.some((note) => {
    if (note.id === SCRATCHPAD_NOTE_ID) return String(note.body || "").trim().length > 0;
    return String(note.title || "").trim().length > 0 || String(note.body || "").trim().length > 0;
  });
}

function readLocalNotesState(): NotesStateSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return null;
    return createNotesStateSnapshot(JSON.parse(raw));
  } catch (error) {
    console.warn("Failed to read notes from localStorage:", error);
    return null;
  }
}

export function loadNotesState(): NotesStateSnapshot {
  return readLocalNotesState() || createNotesStateSnapshot(null);
}

function persistNotesState(snapshot: NotesStateSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Failed to persist notes:", error);
  }
}

function applyServerSnapshot(snapshot: UserNotesSnapshot): NotesStateSnapshot {
  return createNotesStateSnapshot(snapshot);
}

export const useNotesStore = create<NotesState>((set, get) => ({
  ...loadNotesState(),
  loading: false,
  loaded: false,
  error: null,
  loadNotes: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    const response = await fetchUserNotes();
    if (!response.ok) {
      set({ loading: false, loaded: true, error: response.error.message });
      return;
    }

    let snapshot = applyServerSnapshot(response.result);
    const localSnapshot = readLocalNotesState();
    if (isDefaultSnapshot(snapshot) && localSnapshot && hasUserContent(localSnapshot)) {
      const imported = await importUserNotes(localSnapshot);
      if (imported.ok) {
        snapshot = applyServerSnapshot(imported.result);
      }
    }

    persistNotesState(snapshot);
    set({ ...snapshot, loading: false, loaded: true, error: null });
  },
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
    const fallbackNote = createNoteRecord();
    let createdNoteId = fallbackNote.id;
    set((state) => {
      const snapshot = createNotesStateSnapshot({
        notes: [...state.notes, fallbackNote],
        selectedNoteId: fallbackNote.id,
      }, fallbackNote.updatedAt);
      persistNotesState(snapshot);
      return snapshot;
    });

    void createUserNote().then(async (response) => {
      if (!response.ok) {
        set({ error: response.error.message });
        return;
      }
      createdNoteId = response.result.note.id;
      const pendingLocal = get().notes.find((note) => note.id === fallbackNote.id);
      const pendingPatch = pendingLocal
        ? { title: pendingLocal.title, body: pendingLocal.body }
        : { title: "", body: "" };
      if (String(pendingPatch.title || "").trim() || String(pendingPatch.body || "").trim()) {
        const updated = await updateUserNote(response.result.note.id, pendingPatch);
        if (updated.ok) {
          const snapshot = applyServerSnapshot(updated.result.snapshot);
          persistNotesState(snapshot);
          set({ ...snapshot, error: null });
          return;
        }
      }
      const snapshot = applyServerSnapshot(response.result.snapshot);
      persistNotesState(snapshot);
      set({ ...snapshot, error: null });
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
    void updateUserNote(normalizedId, patch).then((response) => {
      if (!response.ok) {
        set({ error: response.error.message });
        return;
      }
      const snapshot = applyServerSnapshot(response.result.snapshot);
      persistNotesState(snapshot);
      set({ ...snapshot, error: null });
    });
  },
  deleteNote: (noteId) => {
    const normalizedId = String(noteId || "").trim();
    if (!normalizedId || normalizedId === SCRATCHPAD_NOTE_ID) {
      return false;
    }

    let deleted = false;
    set((state) => {
      if (!state.notes.some((note) => note.id === normalizedId)) return state;
      deleted = true;
      const snapshot = createNotesStateSnapshot({
        notes: state.notes.filter((note) => note.id !== normalizedId),
        selectedNoteId: state.selectedNoteId === normalizedId ? SCRATCHPAD_NOTE_ID : state.selectedNoteId,
      });
      persistNotesState(snapshot);
      return snapshot;
    });
    if (deleted) {
      void deleteUserNote(normalizedId).then((response) => {
        if (!response.ok) {
          set({ error: response.error.message });
          return;
        }
        const snapshot = applyServerSnapshot(response.result);
        persistNotesState(snapshot);
        set({ ...snapshot, error: null });
      });
    }
    return deleted;
  },
}));

export { createNotesStateSnapshot };
