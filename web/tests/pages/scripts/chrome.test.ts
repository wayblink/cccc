import { describe, expect, it } from "vitest";

import { getScriptManagerChrome } from "../../../src/pages/scripts/chrome";

describe("getScriptManagerChrome", () => {
  it("keeps the script manager page compact", () => {
    expect(getScriptManagerChrome()).toEqual({
      showPageHeader: false,
      listEyebrow: null,
      listTitle: "Scripts",
      createButtonLabel: "New Script",
      createButtonIconOnly: true,
      editorTitle: "CONFIGURATION",
      editorShowScriptName: false,
      editorShowPid: false,
      editorNameTypeColumns: "equal",
      editorFormRows: [
        ["name", "type"],
        ["cwd"],
        ["command"],
        ["environment"],
      ],
      editorShowNotes: false,
      consoleShowScriptName: false,
    });
  });
});
