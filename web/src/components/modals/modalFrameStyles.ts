import { classNames } from "../../utils/classNames";

export type ModalFrameSize = "compact" | "standard" | "form" | "wide" | "workspace" | "fullscreen";
export type ModalFrameMobileMode = "fullscreen" | "sheet" | "centered";

const PANEL_SIZE_CLASS: Record<ModalFrameSize, string> = {
  compact: "sm:w-[min(440px,calc(100vw-2rem))] sm:h-auto sm:max-h-[calc(100dvh-2rem)]",
  standard: "sm:w-[min(560px,calc(100vw-2rem))] sm:h-auto sm:max-h-[min(84dvh,720px)]",
  form: "sm:w-[min(720px,calc(100vw-2rem))] sm:h-[min(88dvh,820px)]",
  wide: "sm:w-[min(880px,calc(100vw-2rem))] sm:h-[min(86dvh,760px)]",
  workspace: "sm:w-[min(1280px,calc(100vw-2rem))] sm:h-[min(90dvh,920px)]",
  fullscreen: "sm:w-screen sm:h-screen",
};

const PANEL_MOBILE_CLASS: Record<ModalFrameMobileMode, string> = {
  fullscreen: "h-full w-full rounded-none",
  sheet: "max-h-[86dvh] w-full rounded-t-3xl rounded-b-none",
  centered: "max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] rounded-2xl",
};

const VIEWPORT_MOBILE_CLASS: Record<ModalFrameMobileMode, string> = {
  fullscreen: "items-stretch p-0 sm:items-center sm:p-4",
  sheet: "items-end p-0 sm:items-center sm:p-4",
  centered: "items-center p-2 sm:p-4",
};

export function modalViewportClass(mobileMode: ModalFrameMobileMode = "fullscreen", className = "") {
  return classNames("fixed inset-0 z-50 flex justify-center", VIEWPORT_MOBILE_CLASS[mobileMode], className);
}

export function modalPanelSizeClass(size: ModalFrameSize = "form") {
  return PANEL_SIZE_CLASS[size];
}

export function modalPanelClass(
  size: ModalFrameSize | null = "form",
  mobileMode: ModalFrameMobileMode = "fullscreen",
  className = "",
) {
  return classNames(
    "relative flex flex-col overflow-hidden border border-[var(--glass-border-subtle)] shadow-2xl glass-modal",
    PANEL_MOBILE_CLASS[mobileMode],
    size ? PANEL_SIZE_CLASS[size] : "",
    "sm:rounded-2xl",
    className,
  );
}

export function settingsDialogPanelClassFromSize(size: Extract<ModalFrameSize, "wide" | "workspace"> = "wide") {
  return classNames(
    "glass-modal absolute inset-0 flex flex-col overflow-hidden rounded-none shadow-2xl",
    "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
    PANEL_SIZE_CLASS[size],
  );
}
