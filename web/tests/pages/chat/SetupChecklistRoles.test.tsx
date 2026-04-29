// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      addAgent: "Add agent",
      addAgentButton: "Add",
      addForemanFirst: "Add a foreman first, then peers.",
      addFirstAgentHint: "Add your first agent.",
      attachProjectFolder: "Attach project folder",
      "common:copy": "Copy",
      launchAgents: "Launch agents",
      nextSteps: "Next steps",
      start: "Start",
      startGroup: "Start group",
      startGroupButton: "Start group",
      starting: "Starting",
      teamReady: "Team ready",
    }[key] || key),
  }),
}));

vi.mock("../../../src/hooks/useCopyFeedback", () => ({
  useCopyFeedback: () => vi.fn(),
}));

import { SetupChecklist } from "../../../src/pages/chat/SetupChecklist";

function defaultProps(overrides: Partial<React.ComponentProps<typeof SetupChecklist>> = {}): React.ComponentProps<typeof SetupChecklist> {
  return {
    isDark: false,
    selectedGroupId: "group-1",
    busy: "",
    needsScope: false,
    needsActors: true,
    needsStart: false,
    onAddAgent: vi.fn(),
    onStartGroup: vi.fn(),
    ...overrides,
  };
}

describe("SetupChecklist role wording", () => {
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

  it("uses neutral add-agent guidance when coordination roles are hidden", async () => {
    await act(async () => {
      root?.render(<SetupChecklist {...defaultProps({ showCoordinationRoles: false })} />);
    });

    expect(container?.textContent).toContain("Add your first agent.");
    expect(container?.textContent).not.toContain("foreman");
    expect(container?.textContent).not.toContain("peers");
  });

  it("keeps foreman-first guidance when coordination roles are visible", async () => {
    await act(async () => {
      root?.render(<SetupChecklist {...defaultProps({ showCoordinationRoles: true })} />);
    });

    expect(container?.textContent).toContain("Add a foreman first, then peers.");
  });
});
