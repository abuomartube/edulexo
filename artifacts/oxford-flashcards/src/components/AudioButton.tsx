import { useState, useRef } from "react";
import { Volume2, Loader2 } from "lucide-react";

interface AudioButtonProps {
  url: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function AudioButton({ url, size = "md", className = "", label }: AudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url || playing) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
      } else {
        audioRef.current.src = url;
      }

      setPlaying(true);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onerror = () => setPlaying(false);
      await audioRef.current.play();
    } catch {
      setPlaying(false);
    }
  };

  const sizeMap = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  const iconSize = { sm: 14, md: 18, lg: 22 };

  return (
    <button
      onClick={play}
      disabled={!url || playing}
      aria-label={label ?? "Play pronunciation"}
      className={`
        inline-flex items-center justify-center rounded-full
        transition-all duration-200 select-none
        ${sizeMap[size]}
        ${url
          ? `cursor-pointer
             bg-indigo-100 dark:bg-indigo-900/40
             text-indigo-600 dark:text-indigo-400
             hover:bg-indigo-200 dark:hover:bg-indigo-800/60
             hover:scale-110 active:scale-95
             shadow-sm hover:shadow-md`
          : "cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50"
        }
        ${className}
      `}
    >
      {playing ? (
        <Loader2 size={iconSize[size]} className="animate-spin" />
      ) : (
        <Volume2 size={iconSize[size]} />
      )}
    </button>
  );
}
