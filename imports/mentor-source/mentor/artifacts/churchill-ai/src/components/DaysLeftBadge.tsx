import { CalendarClock } from "lucide-react";

const GREEN = "#1DB954";
const YELLOW = "#F5C518";

export default function DaysLeftBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft <= 0;

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{
        background: isExpired ? "rgba(239,68,68,0.15)" : daysLeft <= 7 ? "rgba(245,197,24,0.15)" : "rgba(29,185,84,0.15)",
        border: `1px solid ${isExpired ? "rgba(239,68,68,0.3)" : daysLeft <= 7 ? "rgba(245,197,24,0.3)" : "rgba(29,185,84,0.3)"}`,
        color: isExpired ? "#f87171" : daysLeft <= 7 ? YELLOW : GREEN,
      }}
    >
      <CalendarClock className="w-3 h-3" />
      {isExpired ? "Expired" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
    </div>
  );
}
