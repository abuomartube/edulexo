import { useState, useRef, useEffect, useCallback } from "react";
import { useT, useLanguage } from "@/lib/i18n";
import type { EnglishEnrollment } from "@/lib/api";
import {
  ArrowLeft,
  Keyboard,
  Mic,
  Lock,
  MessageCircle,
  List,
  Send,
  Loader2,
  RotateCcw,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  BookOpen,
  Sparkles,
  Volume2,
  GraduationCap,
  Trophy,
  PenLine,
} from "lucide-react";

type CefrLevel = "A1" | "A2" | "B1" | "B1+" | "B2" | "C1";
type Mode = "text" | "voice";
type ConversationType = "free" | "topic";
type Stage = "mode" | "level" | "type" | "topic" | "welcome" | "chat" | "feedback";
type ChatMessage = { role: "user" | "assistant"; content: string };

const ALL_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B1+", "B2", "C1"];

const BEGINNER_LEVELS: CefrLevel[] = ["A1", "A2", "B1"];
const INTERMEDIATE_LEVELS: CefrLevel[] = ["B1+", "B2", "C1"];

function getActiveTiers(enrollments: EnglishEnrollment[]): string[] {
  const active = enrollments.filter((e) => e.isActive);
  return [...new Set(active.map((e) => e.tier))];
}

function canAccessLevel(activeTiers: string[], level: CefrLevel): boolean {
  if (activeTiers.includes("advanced")) return true;
  if (activeTiers.includes("beginner") && BEGINNER_LEVELS.includes(level)) return true;
  if (activeTiers.includes("intermediate") && INTERMEDIATE_LEVELS.includes(level)) return true;
  return false;
}

const LEVEL_COLORS: Record<CefrLevel, { gradient: string; accent: string; glow: string }> = {
  A1: { gradient: "from-emerald-500 to-green-600", accent: "#10b981", glow: "rgba(16,185,129,0.3)" },
  A2: { gradient: "from-teal-500 to-cyan-600", accent: "#14b8a6", glow: "rgba(20,184,166,0.3)" },
  B1: { gradient: "from-sky-500 to-blue-600", accent: "#0ea5e9", glow: "rgba(14,165,233,0.3)" },
  "B1+": { gradient: "from-violet-500 to-purple-600", accent: "#8b5cf6", glow: "rgba(139,92,246,0.3)" },
  B2: { gradient: "from-fuchsia-500 to-pink-600", accent: "#d946ef", glow: "rgba(217,70,239,0.3)" },
  C1: { gradient: "from-amber-500 to-orange-600", accent: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
};

const LEVEL_DESCRIPTIONS: Record<CefrLevel, { en: string; ar: string }> = {
  A1: { en: "Absolute beginner", ar: "مبتدئ تمامًا" },
  A2: { en: "Elementary", ar: "أساسي" },
  B1: { en: "Pre-intermediate", ar: "ما قبل المتوسط" },
  "B1+": { en: "Intermediate", ar: "متوسط" },
  B2: { en: "Upper-intermediate", ar: "فوق المتوسط" },
  C1: { en: "Proficient", ar: "متقدم" },
};

interface FeedbackData {
  summary?: string;
  grammarMistakes?: Array<{ original: string; correction: string; explanation: string }>;
  vocabularyUpgrades?: Array<{ original: string; better: string; example: string; reason: string }>;
  betterExpressions?: Array<{ original: string; better: string; explanation: string }>;
  fluencyNotes?: string;
  tips?: string[];
  wordCount?: number;
  userTurns?: number;
}

interface Props {
  enrollments: EnglishEnrollment[];
  onBack: () => void;
}

export default function ChurchillSpeaking({ enrollments, onBack }: Props) {
  const t = useT();
  const { lang } = useLanguage();
  const activeTiers = getActiveTiers(enrollments);

  const [stage, setStage] = useState<Stage>("mode");
  const [mode, setMode] = useState<Mode>("text");
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [convType, setConvType] = useState<ConversationType | null>(null);
  const [topic, setTopic] = useState<string>("");
  const [topics, setTopics] = useState<Record<string, string[]>>({});

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const streamAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    fetch("/api/english/mentor/churchill/topics", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.topics) setTopics(d.topics);
      })
      .catch(() => {});
  }, []);

  const selectMode = (m: Mode) => {
    setMode(m);
    setStage("level");
  };

  const selectLevel = (l: CefrLevel) => {
    if (!canAccessLevel(activeTiers, l)) return;
    setLevel(l);
    setStage("type");
  };

  const selectConvType = (ct: ConversationType) => {
    setConvType(ct);
    if (ct === "free") {
      setTopic("General chat");
      setStage("welcome");
    } else {
      setStage("topic");
    }
  };

  const selectTopic = (tp: string) => {
    setTopic(tp);
    setStage("welcome");
  };

  const startChat = useCallback(async (selectedTopic: string) => {
    setStage("chat");
    setMessages([]);
    setStreaming(true);
    setStreamingText("");

    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      const res = await fetch("/api/english/mentor/churchill/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          level,
          mode,
          conversationType: convType || "free",
          topic: selectedTopic,
          isStart: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]" || payload === "[ERROR]") continue;
          try {
            const json = JSON.parse(payload);
            if (json.delta) {
              assistantText += json.delta;
              setStreamingText(assistantText);
            }
          } catch {}
        }
      }

      if (assistantText) {
        setMessages([{ role: "assistant", content: assistantText }]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  }, [level, mode, convType]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      const res = await fetch("/api/english/mentor/churchill/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          level,
          mode,
          conversationType: convType || "free",
          topic,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]" || payload === "[ERROR]") continue;
          try {
            const json = JSON.parse(payload);
            if (json.delta) {
              assistantText += json.delta;
              setStreamingText(assistantText);
            }
          } catch {}
        }
      }

      if (assistantText) {
        setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      setStreaming(false);
      setStreamingText("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, streaming, messages, level, mode, convType, topic]);

  const endAndGetFeedback = useCallback(async () => {
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return;

    setStage("feedback");
    setFeedbackLoading(true);
    setFeedbackError(false);

    try {
      const res = await fetch("/api/english/mentor/churchill/feedback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, level, topic }),
      });

      if (!res.ok) throw new Error("Feedback failed");
      const data = await res.json();
      setFeedback(data.feedback);
    } catch {
      setFeedbackError(true);
    } finally {
      setFeedbackLoading(false);
    }
  }, [messages, level, topic]);

  const resetConversation = () => {
    setStage("mode");
    setMode("text");
    setLevel(null);
    setConvType(null);
    setTopic("");
    setMessages([]);
    setInput("");
    setFeedback(null);
    setFeedbackError(false);
    streamAbortRef.current?.abort();
  };

  const goBackOneStep = () => {
    if (stage === "level") setStage("mode");
    else if (stage === "type") setStage("level");
    else if (stage === "topic") setStage("type");
    else if (stage === "welcome") {
      if (convType === "free") setStage("type");
      else setStage("topic");
    }
    else if (stage === "chat") resetConversation();
    else if (stage === "feedback") setStage("chat");
  };

  const userMsgCount = messages.filter((m) => m.role === "user").length;
  const canEnd = userMsgCount > 0 && !streaming;

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at top, rgba(124,58,237,0.18), transparent 60%)" }} />

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {stage !== "chat" && stage !== "feedback" && stage !== "welcome" && (
          <button
            onClick={stage === "mode" ? onBack : goBackOneStep}
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {stage === "mode" ? t("hub_back") : t("churchill_back")}
          </button>
        )}

        {stage !== "chat" && stage !== "feedback" && stage !== "welcome" && (
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              {t("churchill_title")}
            </h1>
            <p className="mt-2 text-slate-400 text-sm">{t("churchill_subtitle")}</p>
          </div>
        )}

        {/* STEP 1: Mode Selection */}
        {stage === "mode" && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-300/70 mb-4">{t("churchill_step_mode")}</p>
            <button onClick={() => selectMode("text")} className="group w-full text-start rounded-2xl p-5 transition-all hover:scale-[1.01]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
                  <Keyboard className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{t("churchill_mode_text")}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{t("churchill_mode_text_desc")}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-white/60 transition rtl:rotate-180" />
              </div>
            </button>
            <button disabled className="group w-full text-start rounded-2xl p-5 opacity-50 cursor-not-allowed" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{t("churchill_mode_voice")}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{t("churchill_mode_voice_desc")}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 ring-1 ring-amber-500/30 px-2 py-1 rounded-full">{t("churchill_voice_coming_soon")}</span>
              </div>
            </button>
          </div>
        )}

        {/* STEP 2: Level Selection */}
        {stage === "level" && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-300/70 mb-4">{t("churchill_step_level")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_LEVELS.map((lvl) => {
                const accessible = canAccessLevel(activeTiers, lvl);
                const colors = LEVEL_COLORS[lvl];
                const desc = LEVEL_DESCRIPTIONS[lvl];
                return (
                  <button
                    key={lvl}
                    onClick={() => selectLevel(lvl)}
                    disabled={!accessible}
                    className={`group relative text-start rounded-2xl p-4 transition-all duration-200 ${accessible ? "hover:scale-[1.03] cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", boxShadow: accessible ? `0 6px 24px -6px ${colors.glow}` : "none" }}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} shadow-lg text-lg font-extrabold text-white`}>
                        {lvl}
                      </div>
                      <p className="text-xs text-white/50">{lang === "ar" ? desc.ar : desc.en}</p>
                      {!accessible && (
                        <div className="flex items-center gap-1 text-[10px] text-white/30">
                          <Lock className="h-3 w-3" />
                          <span>{t("churchill_level_locked")}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Conversation Type */}
        {stage === "type" && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-300/70 mb-4">{t("churchill_step_type")}</p>
            <button onClick={() => selectConvType("free")} className="group w-full text-start rounded-2xl p-5 transition-all hover:scale-[1.01]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{t("churchill_type_free")}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{t("churchill_type_free_desc")}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-white/60 transition rtl:rotate-180" />
              </div>
            </button>
            <button onClick={() => selectConvType("topic")} className="group w-full text-start rounded-2xl p-5 transition-all hover:scale-[1.01]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <List className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{t("churchill_type_topic")}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{t("churchill_type_topic_desc")}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-white/60 transition rtl:rotate-180" />
              </div>
            </button>
          </div>
        )}

        {/* STEP 4: Topic Selection */}
        {stage === "topic" && level && (
          <div className="space-y-3">
            <button onClick={goBackOneStep} className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition mb-2">
              <ArrowLeft className="h-4 w-4" />
              {t("churchill_back")}
            </button>
            <p className="text-xs font-bold uppercase tracking-wider text-purple-300/70 mb-4">{t("churchill_step_topic")} — {level}</p>
            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {(topics[level] || []).map((tp) => (
                <button
                  key={tp}
                  onClick={() => selectTopic(tp)}
                  className="text-start rounded-xl px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {tp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Welcome Screen */}
        {stage === "welcome" && level && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.4)]">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-[#0d1330]">
                <MessageCircle className="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <p className="text-lg font-semibold text-white leading-relaxed">
                {t("churchill_welcome_greeting")}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] ring-1 ring-white/10 text-white/70">
                <span className="text-white/40">{t("churchill_welcome_level")}:</span>
                <span className={`font-bold bg-gradient-to-r ${LEVEL_COLORS[level].gradient} bg-clip-text text-transparent`}>{level}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] ring-1 ring-white/10 text-white/70">
                <span className="text-white/40">{t("churchill_welcome_mode_label")}:</span>
                <span className="font-bold text-white/90">{mode === "text" ? t("churchill_mode_text") : t("churchill_mode_voice")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] ring-1 ring-white/10 text-white/70">
                <span className="text-white/40">{t("churchill_welcome_topic_label")}:</span>
                <span className="font-bold text-white/90 truncate max-w-[140px]">{convType === "free" ? t("churchill_free_topic") : topic}</span>
              </span>
            </div>

            <p className="text-sm text-white/40 mt-1">{t("churchill_welcome_ready")}</p>

            <div className="flex gap-3 mt-2">
              <button
                onClick={goBackOneStep}
                className="h-12 px-6 rounded-xl text-sm font-semibold bg-white/[0.06] ring-1 ring-white/10 text-white/60 hover:text-white hover:bg-white/[0.1] transition"
              >
                {t("churchill_back")}
              </button>
              <button
                onClick={() => startChat(topic)}
                className="h-12 px-8 rounded-xl text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(124,58,237,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_14px_40px_-6px_rgba(124,58,237,0.7)] active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)" }}
              >
                {t("churchill_start")}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Chat */}
        {stage === "chat" && (
          <div className="flex flex-col h-[calc(100vh-3rem)]">
            {/* Chat header */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
              <button onClick={resetConversation} className="text-white/50 hover:text-white/80 transition">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white truncate">{t("churchill_title")} — {level}</h2>
                <p className="text-xs text-white/40 truncate">{convType === "free" ? t("churchill_free_topic") : topic}</p>
              </div>
              <button
                onClick={endAndGetFeedback}
                disabled={!canEnd}
                className="group inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:scale-[1.02] active:scale-95"
                style={{
                  background: canEnd
                    ? "linear-gradient(135deg, #059669 0%, #0d9488 100%)"
                    : "rgba(255,255,255,0.06)",
                }}
              >
                <Trophy className="h-3.5 w-3.5" />
                {t("churchill_end")}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {messages.length === 0 && !streaming && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center">
                    <PenLine className="h-5 w-5 text-white/30" />
                  </div>
                  <p className="text-sm text-white/30 max-w-xs">{t("churchill_empty_hint")}</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <GraduationCap className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-md"
                        : "bg-white/[0.06] text-white/90 ring-1 ring-white/10 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {streaming && streamingText && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <GraduationCap className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="max-w-[78%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-white/[0.06] text-white/90 ring-1 ring-white/10">
                    {streamingText}
                    <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 animate-pulse align-text-bottom" />
                  </div>
                </div>
              )}
              {streaming && !streamingText && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <GraduationCap className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md px-4 py-3.5 bg-white/[0.06] ring-1 ring-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="pt-3 border-t border-white/10">
              <form
                onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("churchill_placeholder")}
                  dir="ltr"
                  disabled={streaming}
                  className="flex-1 h-12 px-4 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400/60 transition text-sm"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || streaming}
                  className="h-12 w-12 flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition hover:shadow-xl active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 7: Feedback */}
        {stage === "feedback" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStage("chat")} className="text-white/50 hover:text-white/80 transition">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-extrabold bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
                {t("churchill_feedback_title")}
              </h2>
            </div>

            {feedbackLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 animate-ping" />
                </div>
                <p className="text-sm text-white/50">{t("churchill_feedback_loading")}</p>
              </div>
            )}

            {feedbackError && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <AlertCircle className="h-10 w-10 text-rose-400" />
                <p className="text-sm text-white/50">{t("churchill_feedback_error")}</p>
                <button
                  onClick={endAndGetFeedback}
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("churchill_feedback_retry")}
                </button>
              </div>
            )}

            {feedback && !feedbackLoading && (
              <div className="space-y-4">
                {mode === "voice" && (
                  <FeedbackCard icon={Volume2} title={t("churchill_feedback_fluency")} color="amber">
                    <p className="text-sm text-white/60">{t("churchill_feedback_voice")}</p>
                  </FeedbackCard>
                )}

                {feedback.summary && (
                  <FeedbackCard icon={Sparkles} title={t("churchill_feedback_summary")} color="purple">
                    <p className="text-sm text-white/70 leading-relaxed">{feedback.summary}</p>
                    {feedback.wordCount != null && feedback.userTurns != null && (
                      <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                        <div className="text-center">
                          <p className="text-lg font-bold text-purple-300">{feedback.wordCount}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">{lang === "ar" ? "كلمة" : "words"}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-purple-300">{feedback.userTurns}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">{lang === "ar" ? "رسالة" : "turns"}</p>
                        </div>
                      </div>
                    )}
                  </FeedbackCard>
                )}

                {feedback.grammarMistakes && feedback.grammarMistakes.length > 0 && (
                  <FeedbackCard icon={CheckCircle2} title={t("churchill_feedback_grammar")} color="rose">
                    <div className="space-y-3">
                      {feedback.grammarMistakes.map((gm, i) => (
                        <div key={i} className="rounded-xl bg-white/[0.03] p-3.5 space-y-2 ring-1 ring-white/[0.04]">
                          <div className="flex items-start gap-2">
                            <span className="text-rose-400 text-xs font-bold mt-0.5">✗</span>
                            <p className="text-sm text-rose-300/80 line-through">{gm.original}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 text-xs font-bold mt-0.5">✓</span>
                            <p className="text-sm text-emerald-300 font-medium">{gm.correction}</p>
                          </div>
                          <p className="text-xs text-white/40 ps-5">{gm.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </FeedbackCard>
                )}

                {feedback.vocabularyUpgrades && feedback.vocabularyUpgrades.length > 0 && (
                  <FeedbackCard icon={BookOpen} title={t("churchill_feedback_vocab")} color="sky">
                    <div className="space-y-3">
                      {feedback.vocabularyUpgrades.map((vu, i) => (
                        <div key={i} className="rounded-xl bg-white/[0.03] p-3.5 space-y-1.5 ring-1 ring-white/[0.04]">
                          <p className="text-sm">
                            <span className="text-white/50">{vu.original}</span>
                            <span className="text-white/20 mx-2">→</span>
                            <span className="text-sky-300 font-semibold">{vu.better}</span>
                          </p>
                          <p className="text-xs text-white/40 italic">"{vu.example}"</p>
                          <p className="text-xs text-white/30">{vu.reason}</p>
                        </div>
                      ))}
                    </div>
                  </FeedbackCard>
                )}

                {feedback.betterExpressions && feedback.betterExpressions.length > 0 && (
                  <FeedbackCard icon={Lightbulb} title={t("churchill_feedback_expressions")} color="amber">
                    <div className="space-y-3">
                      {feedback.betterExpressions.map((be, i) => (
                        <div key={i} className="rounded-xl bg-white/[0.03] p-3.5 space-y-1.5 ring-1 ring-white/[0.04]">
                          <p className="text-sm text-white/50">"{be.original}"</p>
                          <p className="text-sm text-amber-300 font-medium">→ "{be.better}"</p>
                          <p className="text-xs text-white/30">{be.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </FeedbackCard>
                )}

                {feedback.fluencyNotes && (
                  <FeedbackCard icon={MessageCircle} title={t("churchill_feedback_fluency")} color="emerald">
                    <p className="text-sm text-white/70 leading-relaxed">{feedback.fluencyNotes}</p>
                  </FeedbackCard>
                )}

                {feedback.tips && feedback.tips.length > 0 && (
                  <FeedbackCard icon={Lightbulb} title={t("churchill_feedback_tips")} color="violet">
                    <ul className="space-y-2.5">
                      {feedback.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </FeedbackCard>
                )}

                <button
                  onClick={resetConversation}
                  className="w-full mt-6 h-13 py-3.5 rounded-xl font-bold shadow-[0_10px_30px_-8px_rgba(124,58,237,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_14px_40px_-6px_rgba(124,58,237,0.6)] active:scale-[0.98] transition-all text-white"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)" }}
                >
                  {t("churchill_new")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({ icon: Icon, title, color, children }: { icon: React.ComponentType<{ className?: string }>; title: string; color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    purple: "from-purple-500/15 to-transparent border-purple-500/20",
    rose: "from-rose-500/15 to-transparent border-rose-500/20",
    sky: "from-sky-500/15 to-transparent border-sky-500/20",
    amber: "from-amber-500/15 to-transparent border-amber-500/20",
    emerald: "from-emerald-500/15 to-transparent border-emerald-500/20",
    violet: "from-violet-500/15 to-transparent border-violet-500/20",
  };
  const iconColorMap: Record<string, string> = {
    purple: "text-purple-400",
    rose: "text-rose-400",
    sky: "text-sky-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    violet: "text-violet-400",
  };
  const iconBgMap: Record<string, string> = {
    purple: "bg-purple-500/15",
    rose: "bg-rose-500/15",
    sky: "bg-sky-500/15",
    amber: "bg-amber-500/15",
    emerald: "bg-emerald-500/15",
    violet: "bg-violet-500/15",
  };

  return (
    <div className={`rounded-2xl p-5 bg-gradient-to-b ${colorMap[color] || colorMap.purple} border backdrop-blur-xl`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-7 h-7 rounded-lg ${iconBgMap[color] || iconBgMap.purple} flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${iconColorMap[color] || iconColorMap.purple}`} />
        </div>
        <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}
