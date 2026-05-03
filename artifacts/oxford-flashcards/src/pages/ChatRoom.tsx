import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Mic,
  Send,
  Image as ImageIcon,
  Lightbulb,
  Sparkles,
  Users,
  ShieldAlert,
  Headphones,
  RefreshCw,
} from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  fetchRoom,
  fetchMessages,
  sendTextMessage,
  sendAttachmentMessage,
  deleteMessage,
  heartbeat,
  fetchIceBreaker,
  uploadFileAndGetPath,
  containsArabic,
  type ChatMessage,
} from "@/lib/chat-api";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import MessageBubble from "@/components/chat/MessageBubble";
import TopicGenerator from "@/components/chat/TopicGenerator";

function VoiceOnlyComingSoon({ slug }: { slug: string }) {
  const { lang } = useLanguage();
  void slug;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      <Header />
      <main className="max-w-md mx-auto px-4 py-10 text-center">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-purple-300 text-sm mb-8"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />{" "}
          {lang === "ar" ? "رجوع" : "Back"}
        </Link>
        <div className="rounded-3xl bg-gradient-to-br from-purple-700/40 via-indigo-700/40 to-purple-900/40 border border-purple-500/30 p-8 shadow-2xl">
          <div className="mx-auto w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-700 flex items-center justify-center mb-6 shadow-2xl ring-8 ring-purple-500/20">
            <Headphones size={56} />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">
            🎧 {lang === "ar" ? "غرفة الصوت فقط" : "Voice Only Room"}
          </h1>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
            {lang === "ar" ? "قريباً — المرحلة الثانية" : "Coming Soon — Phase 2"}
          </span>
          <p className="text-purple-100 leading-relaxed text-sm mb-6">
            {lang === "ar"
              ? "محادثة صوتية مباشرة على غرار كلب هاوس. يستمع الجميع لمن يتحدث في الوقت الفعلي مع نظام رفع اليد ومُشرفين."
              : "Live audio practice — Clubhouse-style. Everyone hears the speaker in real time, with raise-hand and moderator controls."}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-purple-200">
            <Feature label={lang === "ar" ? "WebRTC مباشر" : "Live WebRTC"} />
            <Feature label={lang === "ar" ? "رفع اليد" : "Raise hand"} />
            <Feature label={lang === "ar" ? "حد للمتحدث" : "Speaker limit"} />
            <Feature label={lang === "ar" ? "كتم تلقائي" : "Auto-mute"} />
          </div>
        </div>
      </main>
    </div>
  );
}
function Feature({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-purple-500/20 px-3 py-2 text-center">
      {label}
    </div>
  );
}

export default function ChatRoomPage() {
  const params = useParams() as { slug: string };
  const slug = params.slug;
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [stage, setStage] = useState<"preview" | "chat">("preview");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [showTopic, setShowTopic] = useState(false);
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [arabicWarn, setArabicWarn] = useState(false);
  const lastTimeRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const roomQ = useQuery({
    queryKey: ["chat-room", slug],
    queryFn: () => fetchRoom(slug),
  });
  const room = roomQ.data?.room;

  // Initial messages
  useEffect(() => {
    if (stage !== "chat" || !room) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchMessages(slug);
        if (cancelled) return;
        setMessages(r.messages);
        if (r.messages.length > 0) {
          lastTimeRef.current = r.messages[r.messages.length - 1].createdAt;
        }
        scrollToBottom();
      } catch (e) {
        toast({ title: (e as Error).message, variant: "destructive" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, slug, room?.id]);

  // Polling + heartbeat
  useEffect(() => {
    if (stage !== "chat" || !room) return;
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetchMessages(slug, lastTimeRef.current ?? undefined);
        if (stop) return;
        if (r.messages.length > 0) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of r.messages) if (!seen.has(m.id)) merged.push(m);
            return merged;
          });
          lastTimeRef.current = r.messages[r.messages.length - 1].createdAt;
          requestAnimationFrame(scrollToBottom);
        }
      } catch {
        /* ignore transient */
      }
    };
    const beat = async () => {
      try {
        const h = await heartbeat(slug);
        if (!stop) setOnlineCount(h.onlineCount);
      } catch {
        /* ignore */
      }
    };
    void beat();
    const pollId = window.setInterval(poll, 3000);
    const beatId = window.setInterval(beat, 15000);
    return () => {
      stop = true;
      window.clearInterval(pollId);
      window.clearInterval(beatId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, slug, room?.id]);

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function handleSendText(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    if (containsArabic(text)) {
      setArabicWarn(true);
      window.setTimeout(() => setArabicWarn(false), 3500);
    }
    setSending(true);
    try {
      const r = await sendTextMessage(slug, text);
      setMessages((m) => [...m, r.message]);
      lastTimeRef.current = r.message.createdAt;
      setInput("");
      requestAnimationFrame(scrollToBottom);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleSendVoice(clip: {
    blob: Blob;
    mime: string;
    durationSec: number;
  }) {
    const ext =
      clip.mime === "audio/mp4"
        ? "m4a"
        : clip.mime === "audio/ogg"
        ? "ogg"
        : "webm";
    const filename = `voice-${Date.now()}.${ext}`;
    const objectPath = await uploadFileAndGetPath(
      clip.blob,
      filename,
      clip.mime,
    );
    const r = await sendAttachmentMessage(slug, "voice", {
      objectPath,
      mime: clip.mime,
      sizeBytes: clip.blob.size,
      audioDurationSec: clip.durationSec,
    });
    setMessages((m) => [...m, r.message]);
    lastTimeRef.current = r.message.createdAt;
    setRecording(false);
    requestAnimationFrame(scrollToBottom);
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title:
          lang === "ar" ? "الصور فقط" : "Only image files are allowed.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: lang === "ar" ? "أقصى حجم 10 ميجا" : "Max image size is 10 MB",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      const objectPath = await uploadFileAndGetPath(file, file.name, file.type);
      const r = await sendAttachmentMessage(slug, "image", {
        objectPath,
        mime: file.type,
        sizeBytes: file.size,
      });
      setMessages((m) => [...m, r.message]);
      lastTimeRef.current = r.message.createdAt;
      requestAnimationFrame(scrollToBottom);
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleIceBreaker() {
    try {
      const r = await fetchIceBreaker();
      setInput(lang === "ar" ? r.icebreaker.ar : r.icebreaker.en);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMessage(id);
      setMessages((m) =>
        m.map((x) => (x.id === id ? { ...x, deleted: true, body: null } : x)),
      );
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  }

  const rules = useMemo<string[]>(() => {
    const raw = lang === "ar" ? room?.rulesAr : room?.rulesEn;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [room, lang]);

  if (roomQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }
  if (!room) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
        <Header />
        <main className="max-w-md mx-auto p-8 text-center">
          <p className="text-slate-700 dark:text-slate-300">Room not found</p>
          <Link
            href="/chat"
            className="text-purple-600 dark:text-purple-400 underline mt-3 inline-block"
          >
            ← Back to chat
          </Link>
        </main>
      </div>
    );
  }

  if (room.kind === "voice") {
    return <VoiceOnlyComingSoon slug={slug} />;
  }

  // ───────────── PREVIEW STAGE ─────────────
  if (stage === "preview") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/40 dark:from-gray-950 dark:via-purple-950/40 dark:to-slate-950 text-slate-900 dark:text-slate-100">
        <Header />
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 text-sm mb-4 font-semibold"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" />{" "}
            {lang === "ar" ? "رجوع" : "Back"}
          </Link>
          <div className="rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">
                {room.emoji ?? "💬"}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-extrabold">
                  {lang === "ar" ? room.nameAr : room.nameEn}
                </h1>
                <div className="mt-1 flex items-center gap-3 text-xs text-purple-100">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} />
                    {room.onlineCount} {lang === "ar" ? "متصل" : "Online"}
                  </span>
                  {room.level && (
                    <span className="px-2 py-0.5 rounded-full bg-white/15 font-mono">
                      {room.level}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {(lang === "ar" ? room.descriptionAr : room.descriptionEn) && (
              <p className="mt-4 text-sm text-purple-50 leading-relaxed">
                {lang === "ar" ? room.descriptionAr : room.descriptionEn}
              </p>
            )}
          </div>

          {rules.length > 0 && (
            <section className="mt-5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <ShieldAlert size={14} className="text-purple-500" />
                {lang === "ar" ? "قواعد الغرفة" : "Room Rules"}
              </h2>
              <ul className="space-y-2">
                {rules.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(roomQ.data?.activeUsers?.length ?? 0) > 0 && (
            <section className="mt-5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                {lang === "ar" ? "الموجودون الآن" : "People inside"}
              </h2>
              <div className="flex flex-wrap gap-2">
                {(roomQ.data?.activeUsers ?? []).slice(0, 12).map((u) => (
                  <div
                    key={u.id}
                    className="px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-200 text-xs font-semibold"
                  >
                    {u.name}
                  </div>
                ))}
                {(roomQ.data?.activeUsers?.length ?? 0) > 12 && (
                  <div className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 text-xs">
                    +{(roomQ.data?.activeUsers?.length ?? 0) - 12}
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => setStage("chat")}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-lg"
              type="button"
            >
              <Mic size={18} />{" "}
              {lang === "ar" ? "انضم وتحدّث" : "Join & Speak"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ───────────── CHAT STAGE ─────────────
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-100 via-purple-50/30 to-slate-100 dark:from-gray-950 dark:via-purple-950/30 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 dark:bg-gray-950/85 border-b border-slate-200/80 dark:border-gray-800/80 px-3 sm:px-5 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/chat")}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800"
            aria-label="Back"
            type="button"
          >
            <ArrowLeft size={18} className="rtl:rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm sm:text-base truncate">
              {lang === "ar" ? room.nameAr : room.nameEn}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>
                {onlineCount ?? room.onlineCount}{" "}
                {lang === "ar" ? "متصل" : "online"}
              </span>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wide">
            EN ONLY
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 max-w-3xl w-full mx-auto"
      >
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
            {lang === "ar"
              ? "لا توجد رسائل بعد — كن أول من يبدأ المحادثة! 👋"
              : "No messages yet — be the first to break the ice! 👋"}
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            msg={m}
            isMine={m.userId === user?.id}
            canDelete={m.userId === user?.id || user?.role === "admin"}
            onDelete={() => handleDelete(m.id)}
            lang={lang}
          />
        ))}
      </div>

      {arabicWarn && (
        <div className="max-w-3xl mx-auto w-full px-3 sm:px-5">
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 border border-amber-300/60 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
            <ShieldAlert size={14} />
            {lang === "ar"
              ? "حاول استخدام الإنجليزية فقط للحصول على أفضل ممارسة 💪"
              : "Please try to use English only for the best practice 💪"}
          </div>
        </div>
      )}

      <footer className="sticky bottom-0 backdrop-blur-md bg-white/90 dark:bg-gray-950/90 border-t border-slate-200 dark:border-gray-800 px-3 sm:px-5 py-2.5">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <ChipBtn onClick={() => setShowTopic(true)} icon={<Sparkles size={12} />}>
              {lang === "ar" ? "موضوع" : "Topic"}
            </ChipBtn>
            <ChipBtn onClick={handleIceBreaker} icon={<Lightbulb size={12} />}>
              {lang === "ar" ? "كاسر الجمود" : "Ice Breaker"}
            </ChipBtn>
            <ChipBtn onClick={handleIceBreaker} icon={<RefreshCw size={12} />}>
              {lang === "ar" ? "تبديل" : "Rotate"}
            </ChipBtn>
            <ChipBtn
              onClick={() => fileInputRef.current?.click()}
              icon={<ImageIcon size={12} />}
            >
              {lang === "ar" ? "صورة" : "Image"}
            </ChipBtn>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />
          {recording ? (
            <VoiceRecorder
              onSend={handleSendVoice}
              onCancel={() => setRecording(false)}
            />
          ) : (
            <form onSubmit={handleSendText} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  lang === "ar" ? "اكتب رسالة..." : "Type a message…"
                }
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-gray-800 border border-transparent focus:border-purple-500 focus:outline-none text-sm"
                maxLength={2000}
              />
              {input.trim() ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center disabled:opacity-50"
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecording(true)}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center"
                  aria-label="Record voice note"
                >
                  <Mic size={18} />
                </button>
              )}
            </form>
          )}
        </div>
      </footer>

      {showTopic && (
        <TopicGenerator
          lang={lang}
          onClose={() => setShowTopic(false)}
          onUseAsMessage={(t) => setInput(t)}
        />
      )}
    </div>
  );
}

function ChipBtn({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/60 transition"
    >
      {icon}
      {children}
    </button>
  );
}
