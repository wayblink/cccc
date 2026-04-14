import { ScriptIcon } from "../Icons";
import i18n from "../../i18n";

export function getScriptManagerNavMeta() {
  return {
    title: i18n.t("layout:scriptManagerTitle", { defaultValue: "Script Manager" }),
    subtitle: null as string | null,
    Icon: ScriptIcon,
  };
}
