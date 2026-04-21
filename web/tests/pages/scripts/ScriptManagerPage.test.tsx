// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScriptDefinition } from "../../../src/types";

const script: ScriptDefinition = {
  id: "script-1",
  name: "HTTP_PROXY",
  kind: "service",
  command: "python proxy.py",
  cwd: "/tmp/workspace",
  env: {},
};

const {
  attachScriptMock,
  createScriptMock,
  deleteScriptMock,
  getScriptMock,
  listScriptsMock,
  restartScriptMock,
  runScriptMock,
  storageStub,
  stopScriptMock,
  updateScriptMock,
} = vi.hoisted(() => ({
  attachScriptMock: vi.fn(),
  createScriptMock: vi.fn(),
  deleteScriptMock: vi.fn(),
  getScriptMock: vi.fn(),
  listScriptsMock: vi.fn(),
  restartScriptMock: vi.fn(),
  runScriptMock: vi.fn(),
  storageStub: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  stopScriptMock: vi.fn(),
  updateScriptMock: vi.fn(),
}));

vi.stubGlobal("localStorage", storageStub);
vi.stubGlobal("sessionStorage", storageStub);

vi.mock("../../../src/services/api", async () => {
  const actual = await vi.importActual<typeof import("../../../src/services/api")>("../../../src/services/api");
  return {
    ...actual,
    attachScript: attachScriptMock,
    createScript: createScriptMock,
    deleteScript: deleteScriptMock,
    getScript: getScriptMock,
    listScripts: listScriptsMock,
    restartScript: restartScriptMock,
    runScript: runScriptMock,
    stopScript: stopScriptMock,
    updateScript: updateScriptMock,
  };
});

import { ScriptManagerPage } from "../../../src/pages/scripts/ScriptManagerPage";

async function flushImmediateTimers(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(0);
    await Promise.resolve();
  });
}

describe("ScriptManagerPage", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    listScriptsMock.mockReset();
    getScriptMock.mockReset();
    attachScriptMock.mockReset();
    createScriptMock.mockReset();
    updateScriptMock.mockReset();
    deleteScriptMock.mockReset();
    runScriptMock.mockReset();
    stopScriptMock.mockReset();
    restartScriptMock.mockReset();
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
    vi.useRealTimers();
  });

  it("keeps the live running status from the list while detail hydration catches up", async () => {
    listScriptsMock.mockResolvedValue({
      ok: true,
      result: {
        scripts: [script],
        runtime_by_id: {
          "script-1": {
            script_id: "script-1",
            status: "running",
            pid: 4321,
            started_at: "2026-04-21T02:00:00Z",
            updated_at: null,
            exit_code: null,
            result: null,
          },
        },
      },
    });
    getScriptMock.mockResolvedValue({
      ok: true,
      result: {
        script,
        runtime: {
          script_id: "script-1",
          status: "idle",
          pid: null,
          started_at: null,
          updated_at: null,
          exit_code: null,
          result: null,
        },
        last_output: null,
      },
    });
    attachScriptMock.mockResolvedValue({
      ok: true,
      result: {
        script_id: "script-1",
        runtime: {
          script_id: "script-1",
          status: "running",
          pid: 4321,
          started_at: "2026-04-21T02:00:00Z",
          updated_at: null,
          exit_code: null,
          result: null,
        },
        output: {
          script_id: "script-1",
          text: "proxy ready",
          updated_at: "2026-04-21T02:00:01Z",
          exit_code: null,
          result: "running",
        },
      },
    });

    act(() => {
      root?.render(<ScriptManagerPage isDark={false} readOnly={false} />);
    });

    await flushImmediateTimers();
    await flushImmediateTimers();
    await flushImmediateTimers();
    await flushImmediateTimers();

    expect(listScriptsMock).toHaveBeenCalled();
    expect(getScriptMock).toHaveBeenCalledWith("script-1");
    expect(container?.textContent?.toLowerCase()).toContain("running");
  });

  it("does not reload the script list again when polling updates runtime state", async () => {
    listScriptsMock.mockResolvedValue({
      ok: true,
      result: {
        scripts: [script],
        runtime_by_id: {
          "script-1": {
            script_id: "script-1",
            status: "running",
            pid: 4321,
            started_at: "2026-04-21T02:00:00Z",
            updated_at: null,
            exit_code: null,
            result: null,
          },
        },
      },
    });
    getScriptMock.mockResolvedValue({
      ok: true,
      result: {
        script,
        runtime: {
          script_id: "script-1",
          status: "running",
          pid: 4321,
          started_at: "2026-04-21T02:00:00Z",
          updated_at: null,
          exit_code: null,
          result: null,
        },
        last_output: null,
      },
    });
    attachScriptMock
      .mockResolvedValueOnce({
        ok: true,
        result: {
          script_id: "script-1",
          runtime: {
            script_id: "script-1",
            status: "running",
            pid: 4321,
            started_at: "2026-04-21T02:00:00Z",
            updated_at: "2026-04-21T02:00:01Z",
            exit_code: null,
            result: null,
          },
          output: {
            script_id: "script-1",
            text: "tick 1",
            updated_at: "2026-04-21T02:00:01Z",
            exit_code: null,
            result: "running",
          },
        },
      })
      .mockResolvedValue({
        ok: true,
        result: {
          script_id: "script-1",
          runtime: {
            script_id: "script-1",
            status: "running",
            pid: 4321,
            started_at: "2026-04-21T02:00:00Z",
            updated_at: "2026-04-21T02:00:02Z",
            exit_code: null,
            result: null,
          },
          output: {
            script_id: "script-1",
            text: "tick 2",
            updated_at: "2026-04-21T02:00:02Z",
            exit_code: null,
            result: "running",
          },
        },
      });

    act(() => {
      root?.render(<ScriptManagerPage isDark={false} readOnly={false} />);
    });

    await flushImmediateTimers();
    await flushImmediateTimers();
    await flushImmediateTimers();
    await flushImmediateTimers();

    expect(listScriptsMock).toHaveBeenCalledTimes(1);
    expect(getScriptMock).toHaveBeenCalledTimes(1);
    expect(container?.textContent).not.toContain("Loading scripts...");

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(listScriptsMock).toHaveBeenCalledTimes(1);
    expect(getScriptMock).toHaveBeenCalledTimes(1);
    expect(container?.textContent).not.toContain("Loading scripts...");
  });
});
