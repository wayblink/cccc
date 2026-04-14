import type { ChatNotificationSoundId } from "../types";
import {
  CHAT_NOTIFICATION_SOUND_IDS,
  getChatNotificationSoundUrl,
} from "./chatNotificationSound";

const chatNotificationAudioCache = new Map<ChatNotificationSoundId, HTMLAudioElement>();

function getOrCreateChatNotificationAudio(soundId: ChatNotificationSoundId): HTMLAudioElement | null {
  if (typeof Audio !== "function") return null;

  const cached = chatNotificationAudioCache.get(soundId);
  if (cached) return cached;

  const audio = new Audio(getChatNotificationSoundUrl(soundId));
  audio.preload = "auto";
  audio.load?.();
  chatNotificationAudioCache.set(soundId, audio);
  return audio;
}

export function primeChatNotificationSoundById(soundId: ChatNotificationSoundId): boolean {
  return getOrCreateChatNotificationAudio(soundId) !== null;
}

export function primeChatNotificationSounds(
  soundIds: readonly ChatNotificationSoundId[] = CHAT_NOTIFICATION_SOUND_IDS,
): number {
  let primedCount = 0;
  for (const soundId of soundIds) {
    if (primeChatNotificationSoundById(soundId)) {
      primedCount += 1;
    }
  }
  return primedCount;
}

export async function playChatNotificationSoundById(soundId: ChatNotificationSoundId): Promise<boolean> {
  const audio = getOrCreateChatNotificationAudio(soundId);
  if (!audio) return false;

  try {
    if (!audio.paused) {
      audio.pause?.();
    }
    try {
      audio.currentTime = 0;
    } catch {
      // Ignore eager seek failures before metadata is ready; play() will continue loading.
    }
    await audio.play();
    return true;
  } catch (error) {
    console.warn("Failed to play chat notification sound.", error);
    return false;
  }
}
