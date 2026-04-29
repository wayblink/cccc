import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

import type {
  ChatNotificationSoundId,
  ChatNotificationSoundPreference,
  TextScale,
  Theme,
} from "../../../types";
import { CHAT_NOTIFICATION_SOUND_OPTIONS } from "../../../utils/chatNotificationSound";
import { classNames } from "../../../utils/classNames";
import { getTextScaleLabel, TEXT_SCALE_OPTIONS } from "../../../utils/textScale";
import { ChatNotificationSoundSwitcher } from "../../ChatNotificationSoundSwitcher";
import { GlobeIcon, MonitorIcon, TextSizeIcon, BellIcon } from "../../Icons";
import { LanguageSwitcher } from "../../LanguageSwitcher";
import { ThemeToggle } from "../../ThemeToggle";
import {
  settingsWorkspaceBodyClass,
  settingsWorkspaceHeaderClass,
  settingsWorkspacePanelClass,
  settingsWorkspaceShellClass,
  settingsWorkspaceSoftPanelClass,
} from "./types";

interface FrontendSettingsTabProps {
  isDark: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  textScale: TextScale;
  onTextScaleChange: (scale: TextScale) => void;
  chatNotificationSound: ChatNotificationSoundPreference;
  onChatNotificationSoundChange: (preference: ChatNotificationSoundPreference) => void;
  onPreviewChatNotificationSound: (soundId: ChatNotificationSoundId) => void | Promise<unknown>;
}

interface SettingRowProps {
  isDark: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}

function SettingRow({ isDark, title, description, icon, children }: SettingRowProps) {
  return (
    <section className={classNames(settingsWorkspacePanelClass(isDark), "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between")}>
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={classNames(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border",
            isDark ? "border-white/10 bg-white/[0.04]" : "border-black/6 bg-black/[0.025]",
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--color-text-tertiary)]">{description}</p>
        </div>
      </div>
      <div className="w-full lg:w-auto lg:min-w-[18rem]">{children}</div>
    </section>
  );
}

export function FrontendSettingsTab({
  isDark,
  theme,
  onThemeChange,
  textScale,
  onTextScaleChange,
  chatNotificationSound,
  onChatNotificationSoundChange,
  onPreviewChatNotificationSound,
}: FrontendSettingsTabProps) {
  const { t } = useTranslation(["settings", "layout"]);

  return (
    <div className={settingsWorkspaceShellClass(isDark)}>
      <div className={settingsWorkspaceHeaderClass(isDark)}>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            {t("frontend.title")}
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-text-tertiary)]">
            {t("frontend.description")}
          </p>
        </div>
      </div>

      <div className={settingsWorkspaceBodyClass}>
        <div className={classNames(settingsWorkspaceSoftPanelClass(isDark), "flex items-start gap-3")}>
          <MonitorIcon size={18} className="mt-0.5 shrink-0 text-[var(--color-text-tertiary)]" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t("frontend.localOnlyTitle")}
            </div>
            <div className="mt-1 text-xs leading-5 text-[var(--color-text-tertiary)]">
              {t("frontend.localOnlyDescription")}
            </div>
          </div>
        </div>

        <SettingRow
          isDark={isDark}
          title={t("frontend.themeTitle")}
          description={t("frontend.themeDescription")}
          icon={<MonitorIcon size={18} />}
        >
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} isDark={isDark} />
        </SettingRow>

        <SettingRow
          isDark={isDark}
          title={t("frontend.textScaleTitle")}
          description={t("frontend.textScaleDescription")}
          icon={<TextSizeIcon size={18} />}
        >
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] p-1">
            {TEXT_SCALE_OPTIONS.map((scale) => {
              const active = textScale === scale;
              return (
                <button
                  key={scale}
                  type="button"
                  onClick={() => onTextScaleChange(scale)}
                  className={classNames(
                    "min-h-[40px] rounded-xl px-3 text-sm font-semibold transition-all",
                    active
                      ? "bg-[var(--glass-tab-bg-active)] text-[var(--color-text-primary)] shadow-sm"
                      : "text-[var(--color-text-tertiary)] hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)]",
                  )}
                  aria-pressed={active}
                >
                  {getTextScaleLabel(scale)}
                </button>
              );
            })}
          </div>
        </SettingRow>

        <SettingRow
          isDark={isDark}
          title={t("frontend.notificationSoundTitle")}
          description={t("frontend.notificationSoundDescription", { count: CHAT_NOTIFICATION_SOUND_OPTIONS.length })}
          icon={<BellIcon size={18} />}
        >
          <ChatNotificationSoundSwitcher
            preference={chatNotificationSound}
            onPreferenceChange={onChatNotificationSoundChange}
            onPreviewSound={onPreviewChatNotificationSound}
            variant="row"
            className="rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] p-1"
          />
        </SettingRow>

        <SettingRow
          isDark={isDark}
          title={t("frontend.languageTitle")}
          description={t("frontend.languageDescription")}
          icon={<GlobeIcon size={18} />}
        >
          <LanguageSwitcher
            isDark={isDark}
            variant="row"
            className="rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] p-1"
          />
        </SettingRow>
      </div>
    </div>
  );
}
