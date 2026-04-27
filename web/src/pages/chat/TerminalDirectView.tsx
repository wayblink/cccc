import { lazy, Suspense, useState } from "react";
import { classNames } from "../../utils/classNames";
import { getEffectiveActorRunner } from "../../utils/headlessRuntimeSupport";
import { useUIStore } from "../../stores/useUIStore";
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
  onToggleActorEnabled,
  onRelaunchActor,
  onEditActor,
  onRemoveActor,
  onOpenActorInbox,
  onRefreshActors,
}: TerminalDirectViewProps) {
  const setChatDisplayMode = useUIStore((s) => s.setChatDisplayMode);
  const ptyActors = runtimeActors.filter(
    (a) => getEffectiveActorRunner(a) === "pty"
  );
  const [activeActorId, setActiveActorId] = useState<string>(() => {
    return ptyActors[0]?.id || "";
  });

  // When actors change, fall back to first available if current is gone
  const resolvedActiveId =
    ptyActors.some((a) => a.id === activeActorId)
      ? activeActorId
      : (ptyActors[0]?.id || "");

  const agentStateFor = (actorId: string): AgentState | null =>
    (groupContext?.agent_states || []).find((s) => s.id === actorId) || null;

  if (ptyActors.length === 0) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center gap-3">
        <span
          className={classNames(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-500"
          )}
        >
          No PTY actors running in this group.
        </span>
        <button
          type="button"
          onClick={() => setChatDisplayMode(groupId, "chat")}
          className={classNames(
            "text-xs px-3 py-1.5 rounded-full border transition-colors",
            isDark
              ? "border-slate-600 text-slate-300 hover:bg-slate-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          )}
        >
          ← Back to Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top bar: actor tabs + back button */}
      <div
        className={classNames(
          "flex-shrink-0 flex items-center gap-1 px-2 border-b h-9",
          isDark
            ? "bg-slate-950/60 border-white/8"
            : "bg-white/70 border-black/8"
        )}
      >
        <button
          type="button"
          onClick={() => setChatDisplayMode(groupId, "chat")}
          title="Switch to chat view"
          className={classNames(
            "flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded border mr-1 transition-colors",
            isDark
              ? "border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              : "border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          )}
        >
          ← Chat
        </button>

        {ptyActors.length > 1 && (
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
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
        )}
      </div>

      {/* Terminal instances — keep all mounted, show active via CSS */}
      <div className="flex-1 min-h-0 relative">
        {ptyActors.map((actor) => {
          const isVisible = actor.id === resolvedActiveId;
          return (
            <div
              key={actor.id}
              className="absolute inset-0"
              style={{ display: isVisible ? "flex" : "none" }}
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
