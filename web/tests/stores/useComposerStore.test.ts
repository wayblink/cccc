import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEffectiveComposerDestGroupId } from "../../src/stores/useComposerStore";

describe("getEffectiveComposerDestGroupId", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("falls back to the selected group while composer state still belongs to the previous group", () => {
    expect(getEffectiveComposerDestGroupId("g-old", "g-old", "g-new")).toBe("g-new");
  });

  it("keeps an explicit cross-group destination once composer state has switched to the current group", () => {
    expect(getEffectiveComposerDestGroupId("g-remote", "g-current", "g-current")).toBe("g-remote");
  });

  it("defaults to the selected group when there is no explicit destination", () => {
    expect(getEffectiveComposerDestGroupId("", "g-current", "g-current")).toBe("g-current");
  });

  it("preserves separate drafts for all and agent slots in the same group", async () => {
    const mod = await import("../../src/stores/useComposerStore");

    mod.useComposerStore.getState().switchContext(null, null, "g-demo", "all");
    mod.useComposerStore.getState().setComposerText("group-wide draft");
    mod.useComposerStore.getState().setToText("@foreman");

    mod.useComposerStore.getState().switchContext("g-demo", "all", "g-demo", "agent:coder");
    expect(mod.useComposerStore.getState().toText).toBe("coder");
    mod.useComposerStore.getState().setComposerText("direct draft");

    mod.useComposerStore.getState().switchContext("g-demo", "agent:coder", "g-demo", "all");
    expect(mod.useComposerStore.getState().composerText).toBe("group-wide draft");
    expect(mod.useComposerStore.getState().toText).toBe("@foreman");

    mod.useComposerStore.getState().switchContext("g-demo", "all", "g-demo", "agent:coder");
    expect(mod.useComposerStore.getState().composerText).toBe("direct draft");
    expect(mod.useComposerStore.getState().toText).toBe("coder");
  });

  it("keeps drafts isolated when switching groups", async () => {
    const mod = await import("../../src/stores/useComposerStore");

    mod.useComposerStore.getState().switchContext(null, null, "g-alpha", "all");
    mod.useComposerStore.getState().setComposerText("alpha draft");

    mod.useComposerStore.getState().switchContext("g-alpha", "all", "g-beta", "all");
    mod.useComposerStore.getState().setComposerText("beta draft");

    mod.useComposerStore.getState().switchContext("g-beta", "all", "g-alpha", "all");
    expect(mod.useComposerStore.getState().composerText).toBe("alpha draft");

    mod.useComposerStore.getState().switchContext("g-alpha", "all", "g-beta", "all");
    expect(mod.useComposerStore.getState().composerText).toBe("beta draft");
  });

  it("restores the locked direct recipient token for agent-slot drafts", async () => {
    const mod = await import("../../src/stores/useComposerStore");

    mod.useComposerStore.getState().switchContext(null, null, "g-demo", "agent:coder");
    expect(mod.useComposerStore.getState().toText).toBe("coder");

    mod.useComposerStore.getState().setComposerText("hello");
    mod.useComposerStore.getState().switchContext("g-demo", "agent:coder", "g-demo", "all");
    mod.useComposerStore.getState().switchContext("g-demo", "all", "g-demo", "agent:coder");

    expect(mod.useComposerStore.getState().composerText).toBe("hello");
    expect(mod.useComposerStore.getState().toText).toBe("coder");
  });
});
