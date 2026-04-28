// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      workspaceInspectorCopyPath: "Copy path",
      workspaceInspectorCopyContent: "Copy content",
      workspaceInspectorCopied: "Copied",
      workspaceInspectorSelectFile: "Select a file to preview.",
      workspaceInspectorBinaryFile: "Binary file",
      workspaceInspectorTruncatedPreview: "Truncated preview",
      workspaceInspectorNonGit: "This workspace is not a Git repo.",
      workspaceInspectorDiffEmpty: "No diff to show.",
    }[key] || key),
  }),
}));

import { WorkspaceDiffViewer } from "../../../src/features/workspaceInspector/WorkspaceDiffViewer";
import { WorkspaceFilePreview } from "../../../src/features/workspaceInspector/WorkspaceFilePreview";

describe("workspace inspector components", () => {
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
  });

  it("renders text previews with line numbers and truncation state", () => {
    act(() => {
      root?.render(
        <WorkspaceFilePreview
          preview={{
            root_path: "/repo",
            path: "README.md",
            name: "README.md",
            mime_type: "text/markdown",
            size: 2048,
            is_binary: false,
            truncated: true,
            content: "first\nsecond",
          }}
          loading={false}
          selectedPath="README.md"
        />,
      );
    });

    const text = container?.textContent || "";
    expect(text).toContain("README.md");
    expect(text).toContain("Truncated preview");
    expect(text).toContain("1");
    expect(text).toContain("second");
  });

  it("renders changed files and calls back when a diff target is selected", () => {
    const onSelectPath = vi.fn();
    act(() => {
      root?.render(
        <WorkspaceDiffViewer
          status={{
            is_git_repo: true,
            root_path: "/repo",
            items: [{ path: "README.md", index: " ", worktree: "M", status: "modified" }],
          }}
          diffData={{
            is_git_repo: true,
            path: "README.md",
            diff: "diff --git a/README.md b/README.md\n@@ -1 +1 @@\n-old\n+new",
            truncated: false,
          }}
          loading={false}
          onSelectPath={onSelectPath}
        />,
      );
    });

    const button = Array.from(container?.querySelectorAll("button") || []).find((item) =>
      item.textContent?.includes("README.md"),
    );
    expect(button).toBeTruthy();
    act(() => {
      (button as HTMLButtonElement).click();
    });
    expect(onSelectPath).toHaveBeenCalledWith("README.md");
    expect(container?.querySelector('[data-kind="add"]')?.textContent).toBe("+new");
  });
});
