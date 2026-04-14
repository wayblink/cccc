// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { useAppGroupLifecycle } from "../../src/hooks/useAppGroupLifecycle";

function TestHarness(props: Parameters<typeof useAppGroupLifecycle>[0]) {
  useAppGroupLifecycle(props);
  return null;
}

describe("useAppGroupLifecycle", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
    }
    root = null;
    container?.remove();
    container = null;
  });

  it("switches composer context with both group and slot ids", () => {
    const switchContext = vi.fn();
    const commonProps = {
      destGroupId: "",
      sendGroupId: "",
      hasReplyTarget: false,
      hasComposerFiles: false,
      setDestGroupId: vi.fn(),
      fileInputRef: { current: null },
      resetDragDrop: vi.fn(),
      resetMountedActorIds: vi.fn(),
      setActiveTab: vi.fn(),
      closeChatWindow: vi.fn(),
      loadGroup: vi.fn(),
      connectStream: vi.fn(),
      cleanupSSE: vi.fn(),
    };

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(TestHarness, {
            ...commonProps,
            selectedGroupId: "g-1",
            selectedSlotId: "agent:coder",
            switchContext,
          }),
        ),
      );
    });

    act(() => {
      root?.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(TestHarness, {
            ...commonProps,
            selectedGroupId: "g-2",
            selectedSlotId: "agent:reviewer",
            switchContext,
          }),
        ),
      );
    });

    expect(switchContext).toHaveBeenCalledWith(null, null, "g-1", "agent:coder");
    expect(switchContext).toHaveBeenLastCalledWith("g-1", "agent:coder", "g-2", "agent:reviewer");
  });
});
