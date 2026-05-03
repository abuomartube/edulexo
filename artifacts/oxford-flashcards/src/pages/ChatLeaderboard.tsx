import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trophy, Medal, Mic, Image as ImageIcon, MessageSquare } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/40 dark:from-gray-950 dark:via-purple-950/40 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 text-sm mb-3 font-semibold"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />{" "}
          {lang === "ar" ? "رجوع" : "Back"}
        </Link>
        <h1 className="text-2xl font-extrabold flex items-center gap-2 mb-4">
          <Trophy size={22} className="text-amber-500" />
          {lang === "ar" ? "لوحة المتصدرين" : "Leaderboard"}
        </h1>

        {data?.me && (
          <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white p-5 mb-5 shadow-xl">
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
              <Stat icon={<MessageSquare size={12} />} label={lang === "ar" ? "نص" : "Text"} value={data.me.messagesSent} />
              <Stat icon={<Mic size={12} />} label={lang === "ar" ? "صوت" : "Voice"} value={data.me.voiceNotesSent} />
              <Stat icon={<ImageIcon size={12} />} label={lang === "ar" ? "صور" : "Images"} value={data.me.imagesSent} />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 flex justify-center">
            <Loader2 className="animate-spin text-purple-500" />
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
            {(error as Error).message}
          </div>
        )}

        <ul className="space-y-1.5">
          {(data?.leaderboard ?? []).map((entry) => {
            const isMe = entry.userId === user?.id;
            const rankColor =
              entry.rank === 1
                ? "text-amber-500"
                : entry.rank === 2
                ? "text-slate-400"
                : entry.rank === 3
                ? "text-orange-500"
                : "text-slate-500";
            return (
              <li
                key={entry.userId}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                  isMe
                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700"
                    : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800"
                }`}
              >
                <div className={`w-8 text-center font-extrabold ${rankColor}`}>
                  {entry.rank <= 3 ? <Medal size={18} className="mx-auto" /> : `#${entry.rank}`}
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  {entry.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">
                    {entry.name}
                    {isMe && (
                      <span className="ms-2 text-[10px] text-purple-700 dark:text-purple-300 font-bold uppercase">
                        {lang === "ar" ? "أنت" : "You"}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === "ar" ? "مستوى" : "Lvl"} {entry.level}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-bold text-purple-700 dark:text-purple-300">{entry.totalXp}</p>
                  <p className="text-[10px] text-slate-400">XP</p>
                </div>
              </li>
            );
          })}
          {!isLoading && (data?.leaderboard ?? []).length === 0 && (
            <li className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
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
