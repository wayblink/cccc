import { describe, expect, it } from "vitest";

import { ClipboardIcon } from "../../src/components/Icons";
import { getNotesNavMeta } from "../../src/components/layout/notesNav";

describe("getNotesNavMeta", () => {
  it("uses a notes-specific icon without sidebar subtitle copy", () => {
    const meta = getNotesNavMeta();

    expect(meta.title).toBe("Notes");
    expect(meta.subtitle).toBeNull();
    expect(meta.Icon).toBe(ClipboardIcon);
  });
});
