import type { NoteRecord } from "../../types";
import { apiJson } from "./base";
import type { ApiResponse } from "./base";

export type UserNotesSnapshot = {
  notes: NoteRecord[];
  selectedNoteId: string;
};

type RawNoteRecord = {
  id?: unknown;
  title?: unknown;
  body?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
  kind?: unknown;
};

type RawNotesSnapshot = {
  notes?: unknown;
  selected_note_id?: unknown;
  selectedNoteId?: unknown;
};

type RawSnapshotResult = {
  snapshot?: RawNotesSnapshot;
};

type RawNoteResult = RawSnapshotResult & {
  note?: RawNoteRecord;
};

function timestampMs(value: unknown, fallback = Date.now()): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.max(0, Math.round(numeric));
  }
  return fallback;
}

function normalizeNote(raw: unknown, fallbackNow = Date.now()): NoteRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as RawNoteRecord;
  const rawId = String(record.id || "").trim();
  const isScratchpad = rawId === "scratchpad" || record.kind === "scratchpad";
  const id = isScratchpad ? "scratchpad" : rawId;
  if (!id) return null;
  const createdAt = timestampMs(record.created_at ?? record.createdAt, fallbackNow);
  const updatedAt = Math.max(createdAt, timestampMs(record.updated_at ?? record.updatedAt, createdAt));
  return {
    id,
    title: isScratchpad ? "Scratchpad" : String(record.title || ""),
    body: String(record.body || ""),
    createdAt,
    updatedAt,
    kind: isScratchpad ? "scratchpad" : "note",
  };
}

function normalizeSnapshot(raw: unknown): UserNotesSnapshot {
  const source = raw && typeof raw === "object" ? (raw as RawNotesSnapshot) : {};
  const fallbackNow = Date.now();
  const notes = (Array.isArray(source.notes) ? source.notes : [])
    .map((item) => normalizeNote(item, fallbackNow))
    .filter((item): item is NoteRecord => !!item);
  const selectedNoteId = String(source.selected_note_id || source.selectedNoteId || "scratchpad").trim() || "scratchpad";
  return { notes, selectedNoteId };
}

function mapSnapshotResponse(response: ApiResponse<RawSnapshotResult>): ApiResponse<UserNotesSnapshot> {
  if (!response.ok) return response;
  return { ok: true, result: normalizeSnapshot(response.result.snapshot) };
}

export async function fetchUserNotes(): Promise<ApiResponse<UserNotesSnapshot>> {
  return mapSnapshotResponse(await apiJson<RawSnapshotResult>("/api/v1/user/notes"));
}

export async function createUserNote(input: { title?: string; body?: string } = {}): Promise<ApiResponse<{ note: NoteRecord; snapshot: UserNotesSnapshot }>> {
  const response = await apiJson<RawNoteResult>("/api/v1/user/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) return response;
  const note = normalizeNote(response.result.note);
  if (!note) return { ok: false, error: { code: "INVALID_NOTE", message: "Server returned an invalid note" } };
  return { ok: true, result: { note, snapshot: normalizeSnapshot(response.result.snapshot) } };
}

export async function updateUserNote(noteId: string, patch: Partial<Pick<NoteRecord, "title" | "body">>): Promise<ApiResponse<{ note: NoteRecord; snapshot: UserNotesSnapshot }>> {
  const response = await apiJson<RawNoteResult>(`/api/v1/user/notes/${encodeURIComponent(noteId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!response.ok) return response;
  const note = normalizeNote(response.result.note);
  if (!note) return { ok: false, error: { code: "INVALID_NOTE", message: "Server returned an invalid note" } };
  return { ok: true, result: { note, snapshot: normalizeSnapshot(response.result.snapshot) } };
}

export async function deleteUserNote(noteId: string): Promise<ApiResponse<UserNotesSnapshot>> {
  return mapSnapshotResponse(
    await apiJson<RawSnapshotResult>(`/api/v1/user/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" }),
  );
}

export async function importUserNotes(snapshot: UserNotesSnapshot): Promise<ApiResponse<UserNotesSnapshot>> {
  return mapSnapshotResponse(
    await apiJson<RawSnapshotResult>("/api/v1/user/notes/import", {
      method: "POST",
      body: JSON.stringify(snapshot),
    }),
  );
}
