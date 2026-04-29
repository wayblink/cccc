// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    attachCustomKeyEventHandler: vi.fn(),
    dispose: vi.fn(),
    element: undefined,
    focus: vi.fn(),
    getSelection: vi.fn(() => ""),
    hasSelection: vi.fn(() => false),
    loadAddon: vi.fn(),
    open: vi.fn(),
    options: {},
    paste: vi.fn(),
  })),
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn().mockImplementation(() => ({ fit: vi.fn() })),
}));

vi.mock("../../src/hooks/useActorDisplayState", () => ({
  useActorDisplayState: () => ({ isRunning: false, workingState: "idle" }),
}));

vi.mock("../../src/hooks/useTheme", () => ({
  getTerminalTheme: () => ({}),
}));

vi.mock("../../src/services/api", () => ({
  fetchTerminalTail: vi.fn(),
  withAuthToken: (path: string) => path,
}));

vi.mock("../../src/stores", () => ({
  useGroupStore: (selector: (state: { chatByGroup: Record<string, unknown> }) => unknown) => selector({ chatByGroup: {} }),
  useObservabilityStore: (selector: (state: { loaded: boolean; load: () => void; terminalScrollbackLines: number }) => unknown) =>
    selector({ loaded: true, load: vi.fn(), terminalScrollbackLines: 8000 }),
  useTerminalSignalsStore: (selector: (state: { setSignal: () => void; clearSignal: () => void }) => unknown) =>
    selector({ setSignal: vi.fn(), clearSignal: vi.fn() }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      custom: "Custom",
      foreman: "Foreman",
      noAgentStateYet: "No agent state yet",
      stopped: "Stopped",
    }[key] || key),
  }),
}));

import { AgentTab } from "../../src/components/AgentTab";
import type { Actor } from "../../src/types";

function defaultProps(overrides: Partial<React.ComponentProps<typeof AgentTab>> = {}): React.ComponentProps<typeof AgentTab> {
  return {
    actor: { id: "alpha", role: "foreman", runtime: "codex", running: false } as Actor,
    groupId: "group-1",
    agentState: null,
    isVisible: false,
    onQuit: vi.fn(),
    onLaunch: vi.fn(),
    onRelaunch: vi.fn(),
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    onInbox: vi.fn(),
    busy: "",
    isDark: false,
    isSmallScreen: false,
    ...overrides,
  };
}

describe("AgentTab role badge", () => {
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

  it("hides the foreman badge when coordination roles are hidden", async () => {
    await act(async () => {
      root?.render(<AgentTab {...defaultProps({ showCoordinationRoles: false })} />);
    });

    expect(container?.textContent).toContain("alpha");
    expect(container?.textContent).not.toContain("Foreman");
  });

  it("keeps the foreman badge when coordination roles are visible", async () => {
    await act(async () => {
      root?.render(<AgentTab {...defaultProps({ showCoordinationRoles: true })} />);
    });

    expect(container?.textContent).toContain("Foreman");
  });
});
