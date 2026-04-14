// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor, GroupMeta } from "../../../src/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

import { ChatComposer } from "../../../src/pages/chat/ChatComposer";

function flush() {
  return act(async () => {
    await Promise.resolve();
  });
}

describe("ChatComposer slot lock UI", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    vi.unstubAllGlobals();
  });

  it("locks the composer to the active agent slot", async () => {
    act(() => {
      root?.render(
        <ChatComposer
          isDark={false}
          isSmallScreen={false}
          selectedGroupId="g-1"
          actors={[]}
          recipientActors={[
            { id: "coder", title: "Coder" } as Actor,
            { id: "reviewer", title: "Reviewer" } as Actor,
          ]}
          groups={[
            { group_id: "g-1", title: "Alpha" } as GroupMeta,
            { group_id: "g-2", title: "Beta" } as GroupMeta,
          ]}
          destGroupId="g-2"
          effectiveDestGroupId="g-1"
          setDestGroupId={vi.fn()}
          busy=""
          replyTarget={null}
          onCancelReply={vi.fn()}
          quotedPresentationRef={null}
          onClearQuotedPresentationRef={vi.fn()}
          toTokens={["@all"]}
          effectiveToTokens={["coder"]}
          onToggleRecipient={vi.fn()}
          onClearRecipients={vi.fn()}
          composerFiles={[]}
          onRemoveComposerFile={vi.fn()}
          appendComposerFiles={vi.fn()}
          fileInputRef={{ current: null }}
          composerRef={{ current: null }}
          composerText="locked ping"
          setComposerText={vi.fn()}
          priority="normal"
          replyRequired={false}
          setPriority={vi.fn()}
          setReplyRequired={vi.fn()}
          onSendMessage={vi.fn()}
          showMentionMenu={false}
          setShowMentionMenu={vi.fn()}
          mentionSuggestions={["coder"]}
          mentionSelectedIndex={0}
          setMentionSelectedIndex={vi.fn()}
          setMentionFilter={vi.fn()}
          onAppendRecipientToken={vi.fn()}
          effectiveSlotId="agent:coder"
          activeSlotLabel="Coder"
        />,
      );
    });

    await flush();

    const groupSelect = container?.querySelector("select");
    expect(groupSelect).toBeTruthy();
    expect((groupSelect as HTMLSelectElement | null)?.value).toBe("g-1");
    expect((groupSelect as HTMLSelectElement | null)?.disabled).toBe(true);

    expect(container?.textContent).toContain("Direct to Coder");
    expect(container?.textContent).toContain("Locked to this group");
    expect(container?.textContent).toContain("Coder");
    expect(container?.textContent).not.toContain("Reviewer");
    expect(container?.textContent).not.toContain("@all");

    const attachmentButton = container?.querySelector('button[aria-label="attachFile"]') as HTMLButtonElement | null;
    expect(attachmentButton).toBeTruthy();
    expect(attachmentButton?.disabled).toBe(false);
  });
});
