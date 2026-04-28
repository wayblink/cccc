import type { Actor, RuntimeInfo } from "../../types";
import * as api from "../../services/api";

export const QUICK_TERMINAL_RUNTIME = "custom";
export const QUICK_TERMINAL_RUNNER = "pty";

export function getQuickTerminalCommand(runtimes: RuntimeInfo[]): string {
  const customRuntime = runtimes.find((runtime) => String(runtime.name || "").trim() === QUICK_TERMINAL_RUNTIME);
  return String(customRuntime?.quick_terminal_command || "").trim();
}

function buildQuickTerminalEntropy(): string {
  return Math.random().toString(36).slice(2, 8) || "temp";
}

export function buildQuickTerminalActorId(now = Date.now()): string {
  const stamp = Math.max(0, Math.floor(now)).toString(36) || "0";
  const actorId = `terminal-${stamp}-${buildQuickTerminalEntropy()}`;
  return actorId.slice(0, 32);
}

export function isQuickTerminalActor(actor: Pick<Actor, "runtime" | "runner" | "runner_effective" | "ui_kind">): boolean {
  return String(actor.runtime || "").trim() === QUICK_TERMINAL_RUNTIME
    && String(actor.runner_effective || actor.runner || QUICK_TERMINAL_RUNNER).trim() === QUICK_TERMINAL_RUNNER
    && String(actor.ui_kind || "").trim() === "quick_terminal";
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

type LaunchQuickTerminalOptions = {
  groupId: string;
  runtimes: RuntimeInfo[];
  hasForeman: boolean;
  t: Translate;
  setBusy: (busy: string) => void;
  setRuntimes: (runtimes: RuntimeInfo[]) => void;
  refreshActors: (groupId?: string, opts?: { includeUnread?: boolean }) => Promise<void>;
  setActiveTab: (tab: string) => void;
  showError: (message: string) => void;
  showNotice: (notice: { message: string }) => void;
};

export async function launchQuickTerminalForGroup({
  groupId,
  runtimes,
  hasForeman,
  t,
  setBusy,
  setRuntimes,
  refreshActors,
  setActiveTab,
  showError,
  showNotice,
}: LaunchQuickTerminalOptions): Promise<boolean> {
  const gid = String(groupId || "").trim();
  if (!gid) return false;

  let command = getQuickTerminalCommand(runtimes);
  if (!command) {
    const runtimesResp = await api.fetchRuntimes();
    if (runtimesResp.ok) {
      const nextRuntimes = runtimesResp.result.runtimes || [];
      setRuntimes(nextRuntimes);
      command = getQuickTerminalCommand(nextRuntimes) || String(runtimesResp.result.quick_terminal_command || "").trim();
    }
  }
  if (!command) {
    showError(t("chat:quickTerminalUnavailable", { defaultValue: "No interactive shell is available on this machine." }));
    return false;
  }

  const actorTitle = t("chat:quickTerminalTitle", { defaultValue: "Temporary terminal" });
  const actorRole = hasForeman ? "peer" : "foreman";

  let requestedActorId = buildQuickTerminalActorId();
  setBusy(`actor-add:${requestedActorId}`);
  try {
    let resp = await api.addActor(gid, requestedActorId, actorRole, QUICK_TERMINAL_RUNTIME, QUICK_TERMINAL_RUNNER, command, undefined, {
      title: actorTitle,
      uiKind: "quick_terminal",
    });
    if (!resp.ok && String(resp.error?.message || "").includes("Name already exists")) {
      requestedActorId = buildQuickTerminalActorId();
      setBusy(`actor-add:${requestedActorId}`);
      resp = await api.addActor(gid, requestedActorId, actorRole, QUICK_TERMINAL_RUNTIME, QUICK_TERMINAL_RUNNER, command, undefined, {
        title: actorTitle,
        uiKind: "quick_terminal",
      });
    }
    if (!resp.ok) {
      showError(resp.error?.message || t("chat:quickTerminalFailed", { defaultValue: "Failed to launch terminal." }));
      return false;
    }
    const createdActorId = String(resp.result?.actor?.id || requestedActorId).trim() || requestedActorId;
    await refreshActors(gid, { includeUnread: true });
    setActiveTab(createdActorId);
    showNotice({ message: t("chat:quickTerminalReady", { defaultValue: "Temporary terminal is ready." }) });
    return true;
  } catch (error) {
    showError(error instanceof Error ? error.message : t("chat:quickTerminalFailed", { defaultValue: "Failed to launch terminal." }));
    return false;
  } finally {
    setBusy("");
  }
}
