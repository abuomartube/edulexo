import { useState, useCallback, useMemo } from "react";
import { allWords, oxfordWordsByLevel } from "@/data/oxford-words";
import type { CEFRLevel, OxfordWord } from "@/data/oxford-words";
import { Flashcard } from "@/components/Flashcard";
import { FilterBar } from "@/components/FilterBar";
import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun, BookOpen, GraduationCap } from "lucide-react";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function App() {
  const { theme, toggle } = useTheme();
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | "all">("all");
  const [cardIndex, setCardIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  const filteredWords = useMemo<OxfordWord[]>(() => {
    if (selectedLevel === "all") return allWords;
    return oxfordWordsByLevel[selectedLevel].map((word) => ({ word, level: selectedLevel }));
  }, [selectedLevel]);

  const displayWords = useMemo<OxfordWord[]>(() => {
    if (isShuffled && shuffledIndices.length === filteredWords.length) {
      return shuffledIndices.map((i) => filteredWords[i]);
    }
    return filteredWords;
  }, [filteredWords, isShuffled, shuffledIndices]);

  const currentWord = displayWords[Math.min(cardIndex, displayWords.length - 1)];

  const handleLevelChange = useCallback((level: CEFRLevel | "all") => {
    setSelectedLevel(level);
    setCardIndex(0);
    setIsShuffled(false);
  }, []);

  const handleShuffle = useCallback(() => {
    const indices = shuffle(Array.from({ length: filteredWords.length }, (_, i) => i));
    setShuffledIndices(indices);
    setIsShuffled(true);
    setCardIndex(0);
  }, [filteredWords.length]);

  const handleNext = useCallback(() => {
    setCardIndex((i) => (i + 1) % displayWords.length);
  }, [displayWords.length]);

  const handlePrev = useCallback(() => {
    setCardIndex((i) => (i - 1 + displayWords.length) % displayWords.length);
  }, [displayWords.length]);

  const levelStats = useMemo(() => ({
    A1: oxfordWordsByLevel.A1.length,
    A2: oxfordWordsByLevel.A2.length,
    B1: oxfordWordsByLevel.B1.length,
    B2: oxfordWordsByLevel.B2.length,
  }), []);

  if (!currentWord) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/20 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 py-6 min-h-screen flex flex-col">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                Oxford 3000
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                British English Flashcards
              </p>
            </div>
          </div>

          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {(["A1", "A2", "B1", "B2"] as CEFRLevel[]).map((level) => {
            const gradients = {
              A1: "from-emerald-400 to-teal-500",
              A2: "from-blue-400 to-cyan-500",
              B1: "from-violet-400 to-purple-500",
              B2: "from-rose-400 to-pink-500",
            };
            return (
              <button
                key={level}
                onClick={() => handleLevelChange(level)}
                className={`
                  relative rounded-2xl p-3 text-center transition-all duration-200 hover:scale-105 active:scale-95
                  ${selectedLevel === level
                    ? `bg-gradient-to-br ${gradients[level]} shadow-lg text-white`
                    : "bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-600 shadow-sm"
                  }
                `}
              >
                <GraduationCap size={16} className={`mx-auto mb-1 ${selectedLevel === level ? "text-white/80" : "text-gray-400 dark:text-gray-500"}`} />
                <p className={`text-sm font-bold ${selectedLevel === level ? "text-white" : ""}`}>{level}</p>
                <p className={`text-xs ${selectedLevel === level ? "text-white/75" : "text-gray-400 dark:text-gray-500"}`}>
                  {levelStats[level]}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <FilterBar
            selectedLevel={selectedLevel}
            onLevelChange={handleLevelChange}
            onShuffle={handleShuffle}
            total={displayWords.length}
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
        </div>

        <footer className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600 pb-2">
          Oxford 3000™ — A1 to B2 • Powered by the Free Dictionary API
        </footer>
      </div>
    </div>
  );
}

export default App;
