import { useCallback, useMemo, useState } from "react";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GroupMeta } from "../../types";
import { classNames } from "../../utils/classNames";
import { getGroupMode } from "../../utils/groupMode";
import { getGroupStatusFromSource } from "../../utils/groupStatus";
import { GripIcon, GroupModeIcon, MoreIcon } from "../Icons";

interface SortableGroupItemProps {
  group: GroupMeta;
  isActive: boolean;
  isDark: boolean;
  isCollapsed: boolean;
  isArchived?: boolean;
  dragDisabled?: boolean;
  menuAriaLabel?: string;
  menuActions?: Array<{ label: string; onSelect: () => void }>;
  onSelect: () => void;
  onWarm?: () => void;
}

export function SortableGroupItem({
  group,
  isActive,
  isDark: _isDark,
  isCollapsed,
  isArchived = false,
  dragDisabled = false,
  menuAriaLabel,
  menuActions,
  onSelect,
  onWarm,
}: SortableGroupItemProps) {
  const gid = String(group.group_id || "");
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gid, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const status = getGroupStatusFromSource(group);
  const groupMode = getGroupMode(group);
  const groupModeTitle = groupMode === "solo" ? "Solo" : "Collaboration";
  const { refs, floatingStyles, context } = useFloating({
    open: menuOpen,
    onOpenChange: setMenuOpen,
    placement: "bottom-end",
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
    strategy: "fixed",
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);
  const setReference = useCallback((node: HTMLElement | null) => refs.setReference(node), [refs]);
  const setFloating = useCallback((node: HTMLElement | null) => refs.setFloating(node), [refs]);
  const dragListeners = useMemo(() => listeners ?? {}, [listeners]);
  const handleDragHandlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    listeners?.onPointerDown?.(event);
    event.stopPropagation();
  }, [listeners]);

  if (isCollapsed) {
    const initial = (group.title || gid).charAt(0).toUpperCase();
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <button
          className={classNames(
            "w-11 h-11 rounded-xl flex items-center justify-center transition-all relative",
            isDragging && "opacity-50 shadow-lg",
            isActive
              ? "glass-group-item-active glow-pulse"
              : "glass-group-item hover:scale-105"
          )}
          onClick={onSelect}
          onMouseEnter={onWarm}
          onFocus={onWarm}
          title={group.title || gid}
        >
          <span
            className={classNames(
              "text-sm font-semibold",
              isActive
                ? "text-cyan-700 dark:text-cyan-300"
                : "text-[var(--color-text-secondary)]"
            )}
          >
            {initial}
          </span>
          <span
            className={classNames(
              "absolute left-0 top-0 inline-flex h-4 w-4 -translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full",
              isActive ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" : "bg-black/5 text-[var(--color-text-secondary)] dark:bg-white/10"
            )}
            title={groupModeTitle}
          >
            <GroupModeIcon mode={groupMode} size={11} />
          </span>
          {/* Status dot */}
          <span className={classNames(
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--color-bg-primary)]",
            status.dotClass
          )} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={classNames(
        "group/item relative",
        isDragging && "z-50"
      )}
    >
      <div
        className={classNames(
          "w-full px-3 py-3 rounded-xl transition-all min-h-[48px] flex items-center gap-2 relative",
          isDragging && "opacity-70 shadow-lg ring-2 ring-cyan-500/30",
          isActive
            ? "glass-group-item-active glow-pulse"
            : "glass-group-item",
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
        {/* Drag handle */}
        {!dragDisabled && (
          <div
            {...dragListeners}
            {...attributes}
            ref={setActivatorNodeRef}
            className={classNames(
              "flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded transition-opacity touch-none",
              "hidden md:block md:opacity-0 md:group-hover/item:opacity-100",
              isDragging && "!block !opacity-100",
              "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            )}
            onPointerDown={handleDragHandlePointerDown}
            onClick={(event) => event.stopPropagation()}
          >
            <GripIcon size={14} />
          </div>
        )}

        <div
          className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left"
          onMouseEnter={onWarm}
          onFocus={onWarm}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={classNames(
                "inline-flex h-5 w-5 items-center justify-center rounded-md border flex-shrink-0",
                groupMode === "solo"
                  ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              )}
              title={groupModeTitle}
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
          <>
            <button
              type="button"
              ref={setReference}
              {...getReferenceProps({
                className: classNames(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors glass-btn",
                  isActive
                    ? "text-cyan-700 dark:text-cyan-300"
                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                ),
                "aria-label": menuAriaLabel || menuActions[0]?.label,
                title: menuAriaLabel || menuActions[0]?.label,
                onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                },
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                },
              })}
            >
              <MoreIcon size={16} />
            </button>
            <FloatingPortal>
              {menuOpen && (
                <div
                  ref={setFloating}
                  style={floatingStyles}
                  {...getFloatingProps()}
                  className="z-max min-w-[160px] rounded-xl p-1.5 shadow-2xl glass-panel"
                >
                  {menuActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className={classNames(
                        "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        "text-[var(--color-text-primary)] hover:bg-[var(--glass-tab-bg-hover)]"
                      )}
                      onClick={() => {
                        setMenuOpen(false);
                        action.onSelect();
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </FloatingPortal>
          </>
        )}
      </div>
    </div>
  );
}
