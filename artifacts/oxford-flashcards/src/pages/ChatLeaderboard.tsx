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
    <div className="dark min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-purple-300 text-sm mb-3 font-semibold"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />{" "}
          {lang === "ar" ? "رجوع" : "Back"}
        </Link>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Trophy size={22} className="text-amber-400" />
            {lang === "ar" ? "لوحة المتصدرين" : "Leaderboard"}
          </h1>
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold">
            {lang === "ar" ? "هذا الأسبوع" : "This Week"}
          </span>
        </div>

        {data?.me && (
          <div className="rounded-2xl bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-800 text-white p-5 mb-5 shadow-xl shadow-purple-900/40 border border-purple-500/30">
            <p className="text-xs uppercase tracking-wider text-purple-200 font-bold">
              {lang === "ar" ? "نقاطك" : "Your XP"}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold">{data.me.totalXp}</span>
              <span className="text-purple-100 font-semibold">XP</span>
              <span className="ms-3 px-2 py-0.5 rounded-full bg-white/15 text-xs font-bold">
                {lang === "ar" ? "مستوى" : "Level"} {data.me.level}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
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
        )}

        {isLoading && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 flex justify-center">
            <Loader2 className="animate-spin text-purple-400" />
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-950/40 border border-red-900 p-4 text-sm text-red-300">
            {(error as Error).message}
          </div>
        )}

        <ul className="space-y-2">
          {(data?.leaderboard ?? []).map((entry) => {
            const isMe = entry.userId === user?.id;
            const rankBadge =
              entry.rank === 1
                ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow shadow-amber-900/30"
                : entry.rank === 2
                ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 shadow shadow-slate-700/30"
                : entry.rank === 3
                ? "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950 shadow shadow-orange-900/30"
                : "bg-slate-800 text-slate-300";
            return (
              <li
                key={entry.userId}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                  isMe
                    ? "bg-purple-900/30 border-purple-700"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold ${rankBadge}`}
                >
                  {entry.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">
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
                  <p className="font-bold text-purple-300">{entry.totalXp}</p>
                  <p className="text-[10px] text-slate-500">XP</p>
                </div>
              </li>
            );
          })}
          {!isLoading && (data?.leaderboard ?? []).length === 0 && (
            <li className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center text-sm text-slate-400">
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
    <div className="rounded-xl bg-white/15 px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-purple-100">
        {icon}
        <span className="font-bold text-white">{value}</span>
      </div>
      <p className="text-[10px] uppercase text-purple-200 mt-0.5">{label}</p>
    </div>
  );
}
