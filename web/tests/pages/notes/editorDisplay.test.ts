import { describe, expect, it } from "vitest";

import { getNoteLineCount } from "../../../src/pages/notes/model";

function getEditorLineNumbers(body: string): number[] {
  return Array.from({ length: getNoteLineCount(body) }, (_, index) => index + 1);
}

describe("notes editor display helpers", () => {
  it("shows at least one line number for an empty note", () => {
    expect(getEditorLineNumbers("")).toEqual([1]);
  });

  it("counts one line number per text line", () => {
    expect(getEditorLineNumbers("alpha\nbeta\ngamma")).toEqual([1, 2, 3]);
  });

  it("keeps a trailing blank line visible in the gutter", () => {
    expect(getEditorLineNumbers("alpha\n")).toEqual([1, 2]);
  });
});
