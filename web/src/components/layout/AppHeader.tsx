import { useTranslation } from 'react-i18next';
import {
  Actor,
  ChatNotificationSoundId,
  ChatNotificationSoundPreference,
  GroupDoc,
  GroupRuntimeStatus,
  TextScale,
  Theme,
} from "../../types";
import { getGroupStatusFromSource } from "../../utils/groupStatus";
import { getGroupControlVisual, getLaunchControlMode, resolveGroupControls } from "../../utils/groupControls";
import { getGroupMode } from "../../utils/groupMode";
import { classNames } from "../../utils/classNames";
import { ChatNotificationSoundSwitcher } from "../ChatNotificationSoundSwitcher";
import { TextScaleSwitcher } from "../TextScaleSwitcher";
import { ThemeToggleCompact } from "../ThemeToggle";
import { LanguageSwitcher } from "../LanguageSwitcher";
import {
  ClipboardIcon,
  SearchIcon,
  RocketIcon,
  PauseIcon,
  StopIcon,
  SettingsIcon,
  EditIcon,
  MoreIcon,
  MenuIcon,
  GroupModeIcon,
} from "../Icons";

export interface AppHeaderProps {
  isDark: boolean;
  theme: Theme;
  textScale: TextScale;
  chatNotificationSound: ChatNotificationSoundPreference;
  titleOverride?: string;
  hideGroupControls?: boolean;
  allowSettingsWithoutGroup?: boolean;
  onThemeChange: (theme: Theme) => void;
  onTextScaleChange: (scale: TextScale) => void;
  onChatNotificationSoundChange: (preference: ChatNotificationSoundPreference) => void;
  onPreviewChatNotificationSound: (soundId: ChatNotificationSoundId) => void | Promise<unknown>;
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
}

export function AppHeader({
  isDark,
  theme,
  textScale,
  chatNotificationSound,
  titleOverride,
  hideGroupControls = false,
  allowSettingsWithoutGroup = false,
  onThemeChange,
  onTextScaleChange,
  onChatNotificationSoundChange,
  onPreviewChatNotificationSound,
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
  sseStatus,
}: AppHeaderProps) {
  const { t } = useTranslation('layout');
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

  const handleLaunchClick = () => {
    if (launchDisabled || selectedStatusKey === "run") return;
    if (launchMode === "activate") {
      void onSetGroupState("active");
      return;
    }
    onStartGroup();
  };

  const handlePauseClick = () => {
    if (pauseDisabled || selectedStatusKey === "paused") return;
    void onSetGroupState("paused");
  };

  const handleStopClick = () => {
    if (stopDisabled || selectedStatusKey === "stop") return;
    onStopGroup();
  };
  const title = titleOverride || groupDoc?.title || (selectedGroupId ? selectedGroupId : t('selectGroup'));
  const hasGroupModeMetadata = !!groupDoc;
  const groupMode = getGroupMode(groupDoc);
  const modeBadgeClass = groupMode === "interactive"
    ? isDark
      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
      : "border-cyan-500/20 bg-cyan-500/10 text-cyan-700"
    : isDark
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
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
            {!hideGroupControls && selectedStatus && (
              <span
                className={classNames(
                  "h-2.5 w-2.5 flex-shrink-0 rounded-full",
                  selectedStatus.dotClass
                )}
                title={selectedStatus.label}
              />
            )}
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
        {!webReadOnly && (
          <>
            {/* Desktop Actions */}
            <div className="mr-1 hidden items-center gap-1.5 md:flex">
              {!hideGroupControls && selectedGroupId && hasGroupModeMetadata ? (
                <span
                  className={classNames(
                    "inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border shadow-sm",
                    modeBadgeClass,
                  )}
                  title={t(groupMode === "interactive" ? "groupModeInteractive" : "groupModeCollaboration")}
                  aria-label={t(groupMode === "interactive" ? "groupModeInteractive" : "groupModeCollaboration")}
                >
                  <GroupModeIcon mode={groupMode} size={16} />
                  <span className="sr-only">
                    {t(groupMode === "interactive" ? "groupModeInteractive" : "groupModeCollaboration")}
                  </span>
                </span>
              ) : null}
              {!hideGroupControls && (
                <>
                  <div className={headerRailClass}>
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

                  <div className={headerRailClass}>
                    <button
                      onClick={handleLaunchClick}
                      disabled={launchDisabled}
                      className={classNames(
                        "flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0",
                        launchControl.className,
                        launchHardUnavailable && "opacity-45"
                      )}
                      title={launchMode === "activate" ? t('resumeDelivery') : t('launchAllAgents')}
                      aria-pressed={launchControl.active}
                    >
                      <span className="sr-only">{launchMode === "activate" ? t('resumeDelivery') : t('launchAllAgents')}</span>
                      <RocketIcon size={17} />
                    </button>

                    <button
                      onClick={handlePauseClick}
                      disabled={pauseDisabled}
                      className={classNames(
                        "flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0",
                        pauseControl.className,
                        pauseHardUnavailable && "opacity-45"
                      )}
                      title={t('pauseDelivery')}
                      aria-pressed={pauseControl.active}
                    >
                      <span className="sr-only">{t('pauseDelivery')}</span>
                      <PauseIcon size={17} />
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
                  </div>
                </>
              )}

              <div className={headerRailClass}>
                <ThemeToggleCompact theme={theme} onThemeChange={onThemeChange} isDark={isDark} variant="rail" />
                <TextScaleSwitcher textScale={textScale} onTextScaleChange={onTextScaleChange} variant="rail" />
                <ChatNotificationSoundSwitcher
                  preference={chatNotificationSound}
                  onPreferenceChange={onChatNotificationSoundChange}
                  onPreviewSound={onPreviewChatNotificationSound}
                  variant="rail"
                />
                <LanguageSwitcher isDark={isDark} variant="rail" />
                <button
                  onClick={onOpenSettings}
                  disabled={!selectedGroupId && !allowSettingsWithoutGroup}
                  className={headerRailButtonClass}
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
