import { describe, expect, it } from "vitest";

import {
  deriveGroupAgentLinkMode,
  getGroupMode,
  normalizeGroupMode,
} from "../../src/utils/groupMode";

describe("group mode helpers", () => {
  it("uses solo as the canonical isolated group mode", () => {
    expect(normalizeGroupMode("solo")).toBe("solo");
    expect(deriveGroupAgentLinkMode("solo")).toBe("isolated");
    expect(getGroupMode({ mode: "solo" })).toBe("solo");
  });

  it("normalizes legacy interactive group mode to solo", () => {
    expect(normalizeGroupMode("interactive")).toBe("solo");
    expect(deriveGroupAgentLinkMode("interactive")).toBe("isolated");
    expect(getGroupMode({ mode: "interactive" as unknown as "solo" })).toBe("solo");
  });
});
