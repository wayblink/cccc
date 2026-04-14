// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
type UseChatTabFn = typeof import("../../src/hooks/useChatTab")["useChatTab"];
type UseChatTabArgs = Parameters<UseChatTabFn>[0];
type UseChatTabResult = ReturnType<UseChatTabFn>;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

function makeChatBucket(events: unknown[]) {
  return {
    events,
    streamingEvents: [],
    streamingTextByStreamId: {},
    streamingActivitiesByStreamId: {},
    replySessionsByPendingEventId: {},
    pendingEventIdByStreamId: {},
    previewSessionsByActorId: {},
    latestActorPreviewByActorId: {},
    latestActorTextByActorId: {},
    latestActorActivitiesByActorId: {},
    chatWindow: null,
    hasMoreHistory: false,
    hasLoadedTail: true,
    isLoadingHistory: false,
    isChatWindowLoading: false,
  };
}

function makeChatMessage({
  id,
  by,
  to,
  ts,
  dstGroupId,
}: {
  id: string;
  by: string;
  to: string[];
  ts: string;
  dstGroupId?: string;
}) {
  return {
    id,
    kind: "chat.message",
    ts,
    by,
    group_id: "g-1",
    data: {
      text: `${id}-text`,
      to,
      ...(dstGroupId ? { dst_group_id: dstGroupId } : {}),
    },
  };
}

describe("useChatTab integration", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;
  let latestRef: { current: UseChatTabResult | null } | null = null;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    latestRef = { current: null };
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
    latestRef = null;
  });

  async function setupHarness() {
    const api = await import("../../src/services/api");
    const { useChatTab } = await import("../../src/hooks/useChatTab");
    const { useGroupStore, useUIStore, useComposerStore } = await import("../../src/stores");
    const { useChatOutboxStore } = await import("../../src/stores/chatOutboxStore");
    const { buildAgentChatSlotId } = await import("../../src/stores/useUIStore");
    const { buildComposerDraftKey } = await import("../../src/stores/useComposerStore");
    const hookResultRef = latestRef ?? { current: null };

    function Harness(props: UseChatTabArgs) {
      const value = useChatTab(props);
      React.useLayoutEffect(() => {
        hookResultRef.current = value;
      }, [value]);
      return null;
    }

    function render(props: UseChatTabArgs) {
      act(() => {
        root?.render(React.createElement(Harness, props));
      });
    }

    return {
      api,
      render,
      useGroupStore,
      useUIStore,
      useComposerStore,
      useChatOutboxStore,
      buildAgentChatSlotId,
      buildComposerDraftKey,
      getLatest: () => hookResultRef.current,
    };
  }

  it("falls back invalid remembered slots and exposes unread-dot tab metadata", async () => {
    const {
      render,
      useGroupStore,
      useUIStore,
      useComposerStore,
      useChatOutboxStore,
      buildAgentChatSlotId,
      getLatest,
    } = await setupHarness();

    const actors = [
      { id: "coder", runtime: "codex", role: "peer" },
      { id: "reviewer", runtime: "codex", role: "peer" },
    ];
    useGroupStore.setState({
      selectedGroupId: "g-1",
      groupDoc: {
        group_id: "g-1",
        active_scope_key: "scope-1",
        scopes: [{ scope_key: "scope-1", url: "/repo" }],
      },
      groupContext: { agent_states: [] },
      groupSettings: { default_send_to: "foreman" },
      chatByGroup: {
        "g-1": makeChatBucket([
          makeChatMessage({
            id: "msg-coder",
            by: "coder",
            to: ["user"],
            ts: "2026-04-14T03:30:00.000Z",
          }),
          makeChatMessage({
            id: "msg-reviewer",
            by: "reviewer",
            to: ["user"],
            ts: "2026-04-14T03:20:00.000Z",
          }),
        ]),
      },
    });
    useUIStore.setState({ chatSessions: {} });
    useUIStore.getState().setChatSelectedSlotId("g-1", "agent:ghost");
    useUIStore.getState().setChatSlotLastViewedAt("g-1", buildAgentChatSlotId("coder"), 0);
    useUIStore.getState().setChatSlotLastViewedAt("g-1", buildAgentChatSlotId("reviewer"), Date.parse("2026-04-14T03:25:00.000Z"));
    useComposerStore.setState({ activeGroupId: "g-1", activeSlotId: "all" });
    useChatOutboxStore.setState({ entriesByGroup: {} });

    render({
      selectedGroupId: "g-1",
      selectedGroupRunning: true,
      actors,
      recipientActors: actors,
    });

    expect(getLatest()?.effectiveSlotId).toBe("all");
    expect(useUIStore.getState().chatSessions["g-1"]?.selectedSlotId).toBe("all");
    expect(getLatest()?.chatSlots).toEqual([
      expect.objectContaining({ slotId: "all", hasUnreadDot: false }),
      expect.objectContaining({ slotId: "agent:coder", hasUnreadDot: true }),
      expect.objectContaining({ slotId: "agent:reviewer", hasUnreadDot: false }),
    ]);
  });

  it("filters agent-slot messages and clears hidden reply targets", async () => {
    const {
      render,
      useGroupStore,
      useUIStore,
      useComposerStore,
      useChatOutboxStore,
      buildAgentChatSlotId,
      getLatest,
    } = await setupHarness();

    const actors = [
      { id: "coder", runtime: "codex", role: "peer" },
      { id: "reviewer", runtime: "codex", role: "peer" },
    ];
    useGroupStore.setState({
      selectedGroupId: "g-1",
      groupDoc: {
        group_id: "g-1",
        active_scope_key: "scope-1",
        scopes: [{ scope_key: "scope-1", url: "/repo" }],
      },
      groupContext: { agent_states: [] },
      groupSettings: { default_send_to: "foreman" },
      chatByGroup: {
        "g-1": makeChatBucket([
          makeChatMessage({
            id: "visible-user-to-coder",
            by: "user",
            to: ["coder"],
            ts: "2026-04-14T03:00:00.000Z",
          }),
          makeChatMessage({
            id: "visible-coder-to-user",
            by: "coder",
            to: ["user"],
            ts: "2026-04-14T03:01:00.000Z",
          }),
          makeChatMessage({
            id: "hidden-reviewer-to-user",
            by: "reviewer",
            to: ["user"],
            ts: "2026-04-14T03:02:00.000Z",
          }),
          makeChatMessage({
            id: "hidden-coder-broadcast",
            by: "coder",
            to: ["@all"],
            ts: "2026-04-14T03:03:00.000Z",
          }),
        ]),
      },
    });
    useUIStore.setState({ chatSessions: {} });
    useUIStore.getState().setChatSelectedSlotId("g-1", buildAgentChatSlotId("coder"));
    useComposerStore.setState({
      activeGroupId: "g-1",
      activeSlotId: "all",
      replyTarget: {
        eventId: "hidden-reviewer-to-user",
        by: "reviewer",
        text: "hidden-reviewer-to-user-text",
      },
    });
    useChatOutboxStore.setState({ entriesByGroup: {} });

    render({
      selectedGroupId: "g-1",
      selectedGroupRunning: true,
      actors,
      recipientActors: actors,
    });

    expect(getLatest()?.effectiveSlotId).toBe("agent:coder");
    expect(getLatest()?.chatMessages.map((event: { id: string }) => event.id)).toEqual([
      "visible-user-to-coder",
      "visible-coder-to-user",
    ]);
    expect(useComposerStore.getState().replyTarget).toBe(null);
    expect(getLatest()?.mentionSuggestions).toEqual(["coder"]);
  });

  it("locks send routing to the active agent slot and clears only that slot draft", async () => {
    const {
      api,
      render,
      useGroupStore,
      useUIStore,
      useComposerStore,
      useChatOutboxStore,
      buildAgentChatSlotId,
      buildComposerDraftKey,
      getLatest,
    } = await setupHarness();

    const sendMessageSpy = vi.spyOn(api, "sendMessage").mockResolvedValue({
      ok: true,
      result: { event: null },
    } as Awaited<ReturnType<typeof api.sendMessage>>);
    const sendCrossGroupSpy = vi.spyOn(api, "sendCrossGroupMessage").mockResolvedValue({
      ok: true,
      result: { event: null },
    } as Awaited<ReturnType<typeof api.sendCrossGroupMessage>>);

    const actors = [
      { id: "coder", runtime: "codex", role: "peer" },
      { id: "reviewer", runtime: "codex", role: "peer" },
    ];
    useGroupStore.setState({
      selectedGroupId: "g-1",
      groupDoc: {
        group_id: "g-1",
        active_scope_key: "scope-1",
        scopes: [{ scope_key: "scope-1", url: "/repo" }],
      },
      groupContext: { agent_states: [] },
      groupSettings: { default_send_to: "foreman" },
      chatByGroup: {
        "g-1": makeChatBucket([]),
      },
    });
    useUIStore.setState({ chatSessions: {} });
    useUIStore.getState().setChatSelectedSlotId("g-1", buildAgentChatSlotId("coder"));
    useComposerStore.setState({
      activeGroupId: "g-1",
      activeSlotId: "all",
      composerText: "Locked slot ping",
      composerFiles: [],
      toText: "@all",
      replyTarget: null,
      quotedPresentationRef: null,
      priority: "normal",
      replyRequired: false,
      destGroupId: "g-2",
      drafts: {
        [buildComposerDraftKey("g-1", "all")]: {
          composerText: "keep-all-slot",
          composerFiles: [],
          toText: "",
          replyTarget: null,
          quotedPresentationRef: null,
          priority: "normal",
          replyRequired: false,
          destGroupId: "g-1",
        },
        [buildComposerDraftKey("g-1", "agent:coder")]: {
          composerText: "drop-agent-slot",
          composerFiles: [],
          toText: "coder",
          replyTarget: null,
          quotedPresentationRef: null,
          priority: "normal",
          replyRequired: false,
          destGroupId: "g-1",
        },
      },
    });
    useChatOutboxStore.setState({ entriesByGroup: {} });

    render({
      selectedGroupId: "g-1",
      selectedGroupRunning: true,
      actors,
      recipientActors: actors,
      composerRef: { current: null },
      fileInputRef: { current: document.createElement("input") },
      chatAtBottomRef: { current: true },
    });

    await act(async () => {
      await getLatest()?.sendMessage();
    });

    expect(sendCrossGroupSpy).not.toHaveBeenCalled();
    expect(sendMessageSpy).toHaveBeenCalledWith(
      "g-1",
      "Locked slot ping",
      ["coder"],
      undefined,
      "normal",
      false,
      expect.any(String),
      [],
    );
    expect(useComposerStore.getState().drafts[buildComposerDraftKey("g-1", "all")]).toMatchObject({
      composerText: "keep-all-slot",
    });
    expect(useComposerStore.getState().drafts[buildComposerDraftKey("g-1", "agent:coder")]).toBeUndefined();
  });
});
