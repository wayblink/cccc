import { describe, expect, it } from "vitest";

import {
  modalPanelClass,
  modalViewportClass,
  settingsDialogPanelClassFromSize,
} from "../../../src/components/modals/modalFrameStyles";

describe("modalFrameStyles", () => {
  it("maps modal size variants to stable desktop dimensions", () => {
    expect(modalPanelClass("compact")).toContain("sm:w-[min(440px,calc(100vw-2rem))]");
    expect(modalPanelClass("standard")).toContain("sm:w-[min(560px,calc(100vw-2rem))]");
    expect(modalPanelClass("form")).toContain("sm:w-[min(720px,calc(100vw-2rem))]");
    expect(modalPanelClass("wide")).toContain("sm:w-[min(880px,calc(100vw-2rem))]");
    expect(modalPanelClass("workspace")).toContain("sm:w-[min(1280px,calc(100vw-2rem))]");
    expect(modalPanelClass("workspace")).toContain("sm:h-[min(90dvh,920px)]");
  });

  it("keeps mobile sheet and fullscreen behavior explicit", () => {
    expect(modalViewportClass("sheet")).toContain("items-end");
    expect(modalPanelClass("wide", "sheet")).toContain("rounded-t-3xl");
    expect(modalPanelClass("form", "fullscreen")).toContain("h-full");
    expect(modalPanelClass("form", "centered")).toContain("max-h-[calc(100dvh-1rem)]");
  });

  it("shares the same sizing tokens with settings child dialogs", () => {
    expect(settingsDialogPanelClassFromSize("wide")).toContain("sm:w-[min(880px,calc(100vw-2rem))]");
    expect(settingsDialogPanelClassFromSize("workspace")).toContain("sm:w-[min(1280px,calc(100vw-2rem))]");
  });
});
