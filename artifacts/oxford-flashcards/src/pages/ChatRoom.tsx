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
      <div className="dark min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1 text-purple-300 text-sm mb-4 font-semibold"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" />{" "}
            {lang === "ar" ? "رجوع" : "Back"}
          </Link>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl shadow-black/20">
            <div className="bg-gradient-to-br from-purple-600/30 via-indigo-600/20 to-slate-900 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-4xl shadow-2xl shadow-purple-900/40 mb-3">
                  {room.emoji ?? "💬"}
                </div>
                <h1 className="text-xl font-extrabold text-white">
                  {lang === "ar" ? room.nameAr : room.nameEn}
                </h1>
                <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    {room.onlineCount} {lang === "ar" ? "متصل" : "Online"}
                  </span>
                  {room.level && (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {room.level}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(lang === "ar" ? room.descriptionAr : room.descriptionEn) && (
              <div className="px-6 pb-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === "ar" ? "عن الغرفة" : "About"}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {lang === "ar" ? room.descriptionAr : room.descriptionEn}
                </p>
              </div>
            )}

            {rules.length > 0 && (
              <div className="px-6 pb-5 border-t border-slate-800 pt-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert size={12} className="text-purple-400" />
                  {lang === "ar" ? "قواعد الغرفة" : "Room Rules"}
                </h3>
                <ul className="space-y-2">
                  {rules.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-200"
                    >
                      <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        ✓
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(roomQ.data?.activeUsers?.length ?? 0) > 0 && (
              <div className="px-6 pb-6 border-t border-slate-800 pt-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {lang === "ar" ? "الموجودون الآن" : "People inside now"}
                </h3>
                <div className="flex -space-x-2 rtl:space-x-reverse items-center">
                  {(roomQ.data?.activeUsers ?? []).slice(0, 6).map((u) => (
                    <div
                      key={u.id}
                      title={u.name}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold border-2 border-slate-900"
                    >
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {(roomQ.data?.activeUsers?.length ?? 0) > 6 && (
                    <div className="ms-3 ps-3 text-xs text-slate-400 font-semibold">
                      +{(roomQ.data?.activeUsers?.length ?? 0) - 6}{" "}
                      {lang === "ar" ? "آخرون" : "more"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => setStage("chat")}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-xl shadow-purple-900/40"
              type="button"
            >
              <Headphones size={18} />{" "}
              {lang === "ar" ? "الانضمام إلى الغرفة" : "Join the Room"}
            </button>
            <button
              onClick={() => setStage("chat")}
              className="w-full text-center text-sm text-slate-400 hover:text-purple-300 py-2"
              type="button"
            >
              {lang === "ar" ? "استمع أولاً" : "Listen first"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ───────────── CHAT STAGE ─────────────
  return (
    <div className="dark min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/85 border-b border-slate-800 px-3 sm:px-5 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button
            onClick={() => navigate("/chat")}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-300"
            aria-label="Back"
            type="button"
          >
            <ArrowLeft size={18} className="rtl:rotate-180" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-bold text-sm sm:text-base text-white truncate">
              {lang === "ar" ? room.nameAr : room.nameEn}
            </h1>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span>
                {onlineCount ?? room.onlineCount}{" "}
                {lang === "ar" ? "متصل" : "online"}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-purple-300 flex items-center justify-center"
            aria-label="Raise hand"
            title={lang === "ar" ? "رفع اليد" : "Raise hand"}
          >
            ✋
          </button>
        </div>
        <div className="max-w-3xl mx-auto mt-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {lang === "ar" ? "إنجليزية فقط" : "English Only"}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Mic size={11} />
            {lang === "ar" ? "اضغط للتسجيل" : "Hold mic to record"}
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 max-w-3xl w-full mx-auto"
      >
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">
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
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-950/50 border border-amber-900/60 text-amber-200 text-xs flex items-center gap-2">
            <ShieldAlert size={14} />
            {lang === "ar"
              ? "حاول استخدام الإنجليزية فقط للحصول على أفضل ممارسة 💪"
              : "Please try to use English only for the best practice 💪"}
          </div>
        </div>
      )}

      <footer className="sticky bottom-0 backdrop-blur-md bg-slate-950/95 border-t border-slate-800 px-3 sm:px-5 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1">
            <ToolPill
              onClick={() => setShowTopic(true)}
              icon={<Sparkles size={13} />}
              tone="purple"
            >
              {lang === "ar" ? "موضوع" : "Topic"}
            </ToolPill>
            <ToolPill
              onClick={handleIceBreaker}
              icon={<Lightbulb size={13} />}
              tone="amber"
            >
              {lang === "ar" ? "كاسر الجمود" : "Ice Breaker"}
            </ToolPill>
            <ToolPill
              onClick={handleIceBreaker}
              icon={<RefreshCw size={13} />}
              tone="cyan"
            >
              {lang === "ar" ? "تبديل" : "Rotate"}
            </ToolPill>
            <ToolPill
              onClick={() => fileInputRef.current?.click()}
              icon={<ImageIcon size={13} />}
              tone="rose"
            >
              {lang === "ar" ? "صورة" : "Image Talk"}
            </ToolPill>
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
            <form
              onSubmit={handleSendText}
              className="flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 ps-3 pe-1.5 py-1.5"
            >
              <span className="text-lg select-none">😊</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  lang === "ar" ? "اكتب رسالة..." : "Type a message…"
                }
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-100 placeholder:text-slate-500"
                maxLength={2000}
              />
              {input.trim() ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center disabled:opacity-50 shadow-md shadow-purple-900/40"
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} className="rtl:rotate-180" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecording(true)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-md shadow-purple-900/40"
                  aria-label="Record voice note"
                >
                  <Mic size={16} />
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

function ToolPill({
  children,
  icon,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  tone: "purple" | "amber" | "cyan" | "rose";
}) {
  const toneClasses: Record<typeof tone, string> = {
    purple: "bg-purple-500/15 text-purple-300 hover:bg-purple-500/25",
    amber: "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25",
    cyan: "bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25",
    rose: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}
