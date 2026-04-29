import { useTranslation } from "react-i18next";
import { classNames } from "../../utils/classNames";
import { useModalA11y } from "../../hooks/useModalA11y";
import { modalPanelClass, modalViewportClass, type ModalFrameMobileMode } from "./modalFrameStyles";

export type RecipientEntry = readonly [string, boolean];

export interface RecipientsModalProps {
  isOpen: boolean;
  isSmallScreen: boolean;
  toLabel: string;
  statusKind: "read" | "ack" | "reply";
  entries: RecipientEntry[];
  onClose: () => void;
}

export function RecipientsModal({ isOpen, isSmallScreen, toLabel, statusKind, entries, onClose }: RecipientsModalProps) {
  const { t } = useTranslation("modals");
  const { modalRef } = useModalA11y(isOpen, onClose);
  if (!isOpen) return null;

  const isAck = statusKind === "ack";
  const isReply = statusKind === "reply";
  const title = isReply ? t("recipients.replyStatus") : isAck ? t("recipients.acknowledgements") : t("recipients.recipients");
  const mobileMode: ModalFrameMobileMode = isSmallScreen ? "sheet" : "centered";

  return (
    <div
      className={modalViewportClass(mobileMode, "animate-fade-in")}
      role="dialog"
      aria-modal="true"
      aria-label={t("recipients.recipientStatusAria")}
    >
      <div className="absolute inset-0 glass-overlay" onPointerDown={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        className={classNames(
          modalPanelClass("compact", mobileMode),
          isSmallScreen ? "animate-slide-up safe-area-inset-bottom" : "animate-scale-in",
          "text-[var(--color-text-primary)]"
        )}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3 border-[var(--glass-border-subtle)]">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate text-[var(--color-text-primary)]">{title}</div>
            <div className="text-[11px] truncate text-[var(--color-text-muted)]" title={t("recipients.toLabel", { label: toLabel })}>
              {t("recipients.toLabel", { label: toLabel })}
            </div>
          </div>
          <button
            type="button"
            className="touch-target-sm min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-tab-bg-hover)]"
            onClick={onClose}
            aria-label={t("common:close")}
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-auto max-h-[70vh]">
          {entries.length > 0 ? (
            <div className="rounded-xl border divide-y border-[var(--glass-border-subtle)] divide-[var(--glass-border-subtle)] bg-[var(--glass-panel-bg)]">
              {entries.map(([id, cleared]) => (
                <div key={id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="text-sm font-medium truncate text-[var(--color-text-primary)]">{id}</div>
                  <div
                    className={classNames(
                      "text-sm font-semibold tracking-tight",
                      cleared ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--color-text-muted)]"
                    )}
                    aria-label={cleared ? (isReply ? "replied" : isAck ? "acknowledged" : "read") : "pending"}
                  >
                    {isReply ? (cleared ? "↩" : "○") : isAck ? (cleared ? "✓" : "○") : cleared ? "✓✓" : "✓"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm py-6 text-center text-[var(--color-text-muted)]">{t("recipients.noTracking")}</div>
          )}

          <div className="text-[11px] mt-3 text-[var(--color-text-muted)]">
            {isReply
              ? t("recipients.legendReply")
              : isAck
                ? t("recipients.legendAck")
                : t("recipients.legendRead")}
          </div>
        </div>
      </div>
    </div>
  );
}
