import { describe, expect, it } from "vitest";

import { ScriptIcon } from "../../src/components/Icons";
import { getScriptManagerNavMeta } from "../../src/components/layout/scriptManagerNav";

describe("getScriptManagerNavMeta", () => {
  it("uses a script-specific icon and no subtitle copy", () => {
    const meta = getScriptManagerNavMeta();

    expect(meta.title).toBe("Script Manager");
    expect(meta.subtitle).toBeNull();
    expect(meta.Icon).toBe(ScriptIcon);
  });
});
