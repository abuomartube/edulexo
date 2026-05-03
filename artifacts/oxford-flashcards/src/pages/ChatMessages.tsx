import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Inbox, MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { fetchDmThreads } from "@/lib/chat-api";

export default function ChatMessagesPage() {
  const { lang } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dm-threads"],
    queryFn: fetchDmThreads,
    refetchInterval: 15000,
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
          {lang === "ar" ? "رجوع للغرف" : "Back to rooms"}
        </Link>
        <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2">
          <MessageCircle size={22} className="text-purple-500" />
          {lang === "ar" ? "الرسائل" : "Messages"}
        </h1>
        {isLoading && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 flex justify-center">
            <Loader2 className="animate-spin text-purple-500" size={26} />
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
            {(error as Error).message}
          </div>
        )}
        {data && data.threads.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 text-center">
            <Inbox size={36} className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {lang === "ar"
                ? "لا توجد محادثات خاصة بعد. افتح ملف مستخدم وابدأ محادثة."
                : "No direct messages yet. Open a user's profile to start one."}
            </p>
          </div>
        )}
        <ul className="space-y-2">
          {(data?.threads ?? []).map((t) => (
            <li key={t.id}>
              <Link
                href={`/chat/dm/${t.id}`}
                className="block rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 p-4 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold">
                    {t.otherUserName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{t.otherUserName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {t.preview?.kind === "voice"
                        ? "🎙️ Voice note"
                        : t.preview?.kind === "image"
                        ? "🖼️ Image"
                        : t.preview?.body ??
                          (lang === "ar" ? "بدء محادثة" : "Start chatting")}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(t.lastActivityAt).toLocaleDateString(
                      lang === "ar" ? "ar-EG" : "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
