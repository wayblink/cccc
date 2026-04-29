import { useState } from "react";
import { GroupMeta } from "../../types";
import { classNames } from "../../utils/classNames";
import { getGroupMode } from "../../utils/groupMode";
import { getGroupStatusFromSource } from "../../utils/groupStatus";
import { GroupModeIcon, MoreIcon } from "../Icons";

interface GroupSidebarItemProps {
  group: GroupMeta;
  isActive: boolean;
  isCollapsed: boolean;
  isArchived?: boolean;
  menuAriaLabel?: string;
  menuActions?: Array<{ label: string; onSelect: () => void }>;
  onSelect: () => void;
  onWarm?: () => void;
}

export function GroupSidebarItem({
  group,
  isActive,
  isCollapsed,
  isArchived = false,
  menuAriaLabel,
  menuActions,
  onSelect,
  onWarm,
}: GroupSidebarItemProps) {
  const gid = String(group.group_id || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const status = getGroupStatusFromSource(group);
  const groupMode = getGroupMode(group);

  if (isCollapsed) {
    const initial = (group.title || gid).charAt(0).toUpperCase();
    return (
      <button
        className={classNames(
          "w-11 h-11 rounded-xl flex items-center justify-center transition-all relative",
          isActive ? "glass-group-item-active glow-pulse" : "glass-group-item hover:scale-105"
        )}
        onClick={onSelect}
        onMouseEnter={onWarm}
        onFocus={onWarm}
        title={group.title || gid}
      >
        <span
          className={classNames(
            "text-sm font-semibold",
            isActive ? "text-cyan-700 dark:text-cyan-300" : "text-[var(--color-text-secondary)]"
          )}
        >
          {initial}
        </span>
        <span
          className={classNames(
            "absolute left-0 top-0 inline-flex h-4 w-4 -translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full",
            isActive ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" : "bg-black/5 text-[var(--color-text-secondary)] dark:bg-white/10"
          )}
          title={groupMode === "interactive" ? "Interactive" : "Collaboration"}
        >
          <GroupModeIcon mode={groupMode} size={11} />
        </span>
        <span
          className={classNames(
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--color-bg-primary)]",
            status.dotClass
          )}
        />
      </button>
    );
  }

  return (
    <div className="group/item relative">
      <div
        className={classNames(
          "w-full px-3 py-3 rounded-xl transition-all min-h-[48px] flex items-center gap-2 relative",
          isActive ? "glass-group-item-active glow-pulse" : "glass-group-item",
          isArchived && !isActive && "opacity-90"
        )}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onSelect();
        }}
      >
        <div
          className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left"
          onMouseEnter={onWarm}
          onFocus={onWarm}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={classNames(
                "inline-flex h-5 w-5 items-center justify-center rounded-md border flex-shrink-0",
                groupMode === "interactive"
                  ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              )}
              title={groupMode === "interactive" ? "Interactive" : "Collaboration"}
            >
              <GroupModeIcon mode={groupMode} size={12} />
            </span>
            <span
              className={classNames(
                "text-sm font-medium truncate",
                isActive
                  ? "text-cyan-700 dark:text-cyan-300"
                  : "text-[var(--color-text-primary)] group-hover/item:text-[var(--color-text-primary)]"
              )}
            >
              {group.title || gid}
            </span>
          </div>
          <span
            className={classNames(
              "text-[9px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 uppercase",
              status.pillClass
            )}
          >
            {status.label}
          </span>
        </div>

        {menuActions && menuActions.length > 0 && (
          <div className="relative shrink-0">
            <button
              type="button"
              className={classNames(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors glass-btn",
                isActive
                  ? "text-cyan-700 dark:text-cyan-300"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              )}
              aria-label={menuAriaLabel || menuActions[0]?.label}
              title={menuAriaLabel || menuActions[0]?.label}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
            >
              <MoreIcon size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 min-w-[160px] rounded-xl p-1.5 shadow-2xl glass-panel">
                {menuActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className={classNames(
                      "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      "text-[var(--color-text-primary)] hover:bg-[var(--glass-tab-bg-hover)]"
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      action.onSelect();
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
