import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import type {
  ChatNotificationSoundId,
  ChatNotificationSoundPreference,
} from "../types";
import { classNames } from "../utils/classNames";
import {
  CHAT_NOTIFICATION_SOUND_OPTIONS,
  getChatNotificationSoundOption,
} from "../utils/chatNotificationSound";
import { BellIcon } from "./Icons";

interface ChatNotificationSoundSwitcherProps {
  preference: ChatNotificationSoundPreference;
  onPreferenceChange: (preference: ChatNotificationSoundPreference) => void;
  onPreviewSound: (soundId: ChatNotificationSoundId) => void | Promise<unknown>;
  variant?: "rail" | "row";
  className?: string;
}

export function ChatNotificationSoundSwitcher({
  preference,
  onPreferenceChange,
  onPreviewSound,
  variant = "rail",
  className,
}: ChatNotificationSoundSwitcherProps) {
  const { t } = useTranslation("layout");
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isRow = variant === "row";
  const currentOption = getChatNotificationSoundOption(preference.soundId);
  const statusLabel = preference.enabled
    ? t("chatNotificationSoundEnabled")
    : t("chatNotificationSoundDisabled");
  const soundLabel = currentOption ? t(currentOption.labelKey) : preference.soundId;
  const summaryLabel = t("chatNotificationSoundSummary", {
    status: statusLabel,
    sound: soundLabel,
  });
  const rowValueLabel = preference.enabled ? soundLabel : statusLabel;
  const triggerLabel = `${t("chatNotificationSoundLabel")}: ${summaryLabel}`;

  const close = useCallback(() => setIsOpen(false), []);
  const toggleOpen = useCallback(() => setIsOpen((value) => !value), []);

  useEffect(() => {
    if (!isOpen || isRow || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = Math.min(300, window.innerWidth - 16);
    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 8,
      right: Math.max(window.innerWidth - rect.right, 8),
      width: panelWidth,
    });
  }, [isOpen, isRow]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  const soundButtons = useMemo(() => {
    return CHAT_NOTIFICATION_SOUND_OPTIONS.map((option) => {
      const selected = option.id === preference.soundId;
      return (
        <button
          key={option.id}
          type="button"
          onClick={() => {
            onPreferenceChange({
              ...preference,
              soundId: option.id,
            });
            void onPreviewSound(option.id);
          }}
          className={classNames(
            "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
            selected
              ? "border-[var(--color-accent,#111827)] bg-black/[0.04] text-[var(--color-text-primary)] dark:bg-white/[0.08]"
              : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--glass-border-subtle)] hover:bg-black/[0.03] hover:text-[var(--color-text-primary)] dark:hover:bg-white/[0.06]",
          )}
          aria-pressed={selected}
        >
          <span className="truncate">{t(option.labelKey)}</span>
          <span
            className={classNames(
              "h-2.5 w-2.5 shrink-0 rounded-full transition-opacity",
              selected ? "bg-[var(--color-text-primary)] opacity-100" : "bg-[var(--color-text-tertiary)] opacity-25",
            )}
            aria-hidden="true"
          />
        </button>
      );
    });
  }, [onPreferenceChange, onPreviewSound, preference, t]);

  const panel = (
    <div
      ref={panelRef}
      className={classNames(
        "rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--glass-panel-bg)] p-3 shadow-lg backdrop-blur-xl",
        !isRow && "glass-modal animate-scale-in origin-top-right",
      )}
      style={isRow ? undefined : panelStyle}
      role="dialog"
      aria-label={t("chatNotificationSoundLabel")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t("chatNotificationSoundLabel")}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {summaryLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onPreferenceChange({
              ...preference,
              enabled: !preference.enabled,
            });
          }}
          className={classNames(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            preference.enabled
              ? "bg-[var(--color-text-primary)]/10 text-[var(--color-text-primary)]"
              : "bg-black/[0.05] text-[var(--color-text-tertiary)] dark:bg-white/[0.08]",
          )}
          aria-pressed={preference.enabled}
        >
          {statusLabel}
        </button>
      </div>

      <div className="mt-3 text-[11px] text-[var(--color-text-tertiary)]">
        {t("chatNotificationSoundSelectHint")}
      </div>

      <div className="mt-3 grid gap-1.5">
        {soundButtons}
      </div>
    </div>
  );

  if (isRow) {
    return (
      <div className={classNames("w-full", className)}>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleOpen}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-sm min-h-[48px] text-[var(--color-text-primary)] transition-all hover:bg-black/5 dark:hover:bg-white/6"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={triggerLabel}
        >
          <span className="flex min-w-0 items-center gap-3 truncate font-medium">
            <BellIcon size={19} className={!preference.enabled ? "opacity-60" : undefined} />
            <span className="truncate">{t("chatNotificationSoundLabel")}</span>
          </span>
          <span className="truncate text-[13px] font-medium text-[var(--color-text-tertiary)]">
            {rowValueLabel}
          </span>
        </button>
        {isOpen ? (
          <div className="mt-2 px-1">
            {panel}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={classNames(
          "flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-[14px] border border-transparent bg-transparent text-[var(--color-text-secondary)] transition-all hover:bg-[var(--glass-tab-bg-hover)] hover:text-[var(--color-text-primary)]",
          className,
        )}
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <BellIcon size={17} className={!preference.enabled ? "opacity-60" : undefined} />
      </button>
      {isOpen ? createPortal(panel, document.body) : null}
    </>
  );
}
