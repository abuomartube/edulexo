import { useState, useCallback, useMemo, useEffect } from "react";
import { allWords, oxfordWordsByLevel } from "@/features/flashcards/data/oxford-words";
import type { CEFRLevel, OxfordWord } from "@/features/flashcards/data/oxford-words";
import { wordFamilies, levelOfWord } from "@/features/flashcards/data/word-families";
import { Flashcard } from "@/features/flashcards/components/Flashcard";
import { FilterBar } from "@/features/flashcards/components/FilterBar";
import { WordFamilies } from "@/features/flashcards/components/WordFamilies";
import { useTheme } from "@/features/flashcards/hooks/useTheme";
import {
  Moon,
  Sun,
  GraduationCap,
  Layers,
  Sparkles,
  ArrowLeft,
  Lock,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import lexoLogo from "@/features/flashcards/assets/lexo-english.png";
import { prefetchTts, warmTtsBatch } from "@/features/flashcards/utils/tts";

type ViewMode = "levels" | "families";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface AccessState {
  loading: boolean;
  forbidden: boolean;
  allowedLevels: CEFRLevel[];
  error: string | null;
}

export default function FlashcardApp() {
  const { theme, toggle } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>("levels");

  const [access, setAccess] = useState<AccessState>({
    loading: true,
    forbidden: false,
    allowedLevels: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/english/mentor/flashcards/access", {
          credentials: "include",
        });
        if (cancelled) return;
        if (res.status === 403) {
          setAccess({ loading: false, forbidden: true, allowedLevels: [], error: null });
          return;
        }
        if (!res.ok) {
          setAccess({
            loading: false,
            forbidden: false,
            allowedLevels: [],
            error: "Failed to load",
          });
          return;
        }
        const data = (await res.json()) as { allowedLevels: CEFRLevel[] };
        const allowed = (data.allowedLevels ?? []).filter((l): l is CEFRLevel =>
          ["A1", "A2", "B1", "B2"].includes(l),
        );
        setAccess({
          loading: false,
          forbidden: allowed.length === 0,
          allowedLevels: allowed,
          error: null,
        });
      } catch {
        if (!cancelled) {
          setAccess({
            loading: false,
            forbidden: false,
            allowedLevels: [],
            error: "Network error",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allowedSet = useMemo(
    () => new Set(access.allowedLevels),
    [access.allowedLevels],
  );

  const initialLevel: CEFRLevel | "all" = useMemo(() => {
    if (access.allowedLevels.length === 0) return "all";
    return access.allowedLevels[0]!;
  }, [access.allowedLevels]);

  // Levels view state
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | "all">("all");
  const [cardIndex, setCardIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  useEffect(() => {
    if (!access.loading && !access.forbidden) {
      setSelectedLevel(initialLevel);
      setCardIndex(0);
      setIsShuffled(false);
    }
  }, [access.loading, access.forbidden, initialLevel]);

  // Families view state
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [familyCardIndex, setFamilyCardIndex] = useState(0);

  const selectedFamily = useMemo(
    () => wordFamilies.find((f) => f.id === selectedFamilyId) ?? null,
    [selectedFamilyId],
  );

  const filteredWords = useMemo<OxfordWord[]>(() => {
    if (selectedLevel === "all") {
      return allWords.filter((w) => allowedSet.has(w.level));
    }
    if (!allowedSet.has(selectedLevel)) return [];
    return oxfordWordsByLevel[selectedLevel].map((word) => ({
      word,
      level: selectedLevel,
    }));
  }, [selectedLevel, allowedSet]);

  const displayWords = useMemo<OxfordWord[]>(() => {
    if (isShuffled && shuffledIndices.length === filteredWords.length) {
      return shuffledIndices.map((i) => filteredWords[i]);
    }
    return filteredWords;
  }, [filteredWords, isShuffled, shuffledIndices]);

  const familyWords = useMemo<OxfordWord[]>(() => {
    if (!selectedFamily) return [];
    return selectedFamily.words
      .map((word) => ({ word, level: levelOfWord(word) }))
      .filter((w) => allowedSet.has(w.level));
  }, [selectedFamily, allowedSet]);

  const isFamilyDeck = viewMode === "families" && selectedFamily !== null;
  const activeDeck: OxfordWord[] = isFamilyDeck ? familyWords : displayWords;
  const activeIndex = isFamilyDeck ? familyCardIndex : cardIndex;
  const currentWord = activeDeck[Math.min(activeIndex, activeDeck.length - 1)];

  useEffect(() => {
    if (!activeDeck.length) return;
    const safeIdx = Math.min(activeIndex, activeDeck.length - 1);
    const len = activeDeck.length;
    const nextIdx = (safeIdx + 1) % len;
    const prevIdx = (safeIdx - 1 + len) % len;
    prefetchTts(activeDeck[safeIdx]?.word);
    prefetchTts(activeDeck[nextIdx]?.word);
    prefetchTts(activeDeck[prevIdx]?.word);

    const lookahead: string[] = [];
    const cap = Math.min(30, len);
    for (let off = 2; off <= cap; off++) {
      const w = activeDeck[(safeIdx + off) % len]?.word;
      if (w) lookahead.push(w);
    }
    if (lookahead.length) warmTtsBatch(lookahead);
  }, [activeIndex, activeDeck]);

  const handleLevelChange = useCallback(
    (level: CEFRLevel | "all") => {
      if (level !== "all" && !allowedSet.has(level)) return;
      setSelectedLevel(level);
      setCardIndex(0);
      setIsShuffled(false);
    },
    [allowedSet],
  );

  const handleShuffle = useCallback(() => {
    const indices = shuffle(
      Array.from({ length: filteredWords.length }, (_, i) => i),
    );
    setShuffledIndices(indices);
    setIsShuffled(true);
    setCardIndex(0);
  }, [filteredWords.length]);

  const handleNext = useCallback(() => {
    if (isFamilyDeck) {
      setFamilyCardIndex((i) => (i + 1) % familyWords.length);
    } else {
      setCardIndex((i) => (i + 1) % displayWords.length);
    }
  }, [isFamilyDeck, familyWords.length, displayWords.length]);

  const handlePrev = useCallback(() => {
    if (isFamilyDeck) {
      setFamilyCardIndex(
        (i) => (i - 1 + familyWords.length) % familyWords.length,
      );
    } else {
      setCardIndex((i) => (i - 1 + displayWords.length) % displayWords.length);
    }
  }, [isFamilyDeck, familyWords.length, displayWords.length]);

  const handleSelectFamily = useCallback((id: string) => {
    setSelectedFamilyId(id);
    setFamilyCardIndex(0);
  }, []);

  const handleBackToFamilies = useCallback(() => {
    setSelectedFamilyId(null);
    setFamilyCardIndex(0);
  }, []);

  const handleSwitchView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setSelectedFamilyId(null);
    setFamilyCardIndex(0);
  }, []);

  const levelStats = useMemo(
    () => ({
      A1: oxfordWordsByLevel.A1.length,
      A2: oxfordWordsByLevel.A2.length,
      B1: oxfordWordsByLevel.B1.length,
      B2: oxfordWordsByLevel.B2.length,
    }),
    [],
  );

  if (access.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-orange-50/40 dark:from-gray-950 dark:via-violet-950/40 dark:to-gray-950">
        <div className="flex items-center gap-3 text-violet-600 dark:text-violet-300">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">Loading flashcards…</span>
        </div>
      </div>
    );
  }

  if (access.forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-orange-50/40 dark:from-gray-950 dark:via-violet-950/40 dark:to-gray-950 px-6">
        <div className="max-w-md text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 shadow-md">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-300">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
            Flashcards locked
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You need an active LEXO for English package to access flashcards.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-semibold shadow hover:shadow-md transition"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (access.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-orange-50/40 dark:from-gray-950 dark:via-violet-950/40 dark:to-gray-950 px-6">
        <div className="max-w-md text-center text-sm text-red-600 dark:text-red-300">
          Failed to load flashcards: {access.error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-orange-50/40 dark:from-gray-950 dark:via-violet-950/40 dark:to-gray-950 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 py-6 min-h-screen flex flex-col">
        <header className="flex items-center justify-between mb-6">
          <Link
            href="/tools"
            className="flex items-center gap-3 group"
            aria-label="Back to Mentor tools"
          >
            <img
              src={lexoLogo}
              alt="Lexo for English logo"
              className="w-12 h-12 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
            <div className="leading-tight">
              <h1 className="text-xl font-extrabold tracking-tight">
                <span className="text-gray-900 dark:text-white">LEXO </span>
                <span className="text-gray-500 dark:text-gray-400 font-semibold">
                  for{" "}
                </span>
                <span className="bg-gradient-to-r from-violet-600 to-purple-700 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                  English
                </span>
              </h1>
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-orange-500 dark:text-amber-400 mt-0.5">
                Learn · Practice · Excel
              </p>
            </div>
          </Link>

          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/60 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        {/* View-mode toggle: Levels / Families */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => handleSwitchView("levels")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                ${
                  viewMode === "levels"
                    ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                }`}
            >
              <Layers size={16} />
              Levels
            </button>
            <button
              onClick={() => handleSwitchView("families")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                ${
                  viewMode === "families"
                    ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                }`}
            >
              <Sparkles size={16} />
              Word Families
            </button>
          </div>
        </div>

        {viewMode === "levels" && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            {(["A1", "A2", "B1", "B2"] as CEFRLevel[]).map((level) => {
              const gradients = {
                A1: "from-emerald-400 to-teal-500",
                A2: "from-sky-400 to-blue-600",
                B1: "from-violet-500 to-purple-700",
                B2: "from-amber-400 to-orange-500",
              };
              const locked = !allowedSet.has(level);
              return (
                <button
                  key={level}
                  onClick={() => !locked && handleLevelChange(level)}
                  disabled={locked}
                  className={`
                    relative rounded-2xl p-3 text-center transition-all duration-200
                    ${locked ? "opacity-40 cursor-not-allowed" : "hover:scale-105 active:scale-95"}
                    ${
                      selectedLevel === level
                        ? `bg-gradient-to-br ${gradients[level]} shadow-lg text-white`
                        : "bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-violet-200 dark:hover:border-violet-700 shadow-sm"
                    }
                  `}
                >
                  {locked ? (
                    <Lock
                      size={16}
                      className="mx-auto mb-1 text-gray-400 dark:text-gray-500"
                    />
                  ) : (
                    <GraduationCap
                      size={16}
                      className={`mx-auto mb-1 ${selectedLevel === level ? "text-white/80" : "text-gray-400 dark:text-gray-500"}`}
                    />
                  )}
                  <p
                    className={`text-sm font-bold ${selectedLevel === level ? "text-white" : ""}`}
                  >
                    {level}
                  </p>
                  <p
                    className={`text-xs ${selectedLevel === level ? "text-white/75" : "text-gray-400 dark:text-gray-500"}`}
                  >
                    {levelStats[level]}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 flex flex-col gap-6">
          {viewMode === "levels" ? (
            <>
              <FilterBar
                selectedLevel={selectedLevel}
                onLevelChange={handleLevelChange}
                onShuffle={handleShuffle}
                total={displayWords.length}
                allowedLevels={access.allowedLevels}
              />
              {currentWord && (
                <Flashcard
                  wordData={currentWord}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  cardIndex={cardIndex}
                  total={displayWords.length}
                />
              )}
            </>
          ) : !selectedFamily ? (
            <WordFamilies
              selectedId={selectedFamilyId}
              onSelect={handleSelectFamily}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto w-full px-1">
                <button
                  onClick={handleBackToFamilies}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                >
                  <ArrowLeft size={14} />
                  All Families
                </button>
                <div className="text-center flex-1">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {selectedFamily.title}
                  </p>
                  <p
                    dir="rtl"
                    lang="ar"
                    className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                    style={{
                      fontFamily:
                        "'Cairo', 'Amiri', 'Noto Sans Arabic', sans-serif",
                    }}
                  >
                    {selectedFamily.titleAr}
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tabular-nums w-16 text-right">
                  {familyWords.length} words
                </span>
              </div>
              {currentWord ? (
                <Flashcard
                  wordData={currentWord}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  cardIndex={familyCardIndex}
                  total={familyWords.length}
                />
              ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  No words in this family for your current package.
                </p>
              )}
            </>
          )}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600 pb-2">
          <span className="font-semibold text-violet-600 dark:text-violet-400">
            LEXO
          </span>
          <span className="mx-1">·</span>
          Oxford 3000™ A1–B2
          <span className="mx-1">·</span>
          <span className="text-orange-500 dark:text-amber-400">
            Native British Audio
          </span>
        </footer>
      </div>
    </div>
  );
}
