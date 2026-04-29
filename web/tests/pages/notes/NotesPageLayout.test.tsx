// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { notesState, uiState } = vi.hoisted(() => ({
  notesState: {
    notes: [
      {
        id: "scratchpad",
        title: "Scratchpad",
        body: "quick note",
        updated_at: "2026-04-29T00:00:00Z",
      },
    ],
    selectedNoteId: "scratchpad",
    selectNote: vi.fn(),
    createNote: vi.fn(() => "note-1"),
    updateNote: vi.fn(),
    deleteNote: vi.fn(() => true),
    loadNotes: vi.fn(async () => undefined),
  },
  uiState: {
    showNotice: vi.fn(),
  },
}));

vi.mock("../../../src/stores", () => ({
  useNotesStore: (selector: (state: typeof notesState) => unknown) => selector(notesState),
  useUIStore: (selector: (state: typeof uiState) => unknown) => selector(uiState),
}));

import { NotesPage } from "../../../src/pages/notes/NotesPage";

describe("NotesPage layout", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    notesState.loadNotes.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    vi.clearAllMocks();
  });

  it("uses the same internal split row spacing as Script Manager", () => {
    act(() => {
      root?.render(<NotesPage isDark={false} readOnly={false} />);
    });

    const outer = container?.firstElementChild;
    const splitRow = outer?.firstElementChild;

    expect(splitRow?.className).toBe("flex min-h-0 flex-1 flex-col gap-4 md:flex-row");
    expect(splitRow?.className).not.toContain("mb-4");
  });
});
