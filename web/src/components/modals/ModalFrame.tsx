import type { ReactNode, Ref } from "react";
import { classNames } from "../../utils/classNames";
import { CloseIcon } from "../Icons";
import {
  modalPanelClass,
  modalViewportClass,
  type ModalFrameMobileMode,
  type ModalFrameSize,
} from "./modalFrameStyles";

interface ModalFrameProps {
  isOpen?: boolean;
  isDark: boolean;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  closeAriaLabel: string;
  size?: ModalFrameSize | null;
  mobileMode?: ModalFrameMobileMode;
  panelClassName?: string;
  viewportClassName?: string;
  headerActions?: ReactNode;
  modalRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

export function ModalFrame({
  isOpen = true,
  isDark,
  onClose,
  titleId,
  title,
  closeAriaLabel,
  size = null,
  mobileMode = "fullscreen",
  panelClassName,
  viewportClassName,
  headerActions,
  modalRef,
  children,
}: ModalFrameProps) {
  const hasHeaderContent = !!(title || headerActions);
  return (
    <div
      className={classNames(
        modalViewportClass(mobileMode, viewportClassName),
        "transition-[opacity,visibility] duration-200",
        isOpen ? "visible opacity-100 animate-fade-in" : "pointer-events-none invisible opacity-0",
      )}
      style={isOpen ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } : undefined}
      aria-hidden={isOpen ? undefined : true}
    >
      <div
        className={`absolute inset-0 glass-overlay transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onPointerDown={isOpen ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        className={classNames(
          modalPanelClass(size, mobileMode, panelClassName),
          "transition-[opacity,transform] duration-200",
          isOpen ? "opacity-100 animate-scale-in" : "pointer-events-none translate-y-2 scale-[0.985] opacity-0",
        )}
        ref={modalRef}
        role="dialog"
        aria-modal={isOpen ? "true" : undefined}
        aria-labelledby={titleId}
      >
        {hasHeaderContent ? (
          <div
            className={`flex flex-shrink-0 items-start justify-between gap-4 border-b px-5 py-4 safe-area-inset-top sm:px-6 sm:py-5 border-[var(--glass-border-subtle)] ${
              isDark
                ? "bg-[linear-gradient(180deg,rgba(24,26,31,0.96),rgba(16,18,22,0.9))]"
                : "bg-[linear-gradient(180deg,rgba(255,255,255,0.995),rgba(246,248,251,0.96))]"
            }`}
          >
            <div id={titleId} className="min-w-0 flex-1 pr-3">
              {title}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {headerActions}
              <button
                onClick={onClose}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[var(--glass-border-subtle)] text-lg leading-none text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)] ${
                  isDark
                    ? "bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
                    : "bg-[rgba(255,255,255,0.88)] hover:bg-[rgba(255,255,255,0.98)]"
                }`}
                aria-label={closeAriaLabel}
              >
                <CloseIcon size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
            <button
              onClick={onClose}
              className="text-xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors glass-btn text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              aria-label={closeAriaLabel}
            >
              <CloseIcon size={18} />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
