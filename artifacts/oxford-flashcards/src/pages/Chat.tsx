import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  Flame,
  MessageCircle,
  Trophy,
  Bell,
} from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { fetchRooms, type ChatRoomSummary } from "@/lib/chat-api";

const FILTERS = [
  { key: "all", labelEn: "All", labelAr: "الكل" },
  { key: "speaking", labelEn: "Conversation", labelAr: "محادثة" },
  { key: "voice", labelEn: "Voice Only", labelAr: "صوت فقط" },
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
    <div className="dark min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              LEXO Chat
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {lang === "ar"
                ? "غرف ممارسة اللغة الإنجليزية مع متعلمين من حول العالم"
                : "English practice rooms with learners around the world"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/chat/messages"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border border-slate-800 hover:border-purple-700 hover:text-purple-300 text-slate-300"
              aria-label="Messages"
            >
              <MessageCircle size={16} />
            </Link>
            <Link
              href="/chat/leaderboard"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border border-slate-800 hover:border-purple-700 hover:text-purple-300 text-slate-300"
              aria-label="Leaderboard"
            >
              <Trophy size={16} />
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-300"
              aria-label="Notifications"
            >
              <Bell size={16} />
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-xl shadow-black/20">
          <div className="text-center mb-4">
            <h2 className="text-base font-bold text-white">
              {lang === "ar" ? "اختر الغرفة" : "Choose a Room"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {lang === "ar"
                ? "اختر الغرفة التي تريد الانضمام إليها"
                : "Pick the room you'd like to join"}
            </p>
          </div>

          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "ar" ? "ابحث عن غرفة..." : "Search rooms…"}
              className="w-full ps-9 pe-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  filter === f.key
                    ? "bg-purple-600 text-white shadow shadow-purple-900/40"
                    : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
                }`}
                type="button"
              >
                {lang === "ar" ? f.labelAr : f.labelEn}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="py-12 flex justify-center">
              <Loader2 size={26} className="animate-spin text-purple-400" />
            </div>
          )}
          {error && (
            <div className="rounded-2xl bg-red-950/40 border border-red-900 p-4 text-sm text-red-300">
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
                    className="group block rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-purple-700/60 p-3.5 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                          isVoice
                            ? "bg-gradient-to-br from-rose-500 to-orange-500"
                            : room.category === "ielts"
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                            : room.category === "casual"
                            ? "bg-gradient-to-br from-amber-400 to-orange-500"
                            : "bg-gradient-to-br from-purple-500 to-indigo-600"
                        } shadow-md`}
                      >
                        {room.emoji ?? "💬"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white truncate">
                            {lang === "ar" ? room.nameAr : room.nameEn}
                          </h3>
                          {isHot && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-wide">
                              <Flame size={10} />{" "}
                              {lang === "ar" ? "نشط" : "Hot"}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span
                                className={`absolute inline-flex h-full w-full rounded-full ${
                                  room.onlineCount > 0
                                    ? "bg-emerald-400 animate-ping opacity-75"
                                    : "bg-slate-600"
                                }`}
                              />
                              <span
                                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                  room.onlineCount > 0
                                    ? "bg-emerald-400"
                                    : "bg-slate-600"
                                }`}
                              />
                            </span>
                            {room.onlineCount}{" "}
                            {lang === "ar" ? "متصل" : "online"}
                          </span>
                          {room.level && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 font-mono text-[10px]">
                              {room.level}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold ${
                          isVoice
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow shadow-purple-900/40 group-hover:from-purple-500 group-hover:to-indigo-500"
                        }`}
                      >
                        {isVoice
                          ? lang === "ar"
                            ? "قريباً"
                            : "Soon"
                          : lang === "ar"
                          ? "انضمام"
                          : "Join"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <li className="rounded-2xl bg-slate-800/40 border border-slate-800 p-8 text-center text-sm text-slate-400">
                {lang === "ar" ? "لا توجد غرف مطابقة." : "No matching rooms."}
              </li>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
