import i18n from "../../i18n";

export function getNotesChrome() {
  return {
    pageTitle: i18n.t("layout:notesToolTitle", { defaultValue: "Notes" }),
    pageDescription: i18n.t("layout:notesPageDescription", {
      defaultValue: "Keep quick local notes and a permanent scratchpad inside CCCC.",
    }),
    lineNumbersLabel: i18n.t("layout:notesLineNumbers", { defaultValue: "Line numbers" }),
    listTitle: i18n.t("layout:notesListTitle", { defaultValue: "Notes" }),
    createButtonLabel: i18n.t("layout:newNote", { defaultValue: "New Note" }),
    scratchpadTitle: i18n.t("layout:scratchpad", { defaultValue: "Scratchpad" }),
    untitledNoteTitle: i18n.t("layout:untitledNote", { defaultValue: "Untitled note" }),
    editorTitle: i18n.t("layout:noteEditorTitle", { defaultValue: "Editor" }),
    bodyLabel: i18n.t("layout:noteBodyLabel", { defaultValue: "Body" }),
    titleLabel: i18n.t("layout:noteTitleLabel", { defaultValue: "Title" }),
    emptyStateTitle: i18n.t("layout:notesEmptyTitle", { defaultValue: "No notes yet" }),
    emptyStateBody: i18n.t("layout:notesEmptyBody", {
      defaultValue: "Create a note for anything you want to keep nearby during work.",
    }),
    scratchpadHint: i18n.t("layout:scratchpadHint", {
      defaultValue: "Scratchpad stays pinned here and cannot be deleted.",
    }),
    deleteLabel: i18n.t("layout:deleteNote", { defaultValue: "Delete" }),
    createNotice: i18n.t("layout:noteCreatedNotice", { defaultValue: "Note created" }),
    deleteNotice: i18n.t("layout:noteDeletedNotice", { defaultValue: "Note deleted" }),
    readOnlyBadge: i18n.t("layout:readOnly", { defaultValue: "Read-only" }),
    localOnlyBadge: i18n.t("layout:localOnly", { defaultValue: "Local only" }),
    titlePlaceholder: i18n.t("layout:noteTitlePlaceholder", { defaultValue: "What is this note for?" }),
    bodyPlaceholder: i18n.t("layout:noteBodyPlaceholder", {
      defaultValue: "Write anything you want to keep handy...",
    }),
  };
}
