import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

export default function VoicePlayer({
  src,
  durationSec,
  tone = "self",
}: {
  src: string;
  durationSec: number | null;
  tone?: "self" | "other";
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [actualDuration, setActualDuration] = useState<number>(durationSec ?? 0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setActualDuration(a.duration);
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play();
      setPlaying(true);
    }
  }

  function fmt(s: number): string {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const pct =
    actualDuration > 0 ? Math.min(100, (progress / actualDuration) * 100) : 0;

  const isSelf = tone === "self";
  const trackBg = isSelf ? "bg-white/30" : "bg-purple-200 dark:bg-purple-900/40";
  const trackFg = isSelf
    ? "bg-white"
    : "bg-purple-600 dark:bg-purple-400";
  const btnBg = isSelf
    ? "bg-white/30 hover:bg-white/40 text-white"
    : "bg-purple-600 hover:bg-purple-700 text-white";

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <button
        onClick={toggle}
        type="button"
        className={`w-9 h-9 rounded-full flex items-center justify-center ${btnBg}`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className={`h-1.5 rounded-full ${trackBg} overflow-hidden`}>
          <div
            className={`h-full ${trackFg} transition-[width]`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className={`text-[11px] font-mono ${
            isSelf
              ? "text-white/80"
              : "text-purple-700 dark:text-purple-300"
          }`}
        >
          {fmt(playing ? progress : actualDuration)}
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
