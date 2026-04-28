// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "../../../src/types";

vi.mock("../../../src/components/AgentTab", () => ({
  AgentTab: () => <div data-testid="agent-tab" />,
}));

import { TerminalDirectView } from "../../../src/pages/chat/TerminalDirectView";

describe("TerminalDirectView add button", () => {
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

  it("shows a plus button in the terminal tab strip and opens the add actor flow", () => {
    const onAddAgent = vi.fn();
    const actor = { id: "codex-1", title: "codex-1", runtime: "codex", runner: "pty" } as Actor;

    act(() => {
      root?.render(
        <TerminalDirectView
          groupId="g-1"
          runtimeActors={[actor]}
          groupContext={{ group_id: "g-1", agent_states: [] } as never}
          getTermEpoch={() => 0}
          busy=""
          isDark={false}
          isSmallScreen={false}
          readOnly={false}
          onAddAgent={onAddAgent}
          onToggleActorEnabled={vi.fn()}
          onRelaunchActor={vi.fn()}
          onEditActor={vi.fn()}
          onRemoveActor={vi.fn()}
          onOpenActorInbox={vi.fn()}
          onRefreshActors={vi.fn()}
        />,
      );
    });

    const addButton = container?.querySelector('[data-testid="terminal-direct-add-actor"]') as HTMLButtonElement | null;
    expect(addButton).toBeTruthy();

    act(() => {
      addButton?.click();
    });
    expect(onAddAgent).toHaveBeenCalledTimes(1);
  });
});
