import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Mic,
  Image as ImageIcon,
  MessageSquare,
} from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { fetchLeaderboard } from "@/lib/chat-api";

export default function ChatLeaderboardPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["chat-leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 30000,
  });

  return (
    <div
      className="dark min-h-screen text-slate-100 relative"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(124,58,237,0.18), transparent 60%)",
        }}
      />
      <Header />
      <main className="relative max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-purple-300 text-sm mb-4 font-semibold"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />{" "}
          {lang === "ar" ? "رجوع" : "Back"}
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5 text-white">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_8px_22px_-6px_rgba(245,158,11,0.6)]">
              <Trophy size={18} className="text-amber-950" />
            </span>
            {lang === "ar" ? "لوحة المتصدرين" : "Leaderboard"}
          </h1>
          <span className="px-3 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 text-xs text-slate-200 font-semibold">
            {lang === "ar" ? "هذا الأسبوع" : "This Week"}
          </span>
        </div>

        {data?.me && (
          <div
            className="rounded-[20px] text-white p-5 mb-6 ring-1 ring-purple-300/25 shadow-[0_30px_70px_-18px_rgba(124,58,237,0.65),0_8px_24px_-8px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #6366f1 55%, #4f46e5 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 80% -10%, rgba(255,255,255,0.25), transparent 50%)",
              }}
            />
            <div className="relative">
              <p className="text-xs uppercase tracking-wider text-purple-100 font-bold">
                {lang === "ar" ? "نقاطك" : "Your XP"}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                  {data.me.totalXp}
                </span>
                <span className="text-purple-100 font-semibold">XP</span>
                <span className="ms-3 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold ring-1 ring-white/20">
                  {lang === "ar" ? "مستوى" : "Level"} {data.me.level}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-xs">
                <Stat
                  icon={<MessageSquare size={12} />}
                  label={lang === "ar" ? "نص" : "Text"}
                  value={data.me.messagesSent}
                />
                <Stat
                  icon={<Mic size={12} />}
                  label={lang === "ar" ? "صوت" : "Voice"}
                  value={data.me.voiceNotesSent}
                />
                <Stat
                  icon={<ImageIcon size={12} />}
                  label={lang === "ar" ? "صور" : "Images"}
                  value={data.me.imagesSent}
                />
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="rounded-[20px] bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/10 p-10 flex justify-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
            <Loader2 className="animate-spin text-purple-300" />
          </div>
        )}
        {error && (
          <div className="rounded-[20px] bg-red-500/10 backdrop-blur-xl ring-1 ring-red-400/30 p-4 text-sm text-red-300">
            {(error as Error).message}
          </div>
        )}

        <ul className="space-y-3">
          {(data?.leaderboard ?? []).map((entry) => {
            const isMe = entry.userId === user?.id;
            const rankBadge =
              entry.rank === 1
                ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-[0_8px_18px_-4px_rgba(245,158,11,0.7)]"
                : entry.rank === 2
                  ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 shadow-[0_8px_18px_-4px_rgba(148,163,184,0.6)]"
                  : entry.rank === 3
                    ? "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950 shadow-[0_8px_18px_-4px_rgba(249,115,22,0.6)]"
                    : "bg-white/[0.08] text-slate-300 ring-1 ring-white/10";
            return (
              <li
                key={entry.userId}
                className={`flex items-center gap-3 p-3.5 rounded-[20px] backdrop-blur-2xl ring-1 transition shadow-[0_14px_36px_-16px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] ${
                  isMe
                    ? "bg-purple-500/15 ring-purple-300/40"
                    : "bg-white/[0.05] ring-white/10"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold ${rankBadge}`}
                >
                  {entry.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white/10 shadow-[0_8px_18px_-6px_rgba(124,58,237,0.6)]">
                  {entry.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate text-white">
                    {entry.name}
                    {isMe && (
                      <span className="ms-2 text-[10px] text-purple-300 font-bold uppercase">
                        {lang === "ar" ? "أنت" : "You"}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {lang === "ar" ? "مستوى" : "Lvl"} {entry.level}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-bold text-purple-300 drop-shadow-[0_1px_8px_rgba(168,85,247,0.5)]">
                    {entry.totalXp}
                  </p>
                  <p className="text-[10px] text-slate-500">XP</p>
                </div>
              </li>
            );
          })}
          {!isLoading && (data?.leaderboard ?? []).length === 0 && (
            <li className="rounded-[20px] bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/10 p-10 text-center text-sm text-slate-400">
              {lang === "ar"
                ? "لا توجد بيانات بعد. ابدأ بإرسال رسالة!"
                : "No XP yet — be the first to chat!"}
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur-md px-2 py-2 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
      <div className="flex items-center justify-center gap-1 text-purple-100">
        {icon}
        <span className="font-bold text-white">{value}</span>
      </div>
      <p className="text-[10px] uppercase text-purple-200 mt-0.5">{label}</p>
    </div>
  );
}
