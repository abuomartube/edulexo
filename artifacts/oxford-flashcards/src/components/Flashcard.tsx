import { useState, useEffect, useRef, useCallback } from "react";
import { useDictionary } from "@/hooks/useDictionary";
import { useTranslation } from "@/hooks/useTranslation";
import { AudioButton } from "@/components/AudioButton";
import { LevelBadge } from "@/components/LevelBadge";
import type { OxfordWord } from "@/data/oxford-words";
import { levelColors } from "@/data/oxford-words";
import { Loader2, RefreshCw, Volume2 } from "lucide-react";

interface FlashcardProps {
  wordData: OxfordWord;
  onNext: () => void;
  onPrev: () => void;
  cardIndex: number;
  total: number;
}

function speakBritish(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  utterance.rate = 0.88;
  utterance.pitch = 1;

  const setVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const british =
      voices.find((v) => v.lang === "en-GB" && v.name.toLowerCase().includes("female")) ??
      voices.find((v) => v.lang === "en-GB") ??
      voices.find((v) => v.lang.startsWith("en"));
    if (british) utterance.voice = british;
    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    setVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = setVoice;
  }
}

function ExampleSpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    if (!("speechSynthesis" in window)) { setSpeaking(false); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    const go = () => {
      const voices = window.speechSynthesis.getVoices();
      const british =
        voices.find((v) => v.lang === "en-GB" && v.name.toLowerCase().includes("female")) ??
        voices.find((v) => v.lang === "en-GB") ??
        voices.find((v) => v.lang.startsWith("en"));
      if (british) utterance.voice = british;
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      go();
    } else {
      window.speechSynthesis.onvoiceschanged = go;
    }
  };

  return (
    <button
      onClick={handleSpeak}
      aria-label="Hear example sentence"
      className={`
        inline-flex items-center justify-center w-8 h-8 rounded-full
        transition-all duration-200 flex-shrink-0 mt-0.5
        ${speaking
          ? "bg-indigo-500 text-white scale-110"
          : "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 hover:scale-110 active:scale-95"
        }
      `}
    >
      {speaking ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Volume2 size={14} />
      )}
    </button>
  );
}

export function Flashcard({ wordData, onNext, onPrev, cardIndex, total }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const { word, level } = wordData;
  const colors = levelColors[level];

  const { lookup, britishAudio, usAudio, phonetic, primaryExample, partOfSpeech, loading, error } =
    useDictionary();
  const { translate, getTranslation, isLoading: translating } = useTranslation();

  const prevWordRef = useRef<string>("");

  useEffect(() => {
    if (prevWordRef.current === word) return;
    prevWordRef.current = word;
    setFlipped(false);
    setAnimating(false);
    lookup(word);
  }, [word, lookup]);

  useEffect(() => {
    if (flipped) {
      translate(word);
      if (primaryExample) translate(primaryExample);
    }
  }, [flipped, word, primaryExample, translate]);

  const handleFlip = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    setFlipped((f) => !f);
    setTimeout(() => setAnimating(false), 600);
  }, [animating]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.speechSynthesis?.cancel();
    setFlipped(false);
    setTimeout(onNext, 50);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.speechSynthesis?.cancel();
    setFlipped(false);
    setTimeout(onPrev, 50);
  };

  const wordTranslation = getTranslation(word);
  const exampleTranslation = primaryExample ? getTranslation(primaryExample) : null;
  const audioUrl = britishAudio ?? usAudio;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto select-none">
      <div className="flex items-center justify-between w-full px-1">
        <LevelBadge level={level} />
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 tabular-nums">
          {cardIndex + 1} / {total}
        </span>
      </div>

      <div
        className="w-full cursor-pointer"
        style={{ perspective: "1200px" }}
        onClick={handleFlip}
        role="button"
        aria-label={flipped ? "Click to see word" : "Click to reveal answer"}
      >
        <div
          className="relative w-full"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
            height: "380px",
          }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0 rounded-3xl shadow-2xl"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
              zIndex: flipped ? 0 : 1,
            }}
          >
            <div
              className={`w-full h-full rounded-3xl bg-gradient-to-br ${colors.bg} flex flex-col items-center justify-center p-8 relative`}
              style={{ borderRadius: "1.5rem" }}
            >
              <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/20 blur-xl" />
                <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-white/15 blur-xl" />
              </div>

              {loading ? (
                <Loader2 size={40} className="text-white/80 animate-spin" />
              ) : error ? (
                <div className="text-center z-10">
                  <p className="text-5xl font-bold text-white tracking-tight mb-3">{word}</p>
                  <p className="text-white/60 text-sm">Audio not available</p>
                </div>
              ) : (
                <div className="text-center z-10">
                  <p className="text-6xl font-bold text-white tracking-tight mb-4 drop-shadow-md">{word}</p>
                  {phonetic && (
                    <p className="text-white/80 text-xl font-light mb-4 italic">{phonetic}</p>
                  )}
                  {partOfSpeech && (
                    <p className="text-white/70 text-sm uppercase tracking-widest mb-5">{partOfSpeech}</p>
                  )}
                  <div className="flex items-center justify-center gap-3">
                    <AudioButton
                      url={audioUrl}
                      size="lg"
                      label={`Hear ${word}`}
                      className="!bg-white/20 hover:!bg-white/35 !text-white !border-none !shadow-none"
                    />
                    {britishAudio && (
                      <span className="text-white/70 text-xs font-medium bg-white/15 px-2 py-1 rounded-full">
                        British
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="absolute bottom-5 right-5 opacity-25 pointer-events-none">
                <RefreshCw size={22} className="text-white" />
              </div>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs tracking-wide">
                Tap to flip
              </p>
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 rounded-3xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              zIndex: flipped ? 1 : 0,
            }}
          >
            <div className="w-full h-full flex flex-col p-7 rounded-3xl overflow-y-auto">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`text-3xl font-bold ${colors.text} dark:text-white`}>{word}</h3>
                    <AudioButton url={audioUrl} size="sm" label={`Hear ${word}`} />
                  </div>
                  {phonetic && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">{phonetic}</p>
                  )}
                </div>
                <LevelBadge level={level} size="sm" />
              </div>

              <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 mb-2">
                  Arabic Translation
                </p>
                {wordTranslation ? (
                  <p
                    dir="rtl"
                    lang="ar"
                    className="text-2xl font-semibold text-gray-800 dark:text-gray-100 text-right leading-relaxed"
                    style={{ fontFamily: "'Cairo', 'Amiri', 'Noto Sans Arabic', sans-serif" }}
                  >
                    {wordTranslation}
                  </p>
                ) : translating(word) ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-sm">Translating…</span>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">Translation unavailable</p>
                )}
              </div>

              {primaryExample && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 mb-2">
                    Example
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-3">
                    <div className="flex items-start gap-3">
                      <p className="flex-1 text-gray-700 dark:text-gray-200 text-base leading-relaxed italic">
                        "{primaryExample}"
                      </p>
                      <ExampleSpeakButton text={primaryExample} />
                    </div>
                  </div>

                  <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 mb-2">
                    Arabic Translation
                  </p>
                  {exampleTranslation ? (
                    <p
                      dir="rtl"
                      lang="ar"
                      className="text-base text-gray-700 dark:text-gray-200 text-right leading-loose bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3"
                      style={{ fontFamily: "'Cairo', 'Amiri', 'Noto Sans Arabic', sans-serif" }}
                    >
                      {exampleTranslation}
                    </p>
                  ) : translating(primaryExample) ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">Translating…</span>
                    </div>
                  ) : null}
                </div>
              )}

              <p className="mt-auto pt-3 text-center text-gray-400 dark:text-gray-600 text-xs">
                Tap to flip back
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-2">
        <button
          onClick={handlePrev}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
        >
          ← Previous
        </button>

        <button
          onClick={handleFlip}
          className={`px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r ${colors.bg} hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg`}
        >
          {flipped ? "Show Word" : "Reveal Answer"}
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
