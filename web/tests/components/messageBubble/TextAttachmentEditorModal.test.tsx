// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventAttachment } from "../../../src/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string; name?: string }) =>
      options?.defaultValue ?? options?.name ?? key,
  }),
}));

const { fetchTextAttachmentMock, saveTextAttachmentMock } = vi.hoisted(() => ({
  fetchTextAttachmentMock: vi.fn(),
  saveTextAttachmentMock: vi.fn(),
}));

vi.mock("../../../src/services/api", async () => {
  const actual = await vi.importActual<typeof import("../../../src/services/api")>("../../../src/services/api");
  return {
    ...actual,
    fetchTextAttachment: fetchTextAttachmentMock,
    saveTextAttachment: saveTextAttachmentMock,
  };
});

import { MessageAttachments } from "../../../src/components/messageBubble/MessageAttachments";

function flush() {
  return act(async () => {
    await Promise.resolve();
  });
}

describe("MessageAttachments text document viewer", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  const editableAttachment: EventAttachment = {
    kind: "file",
    path: "state/blobs/hash_demo.md",
    title: "demo.md",
    bytes: 42,
    mime_type: "text/markdown",
  };

  beforeEach(() => {
    fetchTextAttachmentMock.mockReset();
    saveTextAttachmentMock.mockReset();
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

  it("opens a viewer for text attachments and saves a new blob version inside the viewer", async () => {
    fetchTextAttachmentMock.mockResolvedValue({
      ok: true,
      result: {
        path: editableAttachment.path,
        title: editableAttachment.title,
        mime_type: editableAttachment.mime_type,
        bytes: editableAttachment.bytes,
        content: "# hello",
      },
    });
    const savedAttachment: EventAttachment = {
      kind: "file",
      path: "state/blobs/hash_demo_saved.md",
      title: "demo.md",
      bytes: 55,
      mime_type: "text/markdown",
    };
    saveTextAttachmentMock.mockResolvedValue({
      ok: true,
      result: {
        attachment: savedAttachment,
      },
    });

    act(() => {
      root?.render(
        <MessageAttachments
          attachments={[editableAttachment]}
          blobGroupId="g-demo"
          isUserMessage={false}
          isDark={false}
          attachmentKeyPrefix="evt-1"
          downloadTitle={(name) => `Download ${name}`}
        />,
      );
    });

    const viewButton = container?.querySelector('button[aria-label="View demo.md"]') as HTMLButtonElement | null;
    expect(viewButton).toBeTruthy();

    act(() => {
      viewButton?.click();
    });
    await flush();

    expect(fetchTextAttachmentMock).toHaveBeenCalledWith("g-demo", "state/blobs/hash_demo.md");
    expect(container?.textContent).toContain("# hello");

    const editButton = container?.querySelector('button[aria-label="Edit document demo.md"]') as HTMLButtonElement | null;
    expect(editButton).toBeTruthy();
    act(() => {
      editButton?.click();
    });

    const textarea = container?.querySelector("textarea") as HTMLTextAreaElement | null;
    expect(textarea?.value).toBe("# hello");

    act(() => {
      if (textarea) {
        textarea.value = "# updated";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    const saveButton = container?.querySelector('button[aria-label="Save document changes"]') as HTMLButtonElement | null;
    expect(saveButton).toBeTruthy();
    act(() => {
      saveButton?.click();
    });
    await flush();

    expect(saveTextAttachmentMock).toHaveBeenCalledWith("g-demo", {
      filename: "demo.md",
      content: "# updated",
      mimeType: "text/markdown",
    });
    expect(container?.textContent).toContain("Saved as a new document version");
    expect(container?.textContent).toContain("state/blobs/hash_demo_saved.md");
  });

  it("keeps non-text attachments download-only", async () => {
    act(() => {
      root?.render(
        <MessageAttachments
          attachments={[{
            kind: "file",
            path: "state/blobs/hash_demo.pdf",
            title: "demo.pdf",
            bytes: 2048,
            mime_type: "application/pdf",
          }]}
          blobGroupId="g-demo"
          isUserMessage={false}
          isDark={false}
          attachmentKeyPrefix="evt-2"
          downloadTitle={(name) => `Download ${name}`}
        />,
      );
    });

    expect(container?.querySelector('button[aria-label="View demo.pdf"]')).toBeNull();
    const downloadLink = container?.querySelector('a[download]') as HTMLAnchorElement | null;
    expect(downloadLink).toBeTruthy();
    expect(downloadLink?.textContent).toContain("demo.pdf");
  });
});
