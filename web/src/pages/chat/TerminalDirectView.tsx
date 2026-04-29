import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { PlusIcon } from "../../components/Icons";
import { classNames } from "../../utils/classNames";
import { getTerminalDirectActorFrameClassName } from "../../features/chatDisplay/chatDisplayMode";
import { getEffectiveActorRunner } from "../../utils/headlessRuntimeSupport";
import type { Actor, AgentState, GroupContext } from "../../types";

const LazyAgentTab = lazy(() =>
  import("../../components/AgentTab").then((m) => ({ default: m.AgentTab }))
);

interface TerminalDirectViewProps {
  groupId: string;
  runtimeActors: Actor[];
  groupContext: GroupContext | null;
  getTermEpoch: (actorId: string) => number;
  busy: string;
  isDark: boolean;
  isSmallScreen: boolean;
  readOnly?: boolean;
  showCoordinationRoles?: boolean;
  activeActorId?: string;
  onAddAgent?: () => void;
  onToggleActorEnabled: (actor: Actor) => void;
  onRelaunchActor: (actor: Actor) => void;
  onEditActor: (actor: Actor) => void;
  onRemoveActor: (actor: Actor) => void;
  onOpenActorInbox: (actor: Actor) => void;
  onRefreshActors: () => void;
}

export function TerminalDirectView({
  groupId,
  runtimeActors,
  groupContext,
  getTermEpoch,
  busy,
  isDark,
  isSmallScreen,
  readOnly,
  showCoordinationRoles = true,
  activeActorId: activeActorIdHint,
  onAddAgent,
  onToggleActorEnabled,
  onRelaunchActor,
  onEditActor,
  onRemoveActor,
  onOpenActorInbox,
  onRefreshActors,
}: TerminalDirectViewProps) {
  const ptyActors = useMemo(
    () => runtimeActors.filter((a) => getEffectiveActorRunner(a) === "pty"),
    [runtimeActors]
  );
  const [activeActorId, setActiveActorId] = useState<string>(() => {
    return ptyActors[0]?.id || "";
  });

  // When actors change, fall back to first available if current is gone
  const resolvedActiveId =
    ptyActors.some((a) => a.id === activeActorId)
      ? activeActorId
      : (ptyActors[0]?.id || "");

  useEffect(() => {
    const nextActiveId = String(activeActorIdHint || "").trim();
    if (!nextActiveId || !ptyActors.some((actor) => actor.id === nextActiveId)) return;
    setActiveActorId(nextActiveId);
  }, [activeActorIdHint, ptyActors]);

  const agentStateFor = (actorId: string): AgentState | null =>
    (groupContext?.agent_states || []).find((s) => s.id === actorId) || null;

  if (ptyActors.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span
          className={classNames(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-500"
          )}
        >
          No PTY actors running in this group.
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 max-w-none flex-col overflow-hidden">
      {(ptyActors.length > 1 || (!readOnly && onAddAgent)) && (
        <div
          className={classNames(
            "flex h-9 flex-shrink-0 items-center gap-1 border-b px-2",
            isDark
              ? "bg-slate-950/60 border-white/8"
              : "bg-white/70 border-black/8"
          )}
        >
          <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {ptyActors.map((actor) => {
              const active = actor.id === resolvedActiveId;
              return (
                <button
                  key={actor.id}
                  type="button"
                  onClick={() => setActiveActorId(actor.id)}
                  className={classNames(
                    "flex-shrink-0 text-xs px-3 py-1 rounded transition-colors whitespace-nowrap",
                    active
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-200 text-gray-900"
                      : isDark
                        ? "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  )}
                >
                  {actor.title || actor.id}
                </button>
              );
            })}
          </div>
          {!readOnly && onAddAgent ? (
            <button
              type="button"
              data-testid="terminal-direct-add-actor"
              onClick={onAddAgent}
              className={classNames(
                "ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border transition-colors",
                isDark
                  ? "border-white/10 text-slate-300 hover:bg-white/8 hover:text-white"
                  : "border-black/10 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
              aria-label="Add AI Agent"
              title="Add AI Agent"
            >
              <PlusIcon size={15} />
            </button>
          ) : null}
        </div>
      )}

      {/* Terminal instances — keep all mounted, show active via CSS */}
      <div className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        {ptyActors.map((actor) => {
          const isVisible = actor.id === resolvedActiveId;
          return (
            <div
              key={actor.id}
              className={getTerminalDirectActorFrameClassName()}
              style={{ display: isVisible ? "block" : "none" }}
            >
              <Suspense
                fallback={
                  <div
                    className={classNames(
                      "flex-1 flex items-center justify-center text-sm",
                      isDark ? "text-slate-400" : "text-gray-500"
                    )}
                  >
                    Loading terminal…
                  </div>
                }
              >
                <LazyAgentTab
                  actor={actor}
                  groupId={groupId}
                  termEpoch={getTermEpoch(actor.id)}
                  agentState={agentStateFor(actor.id)}
                  isVisible={isVisible}
                  readOnly={readOnly}
                  onQuit={() => onToggleActorEnabled(actor)}
                  onLaunch={() => onToggleActorEnabled(actor)}
                  onRelaunch={() => onRelaunchActor(actor)}
                  onEdit={() => onEditActor(actor)}
                  onRemove={() => onRemoveActor(actor)}
                  onInbox={() => onOpenActorInbox(actor)}
                  busy={busy}
                  isDark={isDark}
                  isSmallScreen={isSmallScreen}
                  showCoordinationRoles={showCoordinationRoles}
                  onStatusChange={onRefreshActors}
                />
              </Suspense>
            </div>
          );
        })}
      </div>
    </div>
  );
}
