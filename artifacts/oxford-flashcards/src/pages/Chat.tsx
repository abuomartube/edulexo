import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  Users,
  Flame,
  MessageCircle,
  Trophy,
  ChevronRight,
} from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { fetchRooms, type ChatRoomSummary } from "@/lib/chat-api";

const FILTERS = [
  { key: "all", labelEn: "All", labelAr: "الكل" },
  { key: "speaking", labelEn: "Speaking", labelAr: "محادثة" },
  { key: "voice", labelEn: "Voice", labelAr: "صوت" },
  { key: "ielts", labelEn: "IELTS", labelAr: "آيلتس" },
  { key: "casual", labelEn: "Casual", labelAr: "عام" },
];

export default function ChatPage() {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: fetchRooms,
    refetchInterval: 15000,
  });

  const filtered = useMemo<ChatRoomSummary[]>(() => {
    const rooms = data?.rooms ?? [];
    return rooms.filter((r) => {
      if (filter !== "all") {
        if (filter === "voice" && r.kind !== "voice") return false;
        if (filter !== "voice" && r.category !== filter) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          r.nameEn.toLowerCase().includes(q) ||
          r.nameAr.includes(search.trim()) ||
          (r.descriptionEn ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, filter, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/40 dark:from-gray-950 dark:via-purple-950/40 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-700 to-indigo-600 dark:from-purple-300 dark:to-indigo-300 bg-clip-text text-transparent">
              LEXO Chat
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {lang === "ar"
                ? "غرف ممارسة اللغة الإنجليزية مع متعلمين من حول العالم"
                : "English practice rooms with learners around the world"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/chat/messages"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-gray-800"
            >
              <MessageCircle size={15} />{" "}
              {lang === "ar" ? "رسائل" : "Messages"}
            </Link>
            <Link
              href="/chat/leaderboard"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-gray-800"
            >
              <Trophy size={15} />{" "}
              {lang === "ar" ? "اللوحة" : "Leaderboard"}
            </Link>
          </div>
        </div>

        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث عن غرفة..." : "Search rooms…"}
            className="w-full ps-9 pe-3 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                filter === f.key
                  ? "bg-purple-600 text-white shadow"
                  : "bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800"
              }`}
              type="button"
            >
              {lang === "ar" ? f.labelAr : f.labelEn}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 flex justify-center">
            <Loader2 size={28} className="animate-spin text-purple-500" />
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
            {(error as Error).message}
          </div>
        )}

        <ul className="space-y-2.5">
          {filtered.map((room) => {
            const isHot = room.id === data?.hotRoomId && room.onlineCount > 0;
            const isVoice = room.kind === "voice";
            return (
              <li key={room.id}>
                <Link
                  href={`/chat/r/${room.slug}`}
                  className="group block rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                        isVoice
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : "bg-gradient-to-br from-purple-500 to-indigo-600"
                      } text-white shadow-md`}
                    >
                      {room.emoji ?? "💬"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate">
                          {lang === "ar" ? room.nameAr : room.nameEn}
                        </h3>
                        {isHot && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 text-[10px] font-bold uppercase tracking-wide">
                            <Flame size={10} />{" "}
                            {lang === "ar" ? "نشط الآن" : "Active Now"}
                          </span>
                        )}
                        {isVoice && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase">
                            {lang === "ar" ? "قريباً" : "Coming Soon"}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                        {lang === "ar"
                          ? room.descriptionAr
                          : room.descriptionEn}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} />
                          {room.onlineCount}{" "}
                          {lang === "ar" ? "متصل" : "online"}
                        </span>
                        {room.level && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-mono">
                            {room.level}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-slate-400 group-hover:text-purple-500 rtl:rotate-180"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <li className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {lang === "ar" ? "لا توجد غرف مطابقة." : "No matching rooms."}
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}
