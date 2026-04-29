// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => ({
      "transcript.title": "Terminal transcripts",
      "transcript.description": "Configure transcript access.",
      "transcript.policy": "Policy",
      "transcript.visibilityLabel": "Visibility",
      "transcript.visibilityOff": "Off",
      "transcript.visibilityForeman": "foreman (foreman can read peers)",
      "transcript.visibilityDefaultActor": "default actor only",
      "transcript.visibilityAll": "All agents",
      "transcript.visibilityTip": "Visibility tip",
      "transcript.includeTail": "Include tail",
      "transcript.notificationLines": "Notification lines",
      "transcript.saveTranscript": "Save transcript",
      "transcript.tailViewer": "Tail viewer",
      "transcript.tailViewerHint": "Inspect a terminal tail.",
      "transcript.refresh": "Refresh",
      "transcript.copyLast50": "Copy last 50",
      "transcript.actor": "Actor",
      "transcript.noActors": "No actors",
      "transcript.maxChars": "Max chars",
      "transcript.clearTruncate": "Clear",
      "transcript.stripAnsi": "Strip ANSI",
      "transcript.compactFrames": "Compact",
      "common:saving": "Saving",
      "common:loading": "Loading",
    }[key] || options?.defaultValue || key),
  }),
}));

import { TranscriptTab } from "../../../../src/components/modals/settings/TranscriptTab";
import type { Actor } from "../../../../src/types";

function defaultProps(overrides: Partial<React.ComponentProps<typeof TranscriptTab>> = {}): React.ComponentProps<typeof TranscriptTab> {
  return {
    isDark: false,
    busy: false,
    groupId: "group-1",
    devActors: [
      { id: "alpha", role: "foreman", runtime: "codex" } as Actor,
      { id: "beta", role: "peer", runtime: "codex" } as Actor,
    ],
    terminalVisibility: "foreman",
    setTerminalVisibility: vi.fn(),
    terminalNotifyTail: false,
    setTerminalNotifyTail: vi.fn(),
    terminalNotifyLines: 20,
    setTerminalNotifyLines: vi.fn(),
    onSaveTranscriptSettings: vi.fn(),
    tailActorId: "alpha",
    setTailActorId: vi.fn(),
    tailMaxChars: 8000,
    setTailMaxChars: vi.fn(),
    tailStripAnsi: true,
    setTailStripAnsi: vi.fn(),
    tailCompact: true,
    setTailCompact: vi.fn(),
    tailText: "",
    tailHint: "",
    tailErr: "",
    tailBusy: false,
    tailCopyInfo: "",
    onLoadTail: vi.fn(),
    onCopyTail: vi.fn(),
    onClearTail: vi.fn(),
    ...overrides,
  };
}

describe("TranscriptTab role wording", () => {
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

  it("uses neutral transcript and actor labels when coordination roles are hidden", async () => {
    await act(async () => {
      root?.render(<TranscriptTab {...defaultProps({ showCoordinationRoles: false })} />);
    });

    expect(container?.textContent).toContain("default actor only");
    expect(container?.textContent).toContain("alpha");
    expect(container?.textContent).toContain("beta");
    expect(container?.textContent).not.toContain("foreman");
    expect(container?.textContent).not.toContain("peer");
  });

  it("keeps role labels when coordination roles are visible", async () => {
    await act(async () => {
      root?.render(<TranscriptTab {...defaultProps({ showCoordinationRoles: true })} />);
    });

    expect(container?.textContent).toContain("foreman (foreman can read peers)");
    expect(container?.textContent).toContain("alpha (foreman)");
    expect(container?.textContent).toContain("beta (peer)");
  });
});
