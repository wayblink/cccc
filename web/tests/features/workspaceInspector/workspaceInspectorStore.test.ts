import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  fetchWorkspaceTree: vi.fn(),
  fetchWorkspaceFile: vi.fn(),
  fetchWorkspaceGitStatus: vi.fn(),
  fetchWorkspaceGitDiff: vi.fn(),
}));

vi.mock("../../../src/features/workspaceInspector/workspaceApi", () => apiMocks);

describe("workspace inspector store", () => {
  beforeEach(async () => {
    vi.resetModules();
    apiMocks.fetchWorkspaceTree.mockReset();
    apiMocks.fetchWorkspaceFile.mockReset();
    apiMocks.fetchWorkspaceGitStatus.mockReset();
    apiMocks.fetchWorkspaceGitDiff.mockReset();
  });

  it("loads tree and git status for the active group", async () => {
    apiMocks.fetchWorkspaceTree.mockResolvedValue({
      ok: true,
      result: {
        root_path: "/repo",
        path: "",
        parent: null,
        items: [{ name: "src", path: "src", is_dir: true }],
      },
    });
    apiMocks.fetchWorkspaceGitStatus.mockResolvedValue({
      ok: true,
      result: {
        is_git_repo: true,
        root_path: "/repo",
        items: [{ path: "src/app.ts", index: " ", worktree: "M", status: "modified" }],
      },
    });

    const { useWorkspaceInspectorStore } = await import("../../../src/features/workspaceInspector/workspaceInspectorStore");
    await useWorkspaceInspectorStore.getState().refresh("g-1");

    const state = useWorkspaceInspectorStore.getState();
    expect(state.currentGroupId).toBe("g-1");
    expect(state.treeByDir[""]?.items[0]?.path).toBe("src");
    expect(state.statusByPath["src/app.ts"]?.status).toBe("modified");
  });

  it("selects a file and loads its diff", async () => {
    apiMocks.fetchWorkspaceFile.mockResolvedValue({
      ok: true,
      result: {
        root_path: "/repo",
        path: "README.md",
        name: "README.md",
        mime_type: "text/markdown",
        size: 12,
        is_binary: false,
        truncated: false,
        content: "Hello\nworld",
      },
    });
    apiMocks.fetchWorkspaceGitDiff.mockResolvedValue({
      ok: true,
      result: {
        is_git_repo: true,
        path: "README.md",
        diff: "diff --git a/README.md b/README.md\n+Hello",
        truncated: false,
      },
    });

    const { useWorkspaceInspectorStore } = await import("../../../src/features/workspaceInspector/workspaceInspectorStore");
    await useWorkspaceInspectorStore.getState().selectFile("g-1", "README.md");
    await useWorkspaceInspectorStore.getState().loadDiff("g-1", "README.md");

    const state = useWorkspaceInspectorStore.getState();
    expect(state.selectedPath).toBe("README.md");
    expect(state.selectedFile?.content).toContain("Hello");
    expect(state.selectedDiff?.diff).toContain("diff --git");
  });
});
