import { describe, expect, it } from "vitest";

import {
  getNextChatDisplayMode,
  getTerminalDirectActorFrameClassName,
  getTerminalDirectShellClassName,
  hasPtyRuntimeActor,
  resolveChatDisplayMode,
  type ChatDisplayMode,
} from "../../../src/features/chatDisplay/chatDisplayMode";

describe("chat display mode helpers", () => {
  it("toggles between chat and terminal modes", () => {
    expect(getNextChatDisplayMode("chat")).toBe("terminal");
    expect(getNextChatDisplayMode("terminal")).toBe("chat");
  });

  it("detects PTY actors from effective runner metadata", () => {
    expect(hasPtyRuntimeActor([{ id: "headless", runner_effective: "headless" }])).toBe(false);
    expect(hasPtyRuntimeActor([{ id: "shell", runner_effective: "pty" }])).toBe(true);
    expect(hasPtyRuntimeActor([{ id: "legacy" }])).toBe(true);
  });

  it("defaults interactive groups with terminal actors to terminal display", () => {
    expect(resolveChatDisplayMode({
      requestedMode: "chat",
      groupMode: "interactive",
      hasTerminalActors: true,
      isExplicit: false,
    })).toBe("terminal");
  });

  it("keeps collaboration groups in chat display unless the user chose otherwise", () => {
    expect(resolveChatDisplayMode({
      requestedMode: "chat",
      groupMode: "collaboration",
      hasTerminalActors: true,
      isExplicit: false,
    })).toBe("chat");

    expect(resolveChatDisplayMode({
      requestedMode: "terminal",
      groupMode: "collaboration",
      hasTerminalActors: true,
      isExplicit: true,
    })).toBe("terminal");
  });

  it("respects an explicit chat choice and falls back to chat without terminal actors", () => {
    expect(resolveChatDisplayMode({
      requestedMode: "chat",
      groupMode: "interactive",
      hasTerminalActors: true,
      isExplicit: true,
    })).toBe("chat");

    expect(resolveChatDisplayMode({
      requestedMode: "terminal",
      groupMode: "interactive",
      hasTerminalActors: false,
      isExplicit: true,
    })).toBe("chat");
  });

  it("keeps terminal direct mode pinned to the full content frame", () => {
    expect(getTerminalDirectShellClassName()).toContain("absolute inset-0");
    expect(getTerminalDirectShellClassName()).toContain("w-full");
    expect(getTerminalDirectShellClassName()).toContain("max-w-none");
  });

  it("keeps each terminal actor frame stretched across the full direct view", () => {
    expect(getTerminalDirectActorFrameClassName()).toContain("absolute inset-0");
    expect(getTerminalDirectActorFrameClassName()).toContain("h-full");
    expect(getTerminalDirectActorFrameClassName()).toContain("w-full");
    expect(getTerminalDirectActorFrameClassName()).not.toContain(" flex ");
  });
});

const _typeCheck: ChatDisplayMode = "chat";
void _typeCheck;
