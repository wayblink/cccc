// Chat composer state store with per-group draft preservation.
import { create } from "zustand";
import type { PresentationMessageRef, ReplyTarget } from "../types";
import { parseChatSlotActorId, sanitizeChatSlotId, type ChatSlotId } from "./useUIStore";

export function getEffectiveComposerDestGroupId(
  destGroupId: string,
  activeGroupId: string,
  selectedGroupId: string
): string {
  const selected = String(selectedGroupId || "").trim();
  const active = String(activeGroupId || "").trim();
  const dest = String(destGroupId || "").trim();

  if (!selected) return dest;
  // 切组首帧 composer 可能仍挂在旧组，先避免把旧目标组带到新组。
  if (active !== selected) return selected;
  return dest || selected;
}

export interface ComposerDraft {
  composerText: string;
  composerFiles: File[];
  toText: string;
  replyTarget: ReplyTarget;
  quotedPresentationRef: PresentationMessageRef | null;
  priority: "normal" | "attention";
  replyRequired: boolean;
  destGroupId: string;
}

function normalizeGroupId(groupId: string | null | undefined): string {
  return String(groupId || "").trim();
}

function normalizeSlotId(slotId: ChatSlotId | string | null | undefined): ChatSlotId {
  return sanitizeChatSlotId(slotId);
}

export function buildComposerDraftKey(groupId: string, slotId: ChatSlotId = "all"): string {
  const gid = normalizeGroupId(groupId);
  const normalizedSlotId = normalizeSlotId(slotId);
  if (!gid) return "";
  return normalizedSlotId === "all" ? gid : `${gid}::${normalizedSlotId}`;
}

function createEmptyDraft(groupId: string, slotId: ChatSlotId): ComposerDraft {
  const actorId = parseChatSlotActorId(slotId);
  return {
    composerText: "",
    composerFiles: [],
    toText: actorId || "",
    replyTarget: null,
    quotedPresentationRef: null,
    priority: "normal",
    replyRequired: false,
    destGroupId: groupId,
  };
}

function normalizeDraftForSlot(draft: ComposerDraft, groupId: string, slotId: ChatSlotId): ComposerDraft {
  const actorId = parseChatSlotActorId(slotId);
  if (!actorId) {
    return {
      ...draft,
      destGroupId: normalizeGroupId(draft.destGroupId || groupId) || groupId,
    };
  }
  return {
    ...draft,
    toText: actorId,
    destGroupId: groupId,
  };
}

function hasMeaningfulDraft(draft: ComposerDraft, groupId: string, slotId: ChatSlotId): boolean {
  const actorId = parseChatSlotActorId(slotId);
  const trimmedToText = String(draft.toText || "").trim();
  const destGroupId = normalizeGroupId(draft.destGroupId || groupId) || groupId;
  return Boolean(
    String(draft.composerText || "").trim()
      || draft.composerFiles.length > 0
      || (trimmedToText && trimmedToText !== actorId)
      || draft.replyTarget
      || draft.quotedPresentationRef
      || draft.priority !== "normal"
      || draft.replyRequired
      || destGroupId !== groupId
  );
}

interface ComposerState {
  activeGroupId: string;
  activeSlotId: ChatSlotId;
  // Current active state
  composerText: string;
  composerFiles: File[];
  toText: string;
  replyTarget: ReplyTarget;
  quotedPresentationRef: PresentationMessageRef | null;
  priority: "normal" | "attention";
  replyRequired: boolean;
  destGroupId: string;

  // Drafts per group/slot (memory only)
  drafts: Record<string, ComposerDraft>;

  // Actions
  setComposerText: (text: string | ((prev: string) => string)) => void;
  setComposerFiles: (files: File[]) => void;
  appendComposerFiles: (files: File[]) => void;
  setToText: (text: string) => void;
  setReplyTarget: (target: ReplyTarget) => void;
  setQuotedPresentationRef: (ref: PresentationMessageRef | null) => void;
  setPriority: (priority: "normal" | "attention") => void;
  setReplyRequired: (value: boolean) => void;
  setDestGroupId: (groupId: string) => void;
  clearComposer: () => void;

  // Context switching: save current draft and load new group/slot draft
  switchContext: (
    fromGroupId: string | null,
    fromSlotId: ChatSlotId | null,
    toGroupId: string | null,
    toSlotId: ChatSlotId | null,
  ) => void;
  // Group switching compatibility wrapper.
  switchGroup: (fromGroupId: string | null, toGroupId: string | null) => void;
  upsertDraft: (
    groupId: string,
    updater: (draft: ComposerDraft | null) => ComposerDraft | null,
  ) => void;
  // Clear draft for the active slot unless one is provided.
  clearDraft: (groupId: string, slotId?: ChatSlotId | null) => void;
}

export const useComposerStore = create<ComposerState>((set, get) => ({
  activeGroupId: "",
  activeSlotId: "all",
  composerText: "",
  composerFiles: [],
  toText: "",
  replyTarget: null,
  quotedPresentationRef: null,
  priority: "normal",
  replyRequired: false,
  destGroupId: "",
  drafts: {},

  setComposerText: (text) =>
    set((state) => ({
      composerText: typeof text === "function" ? text(state.composerText) : text,
    })),
  setComposerFiles: (files) => set({ composerFiles: files }),

  appendComposerFiles: (files) =>
    set((state) => {
      const keyOf = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;
      const seen = new Set(state.composerFiles.map(keyOf));
      const next = state.composerFiles.slice();
      for (const f of files) {
        const k = keyOf(f);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(f);
        }
      }
      return { composerFiles: next };
    }),

  setToText: (text) => set({ toText: text }),
  setReplyTarget: (target) => set({ replyTarget: target }),
  setQuotedPresentationRef: (ref) => set({ quotedPresentationRef: ref }),
  setPriority: (priority) => set({ priority }),
  setReplyRequired: (value) => set({ replyRequired: !!value }),
  setDestGroupId: (groupId) => set({ destGroupId: normalizeGroupId(groupId) }),

  clearComposer: () =>
    set((state) => ({
      ...createEmptyDraft(state.activeGroupId, state.activeSlotId),
    })),

  switchContext: (fromGroupId, fromSlotId, toGroupId, toSlotId) => {
    const state = get();
    const normalizedFromGroupId = normalizeGroupId(fromGroupId);
    const normalizedToGroupId = normalizeGroupId(toGroupId);
    const normalizedFromSlotId = normalizeSlotId(fromSlotId || state.activeSlotId);
    const normalizedToSlotId = normalizeSlotId(toSlotId || "all");
    const drafts = { ...state.drafts };

    if (normalizedFromGroupId) {
      const fromDraftKey = buildComposerDraftKey(normalizedFromGroupId, normalizedFromSlotId);
      const fromDraft = normalizeDraftForSlot({
        composerText: state.composerText,
        composerFiles: state.composerFiles,
        toText: state.toText,
        replyTarget: state.replyTarget,
        quotedPresentationRef: state.quotedPresentationRef,
        priority: state.priority,
        replyRequired: state.replyRequired,
        destGroupId: normalizeGroupId(state.destGroupId || normalizedFromGroupId) || normalizedFromGroupId,
      }, normalizedFromGroupId, normalizedFromSlotId);

      if (hasMeaningfulDraft(fromDraft, normalizedFromGroupId, normalizedFromSlotId)) {
        drafts[fromDraftKey] = fromDraft;
      } else {
        delete drafts[fromDraftKey];
      }
    }

    const nextDraft = normalizedToGroupId
      ? normalizeDraftForSlot(
          drafts[buildComposerDraftKey(normalizedToGroupId, normalizedToSlotId)]
            || createEmptyDraft(normalizedToGroupId, normalizedToSlotId),
          normalizedToGroupId,
          normalizedToSlotId,
        )
      : createEmptyDraft("", normalizedToSlotId);

    set({
      activeGroupId: normalizedToGroupId,
      activeSlotId: normalizedToSlotId,
      drafts,
      composerText: nextDraft.composerText,
      composerFiles: nextDraft.composerFiles,
      toText: nextDraft.toText,
      replyTarget: nextDraft.replyTarget,
      quotedPresentationRef: nextDraft.quotedPresentationRef,
      priority: nextDraft.priority,
      replyRequired: nextDraft.replyRequired,
      destGroupId: nextDraft.destGroupId,
    });
  },

  switchGroup: (fromGroupId, toGroupId) => {
    get().switchContext(fromGroupId, get().activeSlotId, toGroupId, "all");
  },

  upsertDraft: (groupId, updater) =>
    set((state) => {
      const gid = normalizeGroupId(groupId);
      if (!gid) return state;
      const draftKey = buildComposerDraftKey(gid, "all");
      const nextDraft = updater(state.drafts[draftKey] || null);
      const drafts = { ...state.drafts };
      if (nextDraft) {
        drafts[draftKey] = normalizeDraftForSlot({
          ...nextDraft,
          destGroupId: normalizeGroupId(nextDraft.destGroupId || gid) || gid,
        }, gid, "all");
      } else {
        delete drafts[draftKey];
      }
      return { drafts };
    }),

  clearDraft: (groupId, slotId) => {
    const state = get();
    const gid = normalizeGroupId(groupId);
    if (!gid) return;
    const draftKey = buildComposerDraftKey(gid, normalizeSlotId(slotId || state.activeSlotId));
    const drafts = { ...state.drafts };
    delete drafts[draftKey];
    set({ drafts });
  },
}));
