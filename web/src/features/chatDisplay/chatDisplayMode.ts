import type { Actor } from "../../types";
import { getEffectiveActorRunner } from "../../utils/headlessRuntimeSupport";

export type ChatDisplayMode = "chat" | "terminal";

export function getNextChatDisplayMode(mode: ChatDisplayMode): ChatDisplayMode {
  return mode === "terminal" ? "chat" : "terminal";
}

export function hasPtyRuntimeActor(actors: Pick<Actor, "runner" | "runner_effective">[]): boolean {
  return actors.some((actor) => getEffectiveActorRunner(actor) === "pty");
}

export function getTerminalDirectShellClassName(): string {
  return "absolute inset-0 flex min-h-0 w-full max-w-none flex-col overflow-hidden";
}

export function getTerminalDirectActorFrameClassName(): string {
  return "absolute inset-0 h-full w-full min-w-0 overflow-hidden";
}
