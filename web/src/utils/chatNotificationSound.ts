import type {
  ChatNotificationSoundId,
  ChatNotificationSoundOption,
  ChatNotificationSoundPreference,
} from "../types";

export const CHAT_NOTIFICATION_SOUND_STORAGE_KEY = "cccc-chat-notification-sound";

export const CHAT_NOTIFICATION_SOUND_IDS: readonly ChatNotificationSoundId[] = [
  "cow-mooing",
  "horse-neigh-3",
  "rooster",
  "phone-vibration",
  "drum-hit",
  "abstract-sound1",
  "duck-quack",
  "abstract-sound3",
  "abstract-sound4",
];

export const CHAT_NOTIFICATION_SOUND_OPTIONS: readonly ChatNotificationSoundOption[] = [
  { id: "cow-mooing", labelKey: "chatNotificationSoundOptionCowMooing" },
  { id: "horse-neigh-3", labelKey: "chatNotificationSoundOptionHorseNeigh" },
  { id: "rooster", labelKey: "chatNotificationSoundOptionRooster" },
  { id: "phone-vibration", labelKey: "chatNotificationSoundOptionPhoneVibration" },
  { id: "drum-hit", labelKey: "chatNotificationSoundOptionDrumHit" },
  { id: "abstract-sound1", labelKey: "chatNotificationSoundOptionAbstractSound1" },
  { id: "duck-quack", labelKey: "chatNotificationSoundOptionAbstractSound2" },
  { id: "abstract-sound3", labelKey: "chatNotificationSoundOptionAbstractSound3" },
  { id: "abstract-sound4", labelKey: "chatNotificationSoundOptionAbstractSound4" },
];

export const DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE: ChatNotificationSoundPreference = {
  enabled: true,
  soundId: "abstract-sound1",
};

function getStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function isChatNotificationSoundId(value: unknown): value is ChatNotificationSoundId {
  return CHAT_NOTIFICATION_SOUND_IDS.includes(String(value || "").trim() as ChatNotificationSoundId);
}

export function normalizeChatNotificationSoundId(value: unknown): ChatNotificationSoundId {
  return isChatNotificationSoundId(value)
    ? (String(value).trim() as ChatNotificationSoundId)
    : DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE.soundId;
}

export function getChatNotificationSoundOption(
  soundId: ChatNotificationSoundId | string | null | undefined,
): ChatNotificationSoundOption | null {
  const normalizedId = normalizeChatNotificationSoundId(soundId);
  return CHAT_NOTIFICATION_SOUND_OPTIONS.find((option) => option.id === normalizedId) || null;
}

export function normalizeChatNotificationSoundPreference(
  value: unknown,
): ChatNotificationSoundPreference {
  const record = value && typeof value === "object"
    ? (value as { enabled?: unknown; soundId?: unknown })
    : null;

  return {
    enabled: typeof record?.enabled === "boolean"
      ? record.enabled
      : DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE.enabled,
    soundId: normalizeChatNotificationSoundId(record?.soundId),
  };
}

export function readStoredChatNotificationSoundPreference(): ChatNotificationSoundPreference {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE };
  const rawValue = storage.getItem(CHAT_NOTIFICATION_SOUND_STORAGE_KEY);
  if (!rawValue) return { ...DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE };
  try {
    return normalizeChatNotificationSoundPreference(JSON.parse(rawValue));
  } catch {
    return { ...DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE };
  }
}

export function writeStoredChatNotificationSoundPreference(value: unknown): ChatNotificationSoundPreference {
  const normalized = normalizeChatNotificationSoundPreference(value);
  const storage = getStorage();
  if (storage) {
    storage.setItem(CHAT_NOTIFICATION_SOUND_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function getChatNotificationSoundUrl(soundId: ChatNotificationSoundId): string {
  return `${import.meta.env.BASE_URL}sounds/${normalizeChatNotificationSoundId(soundId)}.wav`;
}
