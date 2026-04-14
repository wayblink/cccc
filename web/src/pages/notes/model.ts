import type { NoteRecord } from "../../types";

export const SCRATCHPAD_NOTE_ID = "scratchpad";
export const SCRATCHPAD_NOTE_TITLE = "Scratchpad";
export const UNTITLED_NOTE_TITLE = "Untitled note";

function normalizeTimestamp(value: unknown, fallbackNow: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallbackNow;
  return Math.max(0, Math.round(numeric));
}

function createNoteId(now: number): string {
  return `note-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isScratchpadNoteId(noteId: string | null | undefined): boolean {
  return String(noteId || "").trim() === SCRATCHPAD_NOTE_ID;
}

export function createScratchpadNote(now = Date.now()): NoteRecord {
  const timestamp = normalizeTimestamp(now, Date.now());
  return {
    id: SCRATCHPAD_NOTE_ID,
    title: SCRATCHPAD_NOTE_TITLE,
    body: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    kind: "scratchpad",
  };
}

export function createNoteRecord(options: { id?: string; now?: number } = {}): NoteRecord {
  const fallbackNow = Date.now();
  const timestamp = normalizeTimestamp(options.now, fallbackNow);
  const preferredId = String(options.id || "").trim();
  return {
    id: preferredId || createNoteId(timestamp),
    title: "",
    body: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    kind: "note",
  };
}

export function sanitizeNoteRecord(value: unknown, fallbackNow = Date.now()): NoteRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<NoteRecord>;
  const rawId = String(raw.id || "").trim();
  const rawKind = raw.kind === "scratchpad" ? "scratchpad" : raw.kind === "note" ? "note" : null;
  const isScratchpad = rawKind === "scratchpad" || isScratchpadNoteId(rawId);
  const id = isScratchpad ? SCRATCHPAD_NOTE_ID : rawId;
  if (!id) return null;

  const createdAt = normalizeTimestamp(raw.createdAt, fallbackNow);
  const updatedAt = Math.max(createdAt, normalizeTimestamp(raw.updatedAt, createdAt));
  return {
    id,
    title: isScratchpad ? SCRATCHPAD_NOTE_TITLE : String(raw.title || ""),
    body: String(raw.body || ""),
    createdAt,
    updatedAt,
    kind: isScratchpad ? "scratchpad" : "note",
  };
}

export function orderNotes(notes: NoteRecord[]): NoteRecord[] {
  return [...notes].sort((left, right) => {
    const leftScratchpad = isScratchpadNoteId(left.id);
    const rightScratchpad = isScratchpadNoteId(right.id);
    if (leftScratchpad !== rightScratchpad) {
      return leftScratchpad ? -1 : 1;
    }
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt - left.updatedAt;
    }
    if (left.createdAt !== right.createdAt) {
      return right.createdAt - left.createdAt;
    }
    return left.id.localeCompare(right.id);
  });
}

export function normalizeNotes(value: unknown, fallbackNow = Date.now()): NoteRecord[] {
  const notesById = new Map<string, NoteRecord>();
  let scratchpad: NoteRecord | null = null;

  for (const raw of Array.isArray(value) ? value : []) {
    const note = sanitizeNoteRecord(raw, fallbackNow);
    if (!note) continue;
    if (isScratchpadNoteId(note.id)) {
      if (!scratchpad || note.updatedAt >= scratchpad.updatedAt) {
        scratchpad = note;
      }
      continue;
    }
    const existing = notesById.get(note.id);
    if (!existing || note.updatedAt >= existing.updatedAt) {
      notesById.set(note.id, note);
    }
  }

  return orderNotes([scratchpad || createScratchpadNote(fallbackNow), ...notesById.values()]);
}

export function updateNoteRecord(
  note: NoteRecord,
  patch: Partial<Pick<NoteRecord, "title" | "body">>,
  now = Date.now(),
): NoteRecord {
  const updatedAt = Math.max(note.createdAt, normalizeTimestamp(now, note.updatedAt));
  return {
    ...note,
    title: isScratchpadNoteId(note.id) ? SCRATCHPAD_NOTE_TITLE : String(patch.title ?? note.title ?? ""),
    body: String(patch.body ?? note.body ?? ""),
    kind: isScratchpadNoteId(note.id) ? "scratchpad" : "note",
    updatedAt,
  };
}

export function chooseSelectedNoteId(
  notes: NoteRecord[],
  preferredId: string | null | undefined,
): string | null {
  const normalizedPreferredId = String(preferredId || "").trim();
  if (normalizedPreferredId && notes.some((note) => note.id === normalizedPreferredId)) {
    return normalizedPreferredId;
  }
  const scratchpadId = notes.find((note) => isScratchpadNoteId(note.id))?.id;
  return scratchpadId || notes[0]?.id || null;
}

export function getNoteDisplayTitle(
  note: NoteRecord,
  labels?: { scratchpadTitle?: string; untitledTitle?: string },
): string {
  if (isScratchpadNoteId(note.id)) {
    return labels?.scratchpadTitle || SCRATCHPAD_NOTE_TITLE;
  }
  const trimmedTitle = String(note.title || "").trim();
  return trimmedTitle || labels?.untitledTitle || UNTITLED_NOTE_TITLE;
}

export function getNoteLineCount(body: string): number {
  return Math.max(1, String(body || "").split("\n").length);
}
