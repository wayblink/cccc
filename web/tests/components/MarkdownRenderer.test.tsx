// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageAttachment } from "../../src/types";
import { MarkdownRenderer } from "../../src/components/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it("renders a referenced markdown document mention as an inline link and opens it on click", () => {
    const handleOpen = vi.fn();
    const attachment: MessageAttachment = {
      kind: "file",
      path: "state/blobs/dee1159_notes.md",
      title: "notes.md",
      mime_type: "text/markdown",
      bytes: 18,
    };

    act(() => {
      root?.render(
        <MarkdownRenderer
          content="结果在 `text-attachment-edit-1776306155.md` 里"
          textDocumentMatches={[
            {
              attachment,
              matchedText: "text-attachment-edit-1776306155.md",
              start: 5,
              end: 38,
            },
          ]}
          onTextDocumentClick={handleOpen}
        />,
      );
    });

    const link = container?.querySelector('a[data-document-link="true"]') as HTMLAnchorElement | null;
    expect(link?.textContent).toBe("text-attachment-edit-1776306155.md");
    expect(link?.closest("code")).toBeTruthy();

    act(() => {
      link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(handleOpen).toHaveBeenCalledWith(attachment);
  });
});
