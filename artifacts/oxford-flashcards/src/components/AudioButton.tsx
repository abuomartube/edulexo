import { useState, useRef, useEffect } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { getPreloadedAudio } from "@/hooks/useDictionary";

interface AudioButtonProps {
  url: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function AudioButton({ url, size = "md", className = "", label }: AudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = getPreloadedAudio(url);
  }, [url]);

  const play = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;

    let audio = audioRef.current ?? getPreloadedAudio(url);
    if (!audio) return;

    try {
      audio.currentTime = 0;
      setPlaying(true);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      await audio.play();
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
      disabled={!url}
      aria-label={label ?? "Play pronunciation"}
      className={`
        inline-flex items-center justify-center rounded-full
        transition-all duration-200 select-none
        ${sizeMap[size]}
        ${url
          ? `cursor-pointer
             bg-violet-100 dark:bg-violet-900/40
             text-violet-700 dark:text-violet-300
             hover:bg-violet-200 dark:hover:bg-violet-800/60
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
