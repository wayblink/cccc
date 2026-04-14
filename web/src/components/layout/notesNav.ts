import { ClipboardIcon } from "../Icons";
import i18n from "../../i18n";

export function getNotesNavMeta() {
  return {
    title: i18n.t("layout:notesToolTitle", { defaultValue: "Notes" }),
    subtitle: null as string | null,
    Icon: ClipboardIcon,
  };
}
