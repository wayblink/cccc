// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageAttachment } from "../../../src/types";
import { InlineDocumentText } from "../../../src/components/messageBubble/InlineDocumentText";

describe("InlineDocumentText", () => {
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

  it("renders a plain-text document mention as an inline link and opens it on click", () => {
    const handleOpen = vi.fn();
    const attachment: MessageAttachment = {
      kind: "file",
      path: "state/blobs/abc123_notes.md",
      title: "notes.md",
      mime_type: "text/markdown",
      bytes: 18,
    };

    act(() => {
      root?.render(
        <InlineDocumentText
          text="结果在 state/blobs/abc123_notes.md 里"
          matches={[
            {
              attachment,
              matchedText: "state/blobs/abc123_notes.md",
              start: 4,
              end: 31,
            },
          ]}
          onOpenDocument={handleOpen}
          className="max-w-full"
        />,
      );
    });

    const link = container?.querySelector('a[data-document-link="true"]') as HTMLAnchorElement | null;
    expect(link?.textContent).toBe("state/blobs/abc123_notes.md");

    act(() => {
      link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(handleOpen).toHaveBeenCalledWith(attachment);
    expect(container?.textContent).toContain("结果在 state/blobs/abc123_notes.md 里");
  });
});
