import { describe, expect, it } from "vitest";

import { dirname, normalizeWorkspacePath } from "../../../src/features/workspaceInspector/pathUtils";

describe("workspace path helpers", () => {
  it("normalizes UI paths to relative POSIX paths", () => {
    expect(normalizeWorkspacePath("\\\\src\\\\App.tsx")).toBe("src/App.tsx");
    expect(normalizeWorkspacePath("/docs//guide.md")).toBe("docs/guide.md");
    expect(normalizeWorkspacePath("./src/../README.md")).toBe("README.md");
  });

  it("keeps paths inside the workspace root", () => {
    expect(normalizeWorkspacePath("../../etc/passwd")).toBe("");
    expect(normalizeWorkspacePath("src/../../../secret.txt")).toBe("");
    expect(dirname("src/cccc/App.tsx")).toBe("src/cccc");
  });
});
