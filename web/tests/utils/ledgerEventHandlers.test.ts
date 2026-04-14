import { describe, expect, it } from "vitest";
import { getActorRefreshMode, shouldPlayChatNotificationSound } from "../../src/utils/ledgerEventHandlers";

describe("ledgerEventHandlers actor refresh mode", () => {
  it("treats chat.read as an unread refresh event", () => {
    expect(getActorRefreshMode({ kind: "chat.read", data: { actor_id: "peer1", event_id: "e1" } })).toBe("unread");
  });

  it("keeps system.notify as an unread refresh event", () => {
    expect(getActorRefreshMode({ kind: "system.notify", data: { target_actor_id: "peer1" } })).toBe("unread");
  });
});

describe("ledgerEventHandlers chat notification sound trigger", () => {
  it("returns true for a live renderable non-user chat message in the selected group", () => {
    expect(shouldPlayChatNotificationSound({
      selectedGroupId: "g-1",
      event: {
        kind: "chat.message",
        group_id: "g-1",
        by: "peer",
        data: { text: "done" },
      },
    })).toBe(true);
  });

  it("returns false for placeholder or empty messages", () => {
    expect(shouldPlayChatNotificationSound({
      selectedGroupId: "g-1",
      event: {
        kind: "chat.message",
        group_id: "g-1",
        by: "peer",
        data: { pending_placeholder: true, text: "" },
      },
    })).toBe(false);
  });
});
