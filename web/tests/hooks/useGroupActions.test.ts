// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { deleteGroup, useGroupStore, useUIStore } = vi.hoisted(() => ({
  deleteGroup: vi.fn(),
  useGroupStore: vi.fn(),
  useUIStore: vi.fn(),
}));

vi.mock("../../src/services/api", () => ({
  deleteGroup,
  startGroup: vi.fn(),
  stopGroup: vi.fn(),
  setGroupState: vi.fn(),
}));

vi.mock("../../src/stores", () => ({
  useGroupStore,
  useUIStore,
}));

import { useGroupActions } from "../../src/hooks/useGroupActions";

function Harness(props: { onReady: (value: ReturnType<typeof useGroupActions>) => void }) {
  props.onReady(useGroupActions());
  return null;
}

describe("useGroupActions", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;
  let actions: ReturnType<typeof useGroupActions> | null = null;

  const groupStoreState = {
    selectedGroupId: "g-1",
    refreshGroups: vi.fn(async () => {}),
    refreshActors: vi.fn(async () => {}),
    setGroupDoc: vi.fn(),
    groupDoc: { group_id: "g-1", title: "Archived One", state: "idle" },
    applyDeletedGroup: vi.fn(),
  };

  const uiStoreState = {
    setBusy: vi.fn(),
    showError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    groupStoreState.selectedGroupId = "g-1";
    groupStoreState.groupDoc = { group_id: "g-1", title: "Archived One", state: "idle" };
    useGroupStore.mockReturnValue(groupStoreState);
    useUIStore.mockReturnValue(uiStoreState);
    deleteGroup.mockResolvedValue({ ok: true, result: {} });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(React.createElement(Harness, { onReady: (value) => {
        actions = value;
      } }));
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    actions = null;
  });

  it("deletes the requested group, clears local state, and refreshes groups", async () => {
    await act(async () => {
      await actions?.handleDeleteGroup("g-1");
    });

    expect(uiStoreState.setBusy).toHaveBeenNthCalledWith(1, "group-delete");
    expect(deleteGroup).toHaveBeenCalledWith("g-1");
    expect(groupStoreState.applyDeletedGroup).toHaveBeenCalledWith("g-1");
    expect(groupStoreState.refreshGroups).toHaveBeenCalledTimes(1);
    expect(uiStoreState.setBusy).toHaveBeenLastCalledWith("");
  });

  it("reports the API error and skips local cleanup when delete fails", async () => {
    deleteGroup.mockResolvedValue({ ok: false, error: { code: "group_delete_failed", message: "boom" } });

    await act(async () => {
      await actions?.handleDeleteGroup("g-1");
    });

    expect(groupStoreState.applyDeletedGroup).not.toHaveBeenCalled();
    expect(groupStoreState.refreshGroups).not.toHaveBeenCalled();
    expect(uiStoreState.showError).toHaveBeenCalledWith("group_delete_failed: boom");
    expect(uiStoreState.setBusy).toHaveBeenLastCalledWith("");
  });
});
