import { useState, useCallback } from "react";

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

export interface DictionaryResult {
  entry: DictionaryEntry | null;
  britishAudio: string | null;
  usAudio: string | null;
  phonetic: string | null;
  primaryExample: string | null;
  exampleAudio: string | null;
  partOfSpeech: string | null;
  loading: boolean;
  error: string | null;
}

const cache = new Map<string, DictionaryEntry | null>();

export function useDictionary() {
  const [result, setResult] = useState<DictionaryResult>({
    entry: null,
    britishAudio: null,
    usAudio: null,
    phonetic: null,
    primaryExample: null,
    exampleAudio: null,
    partOfSpeech: null,
    loading: false,
    error: null,
  });

  const lookup = useCallback(async (word: string) => {
    setResult((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let entry: DictionaryEntry | null = null;

      if (cache.has(word)) {
        entry = cache.get(word)!;
      } else {
        const res = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
        );
        if (res.ok) {
          const data: DictionaryEntry[] = await res.json();
          entry = data[0] ?? null;
        }
        cache.set(word, entry);
      }

      if (!entry) {
        setResult({
          entry: null,
          britishAudio: null,
          usAudio: null,
          phonetic: null,
          primaryExample: null,
          exampleAudio: null,
          partOfSpeech: null,
          loading: false,
          error: "Word not found",
        });
        return;
      }

      const phonetics = entry.phonetics ?? [];

      const britishPhonetic = phonetics.find(
        (p) => p.audio && (p.audio.includes("-gb") || p.audio.includes("-uk") || p.audio.includes("gb.mp3") || p.audio.includes("uk.mp3"))
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
      const primaryExample =
        allDefinitions.find((d) => d.example)?.example ?? null;

      const partOfSpeech = entry.meanings[0]?.partOfSpeech ?? null;

      setResult({
        entry,
        britishAudio,
        usAudio,
        phonetic,
        primaryExample,
        exampleAudio: null,
        partOfSpeech,
        loading: false,
        error: null,
      });
    } catch {
      setResult((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to fetch word data",
      }));
    }
  }, []);

  return { ...result, lookup };
}
