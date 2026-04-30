import type { CEFRLevel } from "@/data/oxford-words";
import { levelColors } from "@/data/oxford-words";

interface FilterBarProps {
  selectedLevel: CEFRLevel | "all";
  onLevelChange: (level: CEFRLevel | "all") => void;
  onShuffle: () => void;
  total: number;
}

const LEVELS: (CEFRLevel | "all")[] = ["all", "A1", "A2", "B1", "B2"];

export function FilterBar({ selectedLevel, onLevelChange, onShuffle, total }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-2xl mx-auto px-1">
      <div className="flex items-center gap-2 flex-wrap">
        {LEVELS.map((level) => {
          const isActive = selectedLevel === level;
          const color = level !== "all" ? levelColors[level] : null;

          return (
            <button
              key={level}
              onClick={() => onLevelChange(level)}
              className={`
                px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200
                hover:scale-105 active:scale-95
                ${isActive
                  ? level === "all"
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md"
                    : `bg-gradient-to-r ${color!.bg} text-white shadow-md`
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
              `}
            >
              {level === "all" ? "All" : level}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tabular-nums">
          {total} words
        </span>
        <button
          onClick={onShuffle}
          className="px-4 py-1.5 rounded-full text-sm font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          Shuffle
        </button>
      </div>
    </div>
  );
}
