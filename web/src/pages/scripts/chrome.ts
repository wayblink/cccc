export function getScriptManagerChrome() {
  return {
    showPageHeader: false,
    listEyebrow: null as string | null,
    listTitle: "Scripts",
    createButtonLabel: "New Script",
    createButtonIconOnly: true,
    editorTitle: "CONFIGURATION",
    editorShowScriptName: false,
    editorShowPid: false,
    editorNameTypeColumns: "equal" as const,
    editorFormRows: [
      ["name", "type"],
      ["cwd"],
      ["command"],
      ["environment"],
    ] as const,
    editorShowNotes: false,
    consoleShowScriptName: false,
  };
}
