import { describe, expect, it, vi } from "vitest";

import type { NoteRecord } from "../../../src/types";
import {
  chooseSelectedNoteId,
  createNoteRecord,
  createScratchpadNote,
  getNoteDisplayTitle,
  normalizeNotes,
  orderNotes,
  SCRATCHPAD_NOTE_ID,
  SCRATCHPAD_NOTE_TITLE,
  sanitizeNoteRecord,
  updateNoteRecord,
} from "../../../src/pages/notes/model";

describe("notes model helpers", () => {
  it("creates default note records", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    expect(createNoteRecord({ now: 1700000000000 })).toEqual({
      id: "note-loyw3v28-4fzzzx",
      title: "",
      body: "",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      kind: "note",
    });
    randomSpy.mockRestore();
  });

  it("creates a permanent scratchpad", () => {
    expect(createScratchpadNote(42)).toEqual({
      id: SCRATCHPAD_NOTE_ID,
      title: SCRATCHPAD_NOTE_TITLE,
      body: "",
      createdAt: 42,
      updatedAt: 42,
      kind: "scratchpad",
    });
  });

  it("sanitizes scratchpad invariants", () => {
    expect(
      sanitizeNoteRecord({
        id: " scratchpad ",
        title: "Mutable title",
        body: 123,
        createdAt: "10",
        updatedAt: 8,
        kind: "note",
      }, 100)
    ).toEqual({
      id: SCRATCHPAD_NOTE_ID,
      title: SCRATCHPAD_NOTE_TITLE,
      body: "123",
      createdAt: 10,
      updatedAt: 10,
      kind: "scratchpad",
    });
  });

  it("keeps scratchpad first and sorts notes by update time", () => {
    const older: NoteRecord = {
      id: "note-1",
      title: "Older",
      body: "",
      createdAt: 1,
      updatedAt: 5,
      kind: "note",
    };
    const newer: NoteRecord = {
      id: "note-2",
      title: "Newer",
      body: "",
      createdAt: 2,
      updatedAt: 9,
      kind: "note",
    };

    expect(orderNotes([older, createScratchpadNote(3), newer]).map((note) => note.id)).toEqual([
      SCRATCHPAD_NOTE_ID,
      "note-2",
      "note-1",
    ]);
  });

  it("normalizes malformed payloads and guarantees one scratchpad", () => {
    const notes = normalizeNotes([
      null,
      { id: "note-a", title: "First", body: "A", createdAt: 1, updatedAt: 10, kind: "note" },
      { id: "note-a", title: "Second", body: "B", createdAt: 1, updatedAt: 15, kind: "note" },
      { id: "scratchpad", title: "Wrong", body: "S", createdAt: 2, updatedAt: 3, kind: "note" },
      { id: "", title: "Missing id" },
    ], 50);

    expect(notes).toEqual([
      {
        id: SCRATCHPAD_NOTE_ID,
        title: SCRATCHPAD_NOTE_TITLE,
        body: "S",
        createdAt: 2,
        updatedAt: 3,
        kind: "scratchpad",
      },
      {
        id: "note-a",
        title: "Second",
        body: "B",
        createdAt: 1,
        updatedAt: 15,
        kind: "note",
      },
    ]);
  });

  it("falls back selection to scratchpad", () => {
    const notes = [createScratchpadNote(1), createNoteRecord({ id: "note-a", now: 2 })];
    expect(chooseSelectedNoteId(notes, "note-a")).toBe("note-a");
    expect(chooseSelectedNoteId(notes, "missing")).toBe(SCRATCHPAD_NOTE_ID);
    expect(chooseSelectedNoteId([], "missing")).toBeNull();
  });

  it("updates note content while keeping scratchpad title fixed", () => {
    const scratchpad = createScratchpadNote(10);
    expect(updateNoteRecord(scratchpad, { title: "Changed", body: "Body" }, 20)).toEqual({
      id: SCRATCHPAD_NOTE_ID,
      title: SCRATCHPAD_NOTE_TITLE,
      body: "Body",
      createdAt: 10,
      updatedAt: 20,
      kind: "scratchpad",
    });
  });

  it("uses untitled fallback labels", () => {
    expect(
      getNoteDisplayTitle(
        {
          id: "note-a",
          title: "   ",
          body: "",
          createdAt: 1,
          updatedAt: 1,
          kind: "note",
        },
        { untitledTitle: "Untitled" },
      ),
    ).toBe("Untitled");
  });
});
