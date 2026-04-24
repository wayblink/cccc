import React from "react";
import { useTranslation, Trans } from "react-i18next";

import { cardClass, inputClass, labelClass, primaryButtonClass } from "./types";

interface MessagingTabProps {
  isDark: boolean;
  busy: boolean;
  agentLinkMode: "connected" | "isolated";
  setAgentLinkMode: (v: "connected" | "isolated") => void;
  supportsDefaultSendTo?: boolean;
  defaultSendTo: "foreman" | "broadcast";
  setDefaultSendTo: (v: "foreman" | "broadcast") => void;
  onSave: () => void;
}

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
);

export function MessagingTab(props: MessagingTabProps) {
  const {
    isDark,
    busy,
    agentLinkMode,
    setAgentLinkMode,
    supportsDefaultSendTo = true,
    defaultSendTo,
    setDefaultSendTo,
    onSave,
  } = props;
  const { t } = useTranslation("settings");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">{t("messaging.title")}</h3>
        <p className="text-xs mt-1 text-[var(--color-text-muted)]">
          {t("messaging.description")}
        </p>
      </div>

      <div className={cardClass()}>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            <MessageSquareIcon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("messaging.linkModeTitle")}</h3>
        </div>
        <p className="text-xs ml-9 mb-4 text-[var(--color-text-muted)]">
          {t("messaging.linkModeDescription")}
        </p>

        <div className="ml-1 grid gap-2 sm:grid-cols-2">
          {(["connected", "isolated"] as const).map((mode) => {
            const selected = agentLinkMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setAgentLinkMode(mode)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]"
                    : "border-[var(--glass-border-subtle)] bg-[var(--glass-panel-bg)] hover:bg-[var(--glass-panel-bg-hover)]"
                }`}
              >
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  {mode === "connected" ? t("messaging.linkModeConnected") : t("messaging.linkModeIsolated")}
                </div>
                <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                  {mode === "connected" ? t("messaging.linkModeConnectedHint") : t("messaging.linkModeIsolatedHint")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={cardClass()}>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            <MessageSquareIcon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("messaging.defaultRecipient")}</h3>
        </div>
        {supportsDefaultSendTo ? (
          <>
            <p className="text-xs ml-9 mb-4 text-[var(--color-text-muted)]">
              <Trans i18nKey="messaging.defaultRecipientDescription" ns="settings" components={[<span className="font-mono" />]} />
            </p>

            <div className="ml-1">
              <label className={labelClass(isDark)}>{t("messaging.whenNoRecipients")}</label>
              <select
                value={defaultSendTo}
                onChange={(e) => setDefaultSendTo((e.target.value as "foreman" | "broadcast") || "foreman")}
                className={`${inputClass(isDark)} cursor-pointer`}
              >
                <option value="foreman">{t("messaging.foremanOnly")}</option>
                <option value="broadcast">{t("messaging.broadcastAll")}</option>
              </select>
              <div className="mt-2 text-[11px] leading-snug text-[var(--color-text-muted)]">
                {t("messaging.tip")}
              </div>
            </div>
          </>
        ) : (
          <div className="ml-9 rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-panel-bg)] px-3 py-3 text-xs leading-5 text-[var(--color-text-muted)]">
            {t("messaging.isolatedHint", {
              defaultValue: "Isolated groups do not auto-route empty recipients. Choose one or more agents explicitly when sending messages.",
            })}
          </div>
        )}
      </div>

      <div className="pt-2">
        <button onClick={onSave} disabled={busy} className={primaryButtonClass(busy)}>
          {busy ? (
            t("common:saving")
          ) : (
            <span className="flex items-center gap-2">
              <MessageSquareIcon className="w-4 h-4" /> {t("messaging.saveMessaging")}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
