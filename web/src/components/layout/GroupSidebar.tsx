import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { GroupMeta } from "../../types";
import { classNames } from "../../utils/classNames";
import { CloseIcon, FolderIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../Icons";
import { GroupSidebarItem } from "./GroupSidebarItem";
import { GroupSidebarSortableList } from "./GroupSidebarSortableList";
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "../../stores/useUIStore";
import { useBrandingStore } from "../../stores";
import { TOOL_APP_TABS } from "../../utils/appTabs";
import { getNotesNavMeta } from "./notesNav";
import { getScriptManagerNavMeta } from "./scriptManagerNav";

export interface GroupSidebarProps {
  orderedGroups: GroupMeta[];
  archivedGroupIds: string[];
  selectedGroupId: string;
  activeTab?: string;
  isOpen: boolean;
  isCollapsed: boolean;
  sidebarWidth: number;
  isDark: boolean;
  readOnly?: boolean;
  onSelectGroup: (groupId: string) => void;
  onSelectChat?: () => void;
  onSelectScripts?: () => void;
  onSelectNotes?: () => void;
  onWarmGroup?: (groupId: string) => void;
  onCreateGroup?: () => void;
  onClose: () => void;
  onToggleCollapse: () => void;
  onResizeWidth: (width: number) => void;
  onReorderSection: (section: "working" | "archived", fromIndex: number, toIndex: number) => void;
  onRenameGroup?: (groupId: string) => void;
  onArchiveGroup: (groupId: string) => void;
  onRestoreGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
}

export function GroupSidebar({
  orderedGroups,
  archivedGroupIds,
  selectedGroupId,
  activeTab = "chat",
  isOpen,
  isCollapsed,
  sidebarWidth,
  isDark,
  readOnly,
  onSelectGroup,
  onSelectChat,
  onSelectScripts,
  onSelectNotes,
  onWarmGroup,
  onCreateGroup,
  onClose,
  onToggleCollapse,
  onResizeWidth,
  onReorderSection,
  onRenameGroup,
  onArchiveGroup,
  onRestoreGroup,
  onDeleteGroup,
}: GroupSidebarProps) {
  const { t } = useTranslation('layout');
  const branding = useBrandingStore((s) => s.branding);
  const scriptManagerNav = getScriptManagerNavMeta();
  const notesNav = getNotesNavMeta();
  const toolItems = [
    onSelectScripts ? { tab: "scripts", onSelect: onSelectScripts, ...scriptManagerNav } : null,
    onSelectNotes ? { tab: "notes", onSelect: onSelectNotes, ...notesNav } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const archivedSet = useMemo(() => new Set(archivedGroupIds), [archivedGroupIds]);
  const visibleSelectedGroupId = TOOL_APP_TABS.includes(activeTab as (typeof TOOL_APP_TABS)[number]) ? "" : selectedGroupId;
  const workingGroups = useMemo(
    () => orderedGroups.filter((g) => !archivedSet.has(String(g.group_id || "").trim())),
    [archivedSet, orderedGroups]
  );
  const archivedGroups = useMemo(
    () => orderedGroups.filter((g) => archivedSet.has(String(g.group_id || "").trim())),
    [archivedSet, orderedGroups]
  );
  const collapsedGroups = useMemo(() => {
    if (!isCollapsed) return workingGroups;
    const selectedArchived = archivedGroups.find((g) => String(g.group_id || "").trim() === String(selectedGroupId || "").trim());
    return selectedArchived ? [...workingGroups, selectedArchived] : workingGroups;
  }, [archivedGroups, isCollapsed, selectedGroupId, workingGroups]);
  const [archivedOpen, setArchivedOpen] = useState(
    () =>
      archivedGroups.some((g) => String(g.group_id || "").trim() === String(selectedGroupId || "").trim()) ||
      (orderedGroups.length > 0 && workingGroups.length === 0 && archivedGroups.length > 0)
  );
  const selectedArchived = useMemo(
    () => archivedGroups.some((g) => String(g.group_id || "").trim() === String(selectedGroupId || "").trim()),
    [archivedGroups, selectedGroupId]
  );
  const autoArchivedOpen = selectedArchived || (orderedGroups.length > 0 && workingGroups.length === 0 && archivedGroups.length > 0);
  const archivedPanelOpen = archivedOpen || autoArchivedOpen;

  useEffect(() => {
    if (!isResizing) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      onResizeWidth(drag.startWidth + (event.clientX - drag.startX));
    };

    const finishResize = () => {
      dragStateRef.current = null;
      setIsResizing(false);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
      finishResize();
    };
  }, [isResizing, onResizeWidth]);

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (isCollapsed) return;
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
    setIsResizing(true);
    document.body.style.setProperty("cursor", "col-resize");
    document.body.style.setProperty("user-select", "none");
  }, [isCollapsed, sidebarWidth]);

  const handleSelectGroup = useCallback((groupId: string) => {
    onSelectGroup(groupId);
    if (TOOL_APP_TABS.includes(activeTab as (typeof TOOL_APP_TABS)[number])) {
      onSelectChat?.();
    }
  }, [activeTab, onSelectChat, onSelectGroup]);

  const renderGroupList = useCallback(
    (groups: GroupMeta[], section: "working" | "archived") => {
      const isArchivedSection = section === "archived";
      const getMenuActions = (gid: string) => {
        const renameAction = onRenameGroup
          ? [{ label: t("renameGroup"), onSelect: () => onRenameGroup(gid) }]
          : [];
        if (isArchivedSection) {
          return [
            ...renameAction,
            { label: t("restoreGroup"), onSelect: () => onRestoreGroup(gid) },
            { label: t("deleteGroup"), onSelect: () => onDeleteGroup(gid) },
          ];
        }
        return [
          ...renameAction,
          {
            label: t("archiveGroup"),
            onSelect: () => {
              setArchivedOpen(true);
              onArchiveGroup(gid);
            },
          },
        ];
      };

      if (!isCollapsed && !readOnly) {
        return (
            <GroupSidebarSortableList
              groups={groups}
              section={section}
              selectedGroupId={visibleSelectedGroupId}
              isDark={isDark}
              isCollapsed={false}
              readOnly={readOnly}
              menuAriaLabel={t("groupActions")}
              getMenuActions={getMenuActions}
              onReorderSection={onReorderSection}
              onSelectGroup={handleSelectGroup}
              onWarmGroup={onWarmGroup}
              onClose={onClose}
            />
        );
      }

      return (
        <div className={classNames(isCollapsed ? "flex flex-col items-center gap-2" : "space-y-1")}>
          {groups.map((g) => {
            const gid = String(g.group_id || "");
            return (
              <GroupSidebarItem
                key={gid}
                group={g}
                isActive={gid === visibleSelectedGroupId}
                isCollapsed={isCollapsed}
                isArchived={isArchivedSection}
                menuActions={isCollapsed ? undefined : getMenuActions(gid)}
                menuAriaLabel={isCollapsed ? undefined : `${t("groupActions")} · ${g.title || gid}`}
                onSelect={() => {
                  handleSelectGroup(gid);
                  if (window.matchMedia("(max-width: 767px)").matches) onClose();
                }}
                onWarm={gid === visibleSelectedGroupId ? undefined : () => onWarmGroup?.(gid)}
              />
            );
          })}
        </div>
      );
    },
    [handleSelectGroup, isCollapsed, isDark, onArchiveGroup, onClose, onDeleteGroup, onRenameGroup, onReorderSection, onRestoreGroup, onWarmGroup, readOnly, t, visibleSelectedGroupId]
  );

  return (
    <>
      <aside
        className={classNames(
          "h-full min-h-0 flex flex-col glass-sidebar",
          "fixed inset-y-0 left-0 md:relative md:inset-auto z-40",
          isResizing ? "transition-none" : "transition-[width,transform] duration-300 ease-out",
          isCollapsed ? "w-[60px]" : "w-[280px] md:w-[var(--sidebar-width)]",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="px-3 py-2.5">
          <div
            className={classNames(
              "flex items-center gap-1.5",
              isCollapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className={classNames("flex min-w-0 flex-1 items-center", isCollapsed ? "" : "gap-3")}>
              <div className={classNames(
                "flex items-center justify-center overflow-hidden rounded-xl bg-transparent",
                "w-10 h-10 shrink-0",
                "text-[rgb(35,36,37)] dark:text-white"
              )}>
                <img
                  src={branding.logo_icon_url || "/ui/logo.svg"}
                  alt={`${branding.product_name} logo`}
                  className={classNames(
                    "object-contain",
                    isCollapsed ? "w-6 h-6" : "h-6 w-6"
                  )}
                />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold tracking-[-0.035em] text-[var(--color-text-primary)]">
                    {branding.product_name}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && !readOnly && onCreateGroup && (
              <button
                className={classNames(
                  "inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-3 text-[13px] font-medium transition-all glass-btn border-0 shadow-none",
                  isDark
                    ? "text-white/88 hover:text-white"
                    : "text-[rgb(35,36,37)]/88 hover:text-[rgb(35,36,37)]"
                )}
                onClick={onCreateGroup}
                title={t('createNewGroup')}
                aria-label={t('createNewGroup')}
              >
                {t('newGroup')}
              </button>
            )}

            {!isCollapsed && (
              <div className="flex shrink-0 items-center gap-2">
                {/* Collapse button - desktop only */}
                <button
                  className={classNames(
                    "hidden md:flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent transition-all duration-150",
                    "text-[var(--color-text-tertiary)] hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)]"
                  )}
                  onClick={onToggleCollapse}
                  aria-label={t('collapseSidebar')}
                  title={t('collapseSidebar')}
                >
                  <ChevronLeftIcon size={16} />
                </button>
                {/* Close button - mobile only */}
                <button
                  className={classNames(
                    "md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all glass-btn",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  )}
                  onClick={onClose}
                  aria-label={t('closeSidebar')}
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapsed: expand button and new button */}
        {isCollapsed && (
          <div className="p-2 flex flex-col items-center gap-2">
            <button
              className={classNames(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all glass-btn",
                "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              onClick={onToggleCollapse}
              aria-label={t('expandSidebar')}
              title={t('expandSidebar')}
            >
              <ChevronRightIcon size={18} />
            </button>
            {!readOnly && onCreateGroup && (
              <button
                className={classNames(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all glass-btn-accent",
                  "text-cyan-700 dark:text-cyan-300"
                )}
                onClick={onCreateGroup}
                aria-label={t('createNewGroup')}
                title={t('createNewGroup')}
              >
                <PlusIcon size={18} />
              </button>
            )}
          </div>
        )}

        {/* Group list */}
        <div className={classNames(
          "min-h-0 flex-1 overflow-auto scrollbar-hide",
          isCollapsed ? "p-2" : "p-3"
        )}>
          {!isCollapsed && (
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3 px-2 text-[var(--color-text-tertiary)]">
              {t('workingGroups')}
            </div>
          )}

          {renderGroupList(isCollapsed ? collapsedGroups : workingGroups, "working")}

          {!isCollapsed && archivedGroups.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                className={classNames(
                  "w-full flex items-center justify-between rounded-xl px-2 py-2 transition-colors",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-tab-bg-hover)]"
                )}
                onClick={() => setArchivedOpen((prev) => !prev)}
                aria-expanded={archivedPanelOpen}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-tertiary)]">
                    {t("archivedGroups")}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--glass-panel-bg)] text-[var(--color-text-secondary)]">
                    {archivedGroups.length}
                  </span>
                </div>
                <ChevronDownIcon
                  size={16}
                  className={classNames("transition-transform", archivedPanelOpen ? "rotate-180" : "")}
                />
              </button>
              {archivedPanelOpen && (
                <div className="mt-2">
                  {renderGroupList(archivedGroups, "archived")}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!orderedGroups.length && !isCollapsed && (
            <div className="p-6 text-center">
              <div className={classNames(
                "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center glass-card",
                "text-[var(--color-text-tertiary)]"
              )}>
                <FolderIcon size={32} />
              </div>
              <div className="text-sm mb-2 font-medium text-[var(--color-text-secondary)]">{t('noGroupsYet')}</div>
              <div className="text-xs mb-5 max-w-[200px] mx-auto leading-relaxed text-[var(--color-text-tertiary)]">
                {t('noGroupsDescription')}
              </div>
              {!readOnly && onCreateGroup && (
                <button
                  className={classNames(
                    "text-sm px-5 py-2.5 rounded-xl font-medium min-h-[44px] transition-all glass-btn-accent",
                    "text-cyan-700 dark:text-cyan-300"
                  )}
                  onClick={onCreateGroup}
                >
                  {t('createFirstGroup')}
                </button>
              )}
            </div>
          )}
        </div>

        {toolItems.length > 0 && (
          <div className={classNames("border-t border-[var(--glass-border-subtle)]", isCollapsed ? "p-2" : "p-3 pt-3")}>
            {!isCollapsed && (
              <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-tertiary)]">
                {t("toolsSection", { defaultValue: "Tools" })}
              </div>
            )}
            <div className={classNames(isCollapsed ? "flex flex-col items-center gap-2" : "space-y-2")}>
              {toolItems.map((tool) => {
                const active = activeTab === tool.tab;
                return (
                  <button
                    key={tool.tab}
                    type="button"
                    className={classNames(
                      isCollapsed
                        ? "glass-group-item flex h-11 w-11 items-center justify-center rounded-xl"
                        : "glass-group-item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left",
                      active && "glass-group-item-active glow-pulse"
                    )}
                    onClick={() => {
                      tool.onSelect();
                      if (window.matchMedia("(max-width: 767px)").matches) onClose();
                    }}
                    title={tool.title}
                    aria-label={tool.title}
                  >
                    <span
                      className={classNames(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        active ? "text-cyan-700 dark:text-cyan-300" : "text-[var(--color-text-secondary)]"
                      )}
                    >
                      <tool.Icon size={18} />
                    </span>
                    {!isCollapsed && (
                      <span className="min-w-0 flex-1">
                        <span
                          className={classNames(
                            "block truncate text-sm font-medium",
                            active ? "text-cyan-700 dark:text-cyan-300" : "text-[var(--color-text-primary)]"
                          )}
                        >
                          {tool.title}
                        </span>
                        {tool.subtitle ? (
                          <span className="mt-0.5 block truncate text-xs text-[var(--color-text-secondary)]">
                            {tool.subtitle}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isCollapsed && (
          <div
            className="absolute inset-y-0 right-0 z-20 hidden w-4 translate-x-1/2 cursor-col-resize items-center justify-center md:flex"
            onPointerDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label={t('resizeSidebar')}
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuenow={sidebarWidth}
          >
            <div
              className={classNames(
                "h-14 w-[3px] rounded-full transition-all",
                isResizing
                  ? "bg-cyan-500 shadow-[0_0_0_4px_rgba(6,182,212,0.12)]"
                  : "bg-black/10 hover:bg-cyan-500/70 dark:bg-white/10 dark:hover:bg-cyan-400/75"
              )}
            />
          </div>
        )}
      </aside>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden glass-overlay animate-fade-in"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
