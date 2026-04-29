import { describe, expect, it } from "vitest";

import { parseUnifiedDiffLines } from "../../../src/features/workspaceInspector/workspaceDiffUtils";

describe("parseUnifiedDiffLines", () => {
  it("classifies unified diff lines for rendering", () => {
    const lines = parseUnifiedDiffLines([
      "diff --git a/src/app.ts b/src/app.ts",
      "--- a/src/app.ts",
      "+++ b/src/app.ts",
      "@@ -1,2 +1,2 @@",
      " unchanged",
      "-old line",
      "+new line",
    ].join("\n"));

    expect(lines.map((line) => line.kind)).toEqual([
      "file",
      "file",
      "file",
      "hunk",
      "context",
      "remove",
      "add",
    ]);
    expect(lines[6]?.text).toBe("+new line");
  });
});
