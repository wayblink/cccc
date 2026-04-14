import { beforeEach, describe, expect, it, vi } from "vitest";

function makeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
    clear: vi.fn(() => {
      data.clear();
    }),
  };
}

const localStorageMock = makeStorage();
vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("window", { localStorage: localStorageMock });

describe("useNotesStore", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorageMock.clear();
  });

  it("creates Scratchpad on first load", async () => {
    const mod = await import("../../src/stores/useNotesStore");
    expect(mod.useNotesStore.getState().notes).toEqual([
      {
        id: "scratchpad",
        title: "Scratchpad",
        body: "",
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        kind: "scratchpad",
      },
    ]);
    expect(mod.useNotesStore.getState().selectedNoteId).toBe("scratchpad");
  });

  it("restores and sanitizes persisted payloads", async () => {
    localStorageMock.setItem("cccc-notes-state", JSON.stringify({
      notes: [
        { id: "note-a", title: "A", body: "alpha", createdAt: 1, updatedAt: 4, kind: "note" },
        { id: "scratchpad", title: "bad", body: "body", createdAt: 2, updatedAt: 3, kind: "note" },
        { id: "note-a", title: "new", body: "beta", createdAt: 1, updatedAt: 8, kind: "note" },
      ],
      selectedNoteId: "missing",
    }));

    const mod = await import("../../src/stores/useNotesStore");
    expect(mod.useNotesStore.getState().notes).toEqual([
      {
        id: "scratchpad",
        title: "Scratchpad",
        body: "body",
        createdAt: 2,
        updatedAt: 3,
        kind: "scratchpad",
      },
      {
        id: "note-a",
        title: "new",
        body: "beta",
        createdAt: 1,
        updatedAt: 8,
        kind: "note",
      },
    ]);
    expect(mod.useNotesStore.getState().selectedNoteId).toBe("scratchpad");
  });

  it("refuses to delete Scratchpad", async () => {
    const mod = await import("../../src/stores/useNotesStore");
    expect(mod.useNotesStore.getState().deleteNote("scratchpad")).toBe(false);
    expect(mod.useNotesStore.getState().notes).toHaveLength(1);
  });

  it("keeps Scratchpad first after note edits", async () => {
    const mod = await import("../../src/stores/useNotesStore");
    const firstId = mod.useNotesStore.getState().createNote();
    mod.useNotesStore.getState().updateNote(firstId, { title: "Later" });
    const secondId = mod.useNotesStore.getState().createNote();
    mod.useNotesStore.getState().updateNote(secondId, { title: "Latest" });

    expect(mod.useNotesStore.getState().notes.map((note) => note.id)).toEqual([
      "scratchpad",
      secondId,
      firstId,
    ]);
  });

  it("falls back invalid selected note id to Scratchpad", async () => {
    const mod = await import("../../src/stores/useNotesStore");
    mod.useNotesStore.getState().selectNote("missing");
    expect(mod.useNotesStore.getState().selectedNoteId).toBe("scratchpad");
  });

  it("persists edits and keeps Scratchpad selected after delete", async () => {
    const mod = await import("../../src/stores/useNotesStore");
    const noteId = mod.useNotesStore.getState().createNote();
    mod.useNotesStore.getState().updateNote(noteId, { title: "Todo", body: "Line 1" });
    mod.useNotesStore.getState().selectNote(noteId);

    expect(localStorageMock.setItem).toHaveBeenCalled();
    expect(mod.useNotesStore.getState().deleteNote(noteId)).toBe(true);
    expect(mod.useNotesStore.getState().selectedNoteId).toBe("scratchpad");
  });
});
