import type { ChatNotificationSoundId } from "../types";
import {
  CHAT_NOTIFICATION_SOUND_IDS,
  getChatNotificationSoundUrl,
} from "./chatNotificationSound";

const chatNotificationAudioCache = new Map<ChatNotificationSoundId, HTMLAudioElement>();
const chatNotificationAudioWarmState = new Map<
  ChatNotificationSoundId,
  { promise: Promise<boolean>; token: symbol }
>();
const chatNotificationAudioBufferCache = new Map<ChatNotificationSoundId, AudioBuffer>();
const chatNotificationAudioBufferPromises = new Map<ChatNotificationSoundId, Promise<AudioBuffer | null>>();
const HAVE_ENOUGH_DATA = typeof HTMLMediaElement === "undefined"
  ? 4
  : HTMLMediaElement.HAVE_ENOUGH_DATA;

let chatNotificationAudioContext: AudioContext | null | undefined;

// Skip the measured leading silence so previews and live replies feel immediate.
const CHAT_NOTIFICATION_SOUND_CUE_POINTS: Record<ChatNotificationSoundId, number> = {
  "abstract-sound1": 0.033,
  "abstract-sound2": 0.403,
  "abstract-sound3": 0.04,
  "abstract-sound4": 0.044,
  "cow-mooing": 0.316,
  fahhhhh: 0.115,
  "phone-vibration": 0.073,
  rooster: 0.037,
};

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

function isChatNotificationAudioReady(audio: HTMLAudioElement): boolean {
  return Number(audio.readyState || 0) >= HAVE_ENOUGH_DATA;
}

function clearChatNotificationWarmState(soundId: ChatNotificationSoundId, token: symbol) {
  const current = chatNotificationAudioWarmState.get(soundId);
  if (current?.token === token) {
    chatNotificationAudioWarmState.delete(soundId);
  }
}

function getChatNotificationAudioCuePoint(soundId: ChatNotificationSoundId): number {
  return CHAT_NOTIFICATION_SOUND_CUE_POINTS[soundId] || 0;
}

function setChatNotificationAudioCuePoint(audio: HTMLAudioElement, soundId: ChatNotificationSoundId) {
  try {
    audio.currentTime = getChatNotificationAudioCuePoint(soundId);
  } catch {
    // Ignore seek failures before metadata is ready; play() will continue loading.
  }
}

function getChatNotificationAudioContextCtor(): (new () => AudioContext) | null {
  if (typeof window === "undefined") return null;
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: new () => AudioContext };
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function getOrCreateChatNotificationAudioContext(): AudioContext | null {
  if (chatNotificationAudioContext !== undefined) return chatNotificationAudioContext;

  const AudioContextCtor = getChatNotificationAudioContextCtor();
  chatNotificationAudioContext = AudioContextCtor ? new AudioContextCtor() : null;
  return chatNotificationAudioContext;
}

export async function resumeChatNotificationAudioContext(): Promise<boolean> {
  const context = getOrCreateChatNotificationAudioContext();
  if (!context) return false;
  if (context.state === "running") return true;

  try {
    await context.resume();
  } catch {
    return false;
  }
  return context.state !== "suspended";
}

async function loadChatNotificationAudioBuffer(soundId: ChatNotificationSoundId): Promise<AudioBuffer | null> {
  const cached = chatNotificationAudioBufferCache.get(soundId);
  if (cached) return cached;

  const existing = chatNotificationAudioBufferPromises.get(soundId);
  if (existing) return existing;

  const context = getOrCreateChatNotificationAudioContext();
  if (!context || typeof fetch !== "function") return null;

  const loadPromise = (async () => {
    try {
      const response = await fetch(getChatNotificationSoundUrl(soundId));
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
      chatNotificationAudioBufferCache.set(soundId, decoded);
      return decoded;
    } catch {
      return null;
    } finally {
      chatNotificationAudioBufferPromises.delete(soundId);
    }
  })();

  chatNotificationAudioBufferPromises.set(soundId, loadPromise);
  return loadPromise;
}

function getChatNotificationBufferOffset(soundId: ChatNotificationSoundId, duration: number): number {
  const cuePoint = getChatNotificationAudioCuePoint(soundId);
  return Math.min(cuePoint, Math.max(0, duration - 0.01));
}

function takeOverWarmChatNotificationAudio(soundId: ChatNotificationSoundId, audio: HTMLAudioElement): boolean {
  const currentWarm = chatNotificationAudioWarmState.get(soundId);
  if (!currentWarm) return false;

  clearChatNotificationWarmState(soundId, currentWarm.token);
  audio.muted = false;
  return true;
}

async function playChatNotificationSoundBuffer(soundId: ChatNotificationSoundId): Promise<boolean> {
  const resumed = await resumeChatNotificationAudioContext();
  if (!resumed) return false;

  const context = getOrCreateChatNotificationAudioContext();
  if (!context) return false;

  const buffer = chatNotificationAudioBufferCache.get(soundId) ?? await loadChatNotificationAudioBuffer(soundId);
  if (!buffer) return false;

  try {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0, getChatNotificationBufferOffset(soundId, buffer.duration));
    return true;
  } catch {
    return false;
  }
}

function warmChatNotificationSoundById(soundId: ChatNotificationSoundId): Promise<boolean> {
  const existingWarm = chatNotificationAudioWarmState.get(soundId);
  if (existingWarm) return existingWarm.promise;

  const audio = getOrCreateChatNotificationAudio(soundId);
  if (!audio) return Promise.resolve(false);
  if (isChatNotificationAudioReady(audio) || !audio.paused) return Promise.resolve(true);

  const token = Symbol(soundId);
  const warmPromise = (async () => {
    const previousMuted = audio.muted;
    try {
      audio.muted = true;
      await audio.play();
      return true;
    } catch {
      audio.load?.();
      return isChatNotificationAudioReady(audio);
    } finally {
      const stillWarm = chatNotificationAudioWarmState.get(soundId)?.token === token;
      if (stillWarm) {
        if (!audio.paused) {
          audio.pause?.();
        }
        try {
          audio.currentTime = 0;
        } catch {
          // Ignore eager seek failures before metadata is ready.
        }
        audio.muted = previousMuted;
        clearChatNotificationWarmState(soundId, token);
      }
    }
  })();

  chatNotificationAudioWarmState.set(soundId, { promise: warmPromise, token });
  return warmPromise;
}

export function primeChatNotificationSoundById(soundId: ChatNotificationSoundId): boolean {
  if (!getOrCreateChatNotificationAudio(soundId)) return false;
  void warmChatNotificationSoundById(soundId);
  void loadChatNotificationAudioBuffer(soundId);
  return true;
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
  if (await playChatNotificationSoundBuffer(soundId)) {
    return true;
  }

  const audio = getOrCreateChatNotificationAudio(soundId);
  if (!audio) return false;

  try {
    const tookOverWarmAudio = takeOverWarmChatNotificationAudio(soundId, audio);
    if (!tookOverWarmAudio && !audio.paused) {
      audio.pause?.();
    }
    setChatNotificationAudioCuePoint(audio, soundId);
    await audio.play();
    return true;
  } catch (error) {
    console.warn("Failed to play chat notification sound.", error);
    return false;
  }
}
