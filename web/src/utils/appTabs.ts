export const FIXED_APP_TABS = ["chat", "scripts", "notes"] as const;
export const TOOL_APP_TABS = ["scripts", "notes"] as const;

export type FixedAppTab = (typeof FIXED_APP_TABS)[number];
export type ToolAppTab = (typeof TOOL_APP_TABS)[number];

export function isFixedAppTab(tab: string): tab is FixedAppTab {
  return FIXED_APP_TABS.includes(tab as FixedAppTab);
}

export function isToolAppTab(tab: string): tab is ToolAppTab {
  return TOOL_APP_TABS.includes(tab as ToolAppTab);
}
