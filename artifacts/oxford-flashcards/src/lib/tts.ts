const ttsUrlCache = new Map<string, string>();

export function getTtsUrl(text: string, voice: "fable" = "fable"): string {
  const key = `${voice}::${text.trim()}`;
  let url = ttsUrlCache.get(key);
  if (!url) {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
    url = `${base}/api/tts?voice=${voice}&text=${encodeURIComponent(text.trim())}`;
    ttsUrlCache.set(key, url);
  }
  return url;
}

interface ActiveEntry {
  audio: HTMLAudioElement;
  onInterrupt: () => void;
}

let active: ActiveEntry | null = null;

export function setActiveTtsAudio(
  audio: HTMLAudioElement | null,
  onInterrupt?: () => void,
): void {
  if (active && active.audio !== audio) {
    const prev = active;
    active = null;
    prev.audio.pause();
    prev.audio.src = "";
    prev.onInterrupt();
  }
  if (audio) {
    active = { audio, onInterrupt: onInterrupt ?? (() => {}) };
  }
}

export function stopActiveTtsAudio(): void {
  if (active) {
    const prev = active;
    active = null;
    prev.audio.pause();
    prev.audio.src = "";
    prev.onInterrupt();
  }
}

export function getActiveTtsAudio(): HTMLAudioElement | null {
  return active?.audio ?? null;
}
