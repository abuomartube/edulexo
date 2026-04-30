import { useState, useCallback, useEffect, useRef } from "react";

export interface Phonetic {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: { name: string; url: string };
}

export interface Definition {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  license?: { name: string; url: string };
  sourceUrls?: string[];
}

export interface ProcessedEntry {
  entry: DictionaryEntry | null;
  britishAudio: string | null;
  usAudio: string | null;
  phonetic: string | null;
  primaryExample: string | null;
  partOfSpeech: string | null;
}

const dataCache = new Map<string, ProcessedEntry>();
const inflight = new Map<string, Promise<ProcessedEntry>>();
const audioCache = new Map<string, HTMLAudioElement>();

function processEntry(entry: DictionaryEntry | null): ProcessedEntry {
  if (!entry) {
    return {
      entry: null,
      britishAudio: null,
      usAudio: null,
      phonetic: null,
      primaryExample: null,
      partOfSpeech: null,
    };
  }

  const phonetics = entry.phonetics ?? [];
  const britishPhonetic = phonetics.find(
    (p) =>
      p.audio &&
      (p.audio.includes("-gb") || p.audio.includes("-uk") || p.audio.includes("gb.mp3") || p.audio.includes("uk.mp3"))
  );
  const usPhonetic = phonetics.find(
    (p) => p.audio && (p.audio.includes("-us") || p.audio.includes("us.mp3"))
  );
  const anyAudioPhonetic = phonetics.find((p) => p.audio);

  const britishAudio = britishPhonetic?.audio ?? null;
  const usAudio = usPhonetic?.audio ?? anyAudioPhonetic?.audio ?? null;

  const phonetic =
    britishPhonetic?.text ??
    usPhonetic?.text ??
    phonetics.find((p) => p.text)?.text ??
    entry.phonetic ??
    null;

  const allDefinitions = entry.meanings.flatMap((m) => m.definitions);
  const primaryExample = allDefinitions.find((d) => d.example)?.example ?? null;
  const partOfSpeech = entry.meanings[0]?.partOfSpeech ?? null;

  return { entry, britishAudio, usAudio, phonetic, primaryExample, partOfSpeech };
}

function preloadAudio(url: string | null): HTMLAudioElement | null {
  if (!url) return null;
  if (audioCache.has(url)) return audioCache.get(url)!;
  const audio = new Audio();
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  audio.src = url;
  audio.load();
  audioCache.set(url, audio);
  return audio;
}

async function fetchWord(word: string): Promise<ProcessedEntry> {
  if (dataCache.has(word)) return dataCache.get(word)!;
  if (inflight.has(word)) return inflight.get(word)!;

  const promise = (async () => {
    let processed: ProcessedEntry;
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );
      if (res.ok) {
        const data: DictionaryEntry[] = await res.json();
        processed = processEntry(data[0] ?? null);
      } else {
        processed = processEntry(null);
      }
    } catch {
      processed = processEntry(null);
    }
    dataCache.set(word, processed);
    inflight.delete(word);
    preloadAudio(processed.britishAudio ?? processed.usAudio);
    return processed;
  })();

  inflight.set(word, promise);
  return promise;
}

export function prefetchWord(word: string): void {
  void fetchWord(word);
}

export function getPreloadedAudio(url: string | null): HTMLAudioElement | null {
  return preloadAudio(url);
}

export interface DictionaryResult extends ProcessedEntry {
  loading: boolean;
  error: string | null;
}

export function useDictionary() {
  const [result, setResult] = useState<DictionaryResult>({
    entry: null,
    britishAudio: null,
    usAudio: null,
    phonetic: null,
    primaryExample: null,
    partOfSpeech: null,
    loading: false,
    error: null,
  });

  const reqRef = useRef(0);

  const lookup = useCallback(async (word: string) => {
    const id = ++reqRef.current;

    if (dataCache.has(word)) {
      const processed = dataCache.get(word)!;
      preloadAudio(processed.britishAudio ?? processed.usAudio);
      setResult({ ...processed, loading: false, error: processed.entry ? null : "Word not found" });
      return;
    }

    setResult((prev) => ({ ...prev, loading: true, error: null }));
    const processed = await fetchWord(word);
    if (id !== reqRef.current) return;
    setResult({
      ...processed,
      loading: false,
      error: processed.entry ? null : "Word not found",
    });
  }, []);

  useEffect(() => {
    return () => {
      reqRef.current++;
    };
  }, []);

  return { ...result, lookup };
}
