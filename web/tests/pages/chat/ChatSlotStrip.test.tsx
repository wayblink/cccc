// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatSlotStrip } from "../../../src/pages/chat/ChatSlotStrip";

describe("ChatSlotStrip", () => {
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

  it("renders chat slots with unread dots and forwards selection", () => {
    const onSelectSlot = vi.fn();

    act(() => {
      root?.render(
        <ChatSlotStrip
          isDark={false}
          slots={[
            { slotId: "all", actorId: null, label: "All", hasUnreadDot: false },
            { slotId: "agent:coder", actorId: "coder", label: "Coder", hasUnreadDot: true },
            { slotId: "agent:reviewer", actorId: "reviewer", label: "Reviewer", hasUnreadDot: false },
          ]}
          selectedSlotId="agent:coder"
          onSelectSlot={onSelectSlot}
        />,
      );
    });

    const buttons = Array.from(container?.querySelectorAll("button[data-chat-slot-id]") || []);
    expect(buttons).toHaveLength(3);
    expect(buttons[0]?.textContent).toContain("All");
    expect(buttons[1]?.getAttribute("aria-pressed")).toBe("true");
    expect(buttons[1]?.querySelector('[data-chat-slot-unread="true"]')).toBeTruthy();

    act(() => {
      (buttons[2] as HTMLButtonElement).click();
    });

    expect(onSelectSlot).toHaveBeenCalledWith("agent:reviewer");
  });
});
