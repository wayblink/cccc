// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotesList } from "../../../src/pages/notes/NotesList";
import type { NoteRecord } from "../../../src/types";

const note: NoteRecord = {
  id: "scratchpad",
  title: "Scratchpad",
  body: "quick note",
  updated_at: "2026-04-29T00:00:00Z",
};

describe("NotesList", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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

  it("uses the same simple list header style as Script Manager", () => {
    act(() => {
      root?.render(
        <NotesList
          notes={[note]}
          selectedNoteId={note.id}
          onCreateNote={vi.fn()}
          onSelectNote={vi.fn()}
        />,
      );
    });

    expect(container?.textContent).not.toContain("Local-first workspace");
    expect(container?.textContent).not.toContain("本地工作台");

    const heading = container?.querySelector("h2");
    expect(heading?.textContent).toBe("Notes");
    expect(heading?.className).toBe("text-base font-semibold text-[var(--color-text-primary)]");
  });
});
