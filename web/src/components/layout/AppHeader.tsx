import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actor,
  GroupDoc,
  GroupRuntimeStatus,
} from "../../types";
import { getGroupStatusFromSource } from "../../utils/groupStatus";
import { getGroupControlVisual, getLaunchControlMode, resolveGroupControls } from "../../utils/groupControls";
import type { ChatDisplayMode } from "../../features/chatDisplay/chatDisplayMode";
import { classNames } from "../../utils/classNames";
import {
  ClipboardIcon,
  SearchIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  SettingsIcon,
  EditIcon,
  MoreIcon,
  MenuIcon,
  TerminalIcon,
  MessageSquareTextIcon,
  FolderIcon,
} from "../Icons";

export interface AppHeaderProps {
  titleOverride?: string;
  subtitleOverride?: string;
  hideGroupControls?: boolean;
  allowSettingsWithoutGroup?: boolean;
  webReadOnly?: boolean;
  selectedGroupId: string;
  groupDoc: GroupDoc | null;
  selectedGroupRunning: boolean;
  selectedGroupRuntimeStatus: GroupRuntimeStatus | null;
  actors: Actor[];
  sseStatus: "connected" | "connecting" | "disconnected";
  busy: string;
  onOpenSidebar: () => void;
  onOpenGroupEdit?: () => void;
  onOpenSearch: () => void;
  onOpenContext: () => void;
  onStartGroup: () => void;
  onStopGroup: () => void;
  onSetGroupState: (state: "active" | "paused" | "idle") => void | Promise<void>;
  onOpenSettings: () => void;
  onOpenMobileMenu: () => void;
  chatDisplayMode?: ChatDisplayMode;
  hasTerminalActors?: boolean;
  onToggleChatDisplayMode?: () => void;
  workspaceInspectorOpen?: boolean;
  onToggleWorkspaceInspector?: () => void;
}

export function AppHeader({
  titleOverride,
  subtitleOverride,
  hideGroupControls = false,
  allowSettingsWithoutGroup = false,
  webReadOnly,
  selectedGroupId,
  groupDoc,
  selectedGroupRunning,
  selectedGroupRuntimeStatus,
  actors,
  busy,
  onOpenSidebar,
  onOpenGroupEdit,
  onOpenSearch,
  onOpenContext,
  onStartGroup,
  onStopGroup,
  onSetGroupState,
  onOpenSettings,
  onOpenMobileMenu,
  chatDisplayMode = "chat",
  hasTerminalActors = false,
  onToggleChatDisplayMode,
  workspaceInspectorOpen = false,
  onToggleWorkspaceInspector,
  sseStatus,
}: AppHeaderProps) {
  const { t } = useTranslation('layout');
  const [pendingToggleAction, setPendingToggleAction] = useState<"launch" | "pause" | null>(null);
  const [hasObservedGroupBusy, setHasObservedGroupBusy] = useState(false);
  const headerIconButtonBaseClass =
    "flex items-center justify-center h-10 w-10 rounded-[14px] transition-all shrink-0";
  const headerRailClass =
    "flex items-center gap-1 p-[3px]";
  const headerUtilityRailClass =
    "flex items-center gap-0.5 p-[3px]";
  const headerMinorActionClass =
    "hidden md:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-[var(--color-text-tertiary)] transition-all hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)]";
  const headerRailButtonClass =
    "flex items-center justify-center h-9 w-9 rounded-[14px] transition-all shrink-0 border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-45 disabled:text-[var(--color-text-tertiary)] disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-tertiary)]";
  const headerWorkspaceButtonClass =
    "flex items-center justify-center h-8 w-8 rounded-xl transition-all shrink-0 border border-transparent bg-transparent text-[var(--color-text-tertiary)] hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)] active:scale-[0.97] disabled:opacity-45 disabled:text-[var(--color-text-tertiary)] disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-tertiary)]";
  const headerWorkspaceButtonActiveClass =
    "!border-transparent !bg-blue-600 !text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] ring-1 ring-black/5 hover:!bg-blue-500 hover:!text-white dark:ring-white/10 active:scale-[0.97]";
  const headerUtilityButtonClass =
    "flex items-center justify-center h-8 w-8 rounded-xl transition-all shrink-0 border border-transparent bg-transparent text-[var(--color-text-tertiary)] hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)]";
  const headerRailDividerClass = "mx-1 h-5 w-px bg-[var(--glass-border-subtle)]";
  const selectedStatus = selectedGroupId ? getGroupStatusFromSource({
    running: selectedGroupRunning,
    state: (selectedGroupRuntimeStatus?.lifecycle_state as GroupDoc["state"] | undefined) || groupDoc?.state,
    runtime_status: selectedGroupRuntimeStatus || undefined,
  }) : null;
  const selectedStatusKey = selectedStatus?.key ?? null;
  const launchMode = getLaunchControlMode(selectedStatusKey);
  const launchControl = getGroupControlVisual(selectedStatusKey, "launch", busy);
  const pauseControl = getGroupControlVisual(selectedStatusKey, "pause", busy);
  const stopControl = getGroupControlVisual(selectedStatusKey, "stop", busy);
  const {
    launchHardUnavailable,
    pauseHardUnavailable,
    stopHardUnavailable,
    launchDisabled,
    pauseDisabled,
    stopDisabled,
  } = resolveGroupControls({
    selectedGroupId,
    actorCount: actors.length,
    statusKey: selectedStatusKey,
    busy,
  });
  const isPauseAction = selectedStatusKey === "run";
  const toggleControl = isPauseAction ? pauseControl : launchControl;
  const toggleDisabled = (isPauseAction ? pauseDisabled : launchDisabled) || pendingToggleAction !== null;
  const toggleHardUnavailable = isPauseAction ? pauseHardUnavailable : launchHardUnavailable;
  const toggleTitle = isPauseAction
    ? t('pauseDelivery')
    : launchMode === "activate"
      ? t('resumeDelivery')
      : t('launchAllAgents');
  const isGroupBusy = busy.startsWith("group-");

  useEffect(() => {
    if (!pendingToggleAction) return;
    let timerId: number | null = null;
    const resetPendingState = () => {
      timerId = window.setTimeout(() => {
        setPendingToggleAction(null);
        setHasObservedGroupBusy(false);
      }, 0);
    };

    if (selectedGroupId.trim() === "") {
      resetPendingState();
      return () => {
        if (timerId !== null) window.clearTimeout(timerId);
      };
    }
    if (isGroupBusy) {
      if (!hasObservedGroupBusy) {
        timerId = window.setTimeout(() => {
          setHasObservedGroupBusy(true);
        }, 0);
      }
      return () => {
        if (timerId !== null) window.clearTimeout(timerId);
      };
    }
    const launchSettled = pendingToggleAction === "launch" && (selectedStatusKey === "run" || selectedStatusKey === "idle");
    const pauseSettled = pendingToggleAction === "pause" && selectedStatusKey === "paused";
    if (launchSettled || pauseSettled || hasObservedGroupBusy) {
      resetPendingState();
    }
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [pendingToggleAction, hasObservedGroupBusy, isGroupBusy, selectedGroupId, selectedStatusKey]);

  const handleLaunchClick = () => {
    if (launchDisabled || selectedStatusKey === "run") return;
    setPendingToggleAction("launch");
    setHasObservedGroupBusy(false);
    if (launchMode === "activate") {
      void onSetGroupState("active");
      return;
    }
    onStartGroup();
  };

  const handlePauseClick = () => {
    if (pauseDisabled || selectedStatusKey === "paused") return;
    setPendingToggleAction("pause");
    setHasObservedGroupBusy(false);
    void onSetGroupState("paused");
  };

  const handleStopClick = () => {
    if (stopDisabled || selectedStatusKey === "stop") return;
    onStopGroup();
  };
  const handleToggleClick = () => {
    if (isPauseAction) {
      handlePauseClick();
      return;
    }
    handleLaunchClick();
  };
  const title = titleOverride || groupDoc?.title || (selectedGroupId ? selectedGroupId : t('selectGroup'));
  const isTerminalDisplayMode = chatDisplayMode === "terminal";
  const displayModeTitle = !hasTerminalActors
    ? t("terminalModeUnavailable")
    : isTerminalDisplayMode
      ? t("switchToChatMode")
      : t("switchToTerminalMode");
  return (
    <header
      className="z-20 flex h-14 flex-shrink-0 items-center justify-between gap-3 px-4 glass-header md:px-5"
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          className={classNames(
            "md:hidden -ml-1",
            headerIconButtonBaseClass,
            "glass-btn",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
          onClick={onOpenSidebar}
          aria-label={t('openSidebar')}
        >
          <MenuIcon size={18} />
        </button>

        <div className="min-w-0 flex items-center gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-base font-semibold leading-tight text-[var(--color-text-primary)] md:text-[1.125rem]">
                {title}
              </h1>
              {!hideGroupControls && selectedGroupId && sseStatus !== "connected" && (
                <span
                  className={classNames(
                    "h-2 w-2 flex-shrink-0 rounded-full",
                    sseStatus === "connecting" ? "bg-amber-400 animate-pulse" : "bg-rose-500"
                  )}
                  title={sseStatus === "connecting" ? t('reconnecting') : t('disconnected')}
                />
              )}
            </div>
            {subtitleOverride ? (
              <p className="mt-0.5 truncate text-xs leading-tight text-[var(--color-text-secondary)]">
                {subtitleOverride}
              </p>
            ) : null}
          </div>

        {!hideGroupControls && selectedGroupId && !webReadOnly && onOpenGroupEdit && (
          <button
            className={headerMinorActionClass}
            onClick={onOpenGroupEdit}
            title={t('editGroup')}
            aria-label={t('editGroup')}
          >
            <EditIcon size={14} />
          </button>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5">
        {!hideGroupControls && (
          <button
            type="button"
            onClick={onToggleWorkspaceInspector}
            disabled={!selectedGroupId || !onToggleWorkspaceInspector}
            className={classNames(
              headerWorkspaceButtonClass,
              workspaceInspectorOpen &&
                headerWorkspaceButtonActiveClass
            )}
            title={workspaceInspectorOpen ? t("workspaceInspectorClose") : t("workspaceInspectorOpen")}
            aria-label={workspaceInspectorOpen ? t("workspaceInspectorClose") : t("workspaceInspectorOpen")}
            aria-pressed={workspaceInspectorOpen}
          >
            <FolderIcon size={17} />
          </button>
        )}
        {!webReadOnly && (
          <>
            {/* Desktop Actions */}
            <div className="mr-1 hidden items-center gap-1.5 md:flex">
              {!hideGroupControls && selectedGroupId ? (
                <button
                  type="button"
                  onClick={onToggleChatDisplayMode}
                  disabled={!hasTerminalActors || !onToggleChatDisplayMode}
                  className={classNames(
                    headerRailButtonClass,
                    isTerminalDisplayMode &&
                      "border-[var(--glass-tab-border-active)] bg-[var(--glass-tab-bg-active)] text-[var(--color-text-primary)] shadow-sm"
                  )}
                  title={displayModeTitle}
                  aria-label={displayModeTitle}
                  aria-pressed={isTerminalDisplayMode}
                >
                  <span className="sr-only">{displayModeTitle}</span>
                  {isTerminalDisplayMode ? <MessageSquareTextIcon size={17} /> : <TerminalIcon size={17} />}
                </button>
              ) : null}
              {!hideGroupControls && (
                <div className={headerRailClass}>
                  <button
                    onClick={handleToggleClick}
                    disabled={toggleDisabled}
                    className={classNames(
                      "flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0",
                      toggleControl.className,
                      toggleHardUnavailable && "opacity-45"
                    )}
                    title={toggleTitle}
                    aria-pressed={toggleControl.active}
                  >
                    <span className="sr-only">{toggleTitle}</span>
                    {isPauseAction ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
                  </button>

                  <button
                    onClick={handleStopClick}
                    disabled={stopDisabled}
                    className={classNames(
                      "flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0",
                      stopControl.className,
                      stopHardUnavailable && "opacity-45"
                    )}
                    title={t('stopAllAgents')}
                    aria-pressed={stopControl.active}
                  >
                    <span className="sr-only">{t('stopAllAgents')}</span>
                    <StopIcon size={17} />
                  </button>

                  <span className={headerRailDividerClass} aria-hidden="true" />

                  <button
                    onClick={onOpenSearch}
                    disabled={!selectedGroupId}
                    className={headerRailButtonClass}
                    title={t('searchMessages')}
                  >
                    <span className="sr-only">{t('searchMessages')}</span>
                    <SearchIcon size={17} />
                  </button>

                  <button
                    onClick={onOpenContext}
                    disabled={!selectedGroupId}
                    className={headerRailButtonClass}
                    title={t('context')}
                  >
                    <span className="sr-only">{t('context')}</span>
                    <ClipboardIcon size={17} />
                  </button>
                </div>
              )}

              <div className={headerUtilityRailClass}>
                <button
                  onClick={onOpenSettings}
                  disabled={!selectedGroupId && !allowSettingsWithoutGroup}
                  className={classNames(headerUtilityButtonClass, "disabled:opacity-45 disabled:text-[var(--color-text-tertiary)]")}
                  title={t('settings')}
                >
                  <span className="sr-only">{t('settings')}</span>
                  <SettingsIcon size={18} />
                </button>
              </div>
            </div>

            <button
              className={classNames(
                "md:hidden",
                headerIconButtonBaseClass,
                "glass-btn",
                "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              onClick={onOpenMobileMenu}
              title={t('menu')}
            >
              <MoreIcon size={18} />
            </button>
          </>
        )}
      </div>

    </header>
  );
}
