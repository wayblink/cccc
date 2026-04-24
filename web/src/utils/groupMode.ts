import type { Actor, GroupAgentLinkMode, GroupDoc, GroupMeta, GroupSettings } from "../types";

export type FrontendGroupMode = "interactive" | "collaboration";
export type FrontendGroupAgentLinkMode = GroupAgentLinkMode;

export const COLLABORATION_RECIPIENT_TOKENS = ["@all", "@foreman", "@peers"] as const;

export function normalizeGroupMode(mode: unknown): FrontendGroupMode {
  return mode === "interactive" ? "interactive" : "collaboration";
}

export function isInteractiveGroupMode(mode: unknown): boolean {
  return normalizeGroupMode(mode) === "interactive";
}

export function getGroupMode(group: Pick<GroupDoc, "mode"> | Pick<GroupMeta, "mode"> | null | undefined): FrontendGroupMode {
  return normalizeGroupMode(group?.mode);
}

export function deriveGroupAgentLinkMode(groupMode: unknown): FrontendGroupAgentLinkMode {
  return normalizeGroupMode(groupMode) === "interactive" ? "isolated" : "connected";
}

export function normalizeGroupAgentLinkMode(
  linkMode: unknown,
  groupMode?: unknown,
): FrontendGroupAgentLinkMode {
  if (linkMode === "isolated") return "isolated";
  if (linkMode === "connected") return "connected";
  return deriveGroupAgentLinkMode(groupMode);
}

type GroupLinkAware =
  | Pick<GroupDoc, "mode" | "agent_link_mode">
  | Pick<GroupMeta, "mode" | "agent_link_mode">
  | null
  | undefined;

type SettingsLinkAware = Pick<GroupSettings, "agent_link_mode" | "supports_default_send_to"> | null | undefined;

export function getGroupAgentLinkMode(
  group: GroupLinkAware,
  _settings?: SettingsLinkAware,
): FrontendGroupAgentLinkMode {
  return deriveGroupAgentLinkMode(group?.mode);
}

export function groupAgentCoordinationEnabled(
  group: GroupLinkAware,
  settings?: SettingsLinkAware,
): boolean {
  return getGroupAgentLinkMode(group, settings) === "connected";
}

export function supportsGroupDefaultSendTo(
  group: GroupLinkAware,
  _settings?: SettingsLinkAware,
): boolean {
  return groupAgentCoordinationEnabled(group);
}

export function getSpecialRecipientTokens(agentLinkMode: unknown): string[] {
  return normalizeGroupAgentLinkMode(agentLinkMode) === "connected"
    ? [...COLLABORATION_RECIPIENT_TOKENS]
    : [];
}

export function getChatSpecialRecipientTokens(agentLinkMode: unknown): string[] {
  return normalizeGroupAgentLinkMode(agentLinkMode) === "connected"
    ? [...COLLABORATION_RECIPIENT_TOKENS]
    : ["@all"];
}

export function getImplicitRecipientTokens(
  agentLinkMode: unknown,
  defaultSendTo: GroupSettings["default_send_to"] | null | undefined,
): string[] {
  if (normalizeGroupAgentLinkMode(agentLinkMode) !== "connected") {
    return [];
  }
  return defaultSendTo === "broadcast" ? ["@all"] : ["@foreman"];
}

export function getReplyDefaultRecipients(args: {
  authorId: string;
  actors: Actor[];
  agentLinkMode: unknown;
  defaultSendTo: GroupSettings["default_send_to"] | null | undefined;
  originalTo: string[];
}): string[] {
  const authorId = String(args.authorId || "").trim();
  const authorIsActor = authorId && authorId !== "user" && args.actors.some((actor) => String(actor.id || "") === authorId);
  if (authorIsActor) {
    return [authorId];
  }
  if (args.originalTo.length > 0) {
    return args.originalTo;
  }
  return getImplicitRecipientTokens(args.agentLinkMode, args.defaultSendTo);
}
