import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from "react";
import {
  ArrowLeft, Mic, MessageSquare, MessageCircle, Send, Loader2, Sparkles, Square, Volume2,
  Pencil, ChevronRight, AlertCircle, CheckCircle, BookOpen, Lightbulb, Trophy,
  TrendingUp, Calendar, Clock, BarChart3, Quote, RotateCcw, LogOut, Ear
} from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#6B2FE6";
const GREEN = "#1DB954";
const YELLOW = "#F5C518";
const NAVY = "#1E2155";

// 30 general conversation topics — broader than IELTS Speaking; designed for natural chat.
const FREE_TOPICS: { name: string; emoji: string }[] = [
  { name: "Remote Learning", emoji: "💻" },
  { name: "Social Media", emoji: "📱" },
  { name: "Travel", emoji: "✈️" },
  { name: "Technology & AI", emoji: "🤖" },
  { name: "Family", emoji: "👪" },
  { name: "Environment", emoji: "🌳" },
  { name: "Food & Cooking", emoji: "🍳" },
  { name: "Music", emoji: "🎵" },
  { name: "Movies & TV", emoji: "🎬" },
  { name: "Books & Reading", emoji: "📚" },
  { name: "Sports & Fitness", emoji: "🏋️" },
  { name: "Friendship", emoji: "🤝" },
  { name: "Future Goals", emoji: "🎯" },
  { name: "City Life vs Countryside", emoji: "🏙️" },
  { name: "Hobbies", emoji: "🎨" },
  { name: "Healthy Living", emoji: "🥗" },
  { name: "Career & Work", emoji: "💼" },
  { name: "Money & Saving", emoji: "💰" },
  { name: "Education", emoji: "🎓" },
  { name: "Languages", emoji: "🗣️" },
  { name: "Mental Health", emoji: "🧠" },
  { name: "Climate Change", emoji: "🌍" },
  { name: "Online Shopping", emoji: "🛒" },
  { name: "Festivals & Traditions", emoji: "🎉" },
  { name: "Childhood Memories", emoji: "🧸" },
  { name: "Dreams & Ambition", emoji: "🌟" },
  { name: "Pets & Animals", emoji: "🐶" },
  { name: "Art & Creativity", emoji: "🎭" },
  { name: "News & Current Events", emoji: "📰" },
  { name: "Friendship Online", emoji: "💬" },
];

type ChatMessage = { role: "user" | "assistant"; content: string };
type Stage = "topic-source" | "topic-pick" | "topic-input" | "mode-pick" | "chat" | "report";

interface SessionSummary {
  id: number;
  topic: string;
  topicSource: string;
  mode: string;
  bandScore: number | null;
  durationSeconds: number;
  messageCount: number;
  createdAt: string;
}

interface FeedbackPayload {
  overallBand: number;
  summary: string;
  scores: {
    fluencyCoherence: { band: number; comment: string };
    lexicalResource: { band: number; comment: string };
    grammaticalRange: { band: number; comment: string };
    pronunciation: { band: number; comment: string };
  };
  grammarMistakes: { original: string; correction: string; explanation: string }[];
  vocabularyUpgrades: { original: string; better: string; example: string; reason: string }[];
  sentenceUpgrades: { original: string; better: string; explanation: string }[];
  tips: string[];
  wordCount?: number;
  userTurns?: number;
}

interface Props {
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
}

class FreeConvErrorBoundary extends Component<{ children: ReactNode; onBack: () => void }, { hasError: boolean; msg: string }> {
  state = { hasError: false, msg: "" };
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, msg: error instanceof Error ? error.message : String(error) };
  }
  componentDidCatch(error: unknown) {
    console.error("[Churchill] FreeConversation crash:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
          <div className="text-center space-y-4 max-w-sm">
            <AlertCircle className="w-12 h-12 mx-auto" style={{ color: YELLOW }} />
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-white/60 text-sm">{this.state.msg || "Please go back and try again."}</p>
            <button onClick={this.props.onBack} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY }}>
              Go Back
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function stripForTts(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_~`#>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(buffer: string): { ready: string[]; remainder: string } {
  // Pull out completed sentences (ending in . ! ?), leave the rest as remainder.
  const sentences: string[] = [];
  let current = "";
  for (let i = 0; i < buffer.length; i++) {
    current += buffer[i];
    const ch = buffer[i];
    if ((ch === "." || ch === "!" || ch === "?") && current.trim().length > 4) {
      // Look ahead — if next char exists and isn't whitespace/end, keep going (e.g. "U.S.")
      const next = buffer[i + 1];
      if (next === undefined || /\s/.test(next)) {
        sentences.push(current.trim());
        current = "";
      }
    }
  }
  return { ready: sentences, remainder: current };
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

function fmtRelative(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return fmtDate(iso);
  } catch { return ""; }
}

function FreeConversationInner({ onBack, onLogout, expiresAt }: Props) {
  const [stage, setStage] = useState<Stage>("topic-source");
  const [topic, setTopic] = useState<string>("");
  const [topicSource, setTopicSource] = useState<"preset" | "custom">("preset");
  const [customTopic, setCustomTopic] = useState("");
  const [mode, setMode] = useState<"voice" | "text">("voice");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<string>("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [micActive, setMicActive] = useState(false);
  const [interim, setInterim] = useState("");
  const [textInput, setTextInput] = useState("");

  const [isSpeaking, setIsSpeaking] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackPayload | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const [sessionStartAt, setSessionStartAt] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const [pastSessions, setPastSessions] = useState<SessionSummary[]>([]);
  const [pastLoading, setPastLoading] = useState(false);
  const [savedThisSession, setSavedThisSession] = useState(false);

  const messagesRef = useRef<ChatMessage[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsPlayingRef = useRef(false);
  const ttsRequestIdRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamRequestIdRef = useRef(0);
  const sendUserMessageRef = useRef<((text: string) => void) | null>(null);

  // ---- Hands-free voice session (Silero neural VAD + Whisper STT, ChatGPT-style) ----
  // vad-web is loaded dynamically inside startVoiceSession (runtime-only, browser).
  const vadRef = useRef<{ start: () => void; pause: () => void; destroy: () => void } | null>(null);
  const transcribeAbortRef = useRef<AbortController | null>(null);
  const sessionActiveRef = useRef(false);
  const aiSpeakingRef = useRef(false);
  // Real-time energy pre-trigger: parallel AudioContext analyser tap so we can
  // kill TTS within ~20ms of the user opening their mouth, BEFORE the neural
  // VAD fires its (slower, more accurate) confirmation. The two layers are
  // complementary: energy = speed, Silero = accuracy.
  const energyStreamRef = useRef<MediaStream | null>(null);
  const energyCtxRef = useRef<AudioContext | null>(null);
  const energyAnalyserRef = useRef<AnalyserNode | null>(null);
  const energyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const energyDataRef = useRef<Float32Array | null>(null);
  // Number of consecutive ~10ms frames above the barge-in energy threshold.
  // 2 = ~20ms confirmation — fast enough to feel instant, slow enough to ignore
  // single-frame mic clicks.
  const energyHotFramesRef = useRef(0);
  const lastBargeAtRef = useRef(0);
  // Barge-in arm timestamp: barge-in is ONLY allowed once performance.now()
  // exceeds this value. Set when TTS audio actually starts playing, plus a
  // grace window for the browser's AEC to converge on the new TTS audio.
  // Without this, Churchill's own first syllable leaks through laptop
  // speakers and kills his own response mid-word.
  const bargeInArmedAtRef = useRef(0);

  const [voiceActive, setVoiceActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming, isAssistantTyping]);

  // Duration ticker
  useEffect(() => {
    if (stage !== "chat" || sessionStartAt === 0) return;
    const id = setInterval(() => setDuration(Math.floor((Date.now() - sessionStartAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [stage, sessionStartAt]);

  const fetchPast = useCallback(async () => {
    setPastLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/conversation/sessions`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setPastSessions(data.sessions || []);
    } catch { /* ignore */ }
    finally { setPastLoading(false); }
  }, []);

  useEffect(() => { fetchPast(); }, [fetchPast]);

  // Make sure the mic + VAD shut down cleanly if the user navigates away mid-session.
  useEffect(() => {
    return () => {
      try { endVoiceSession(); } catch { /* ignore */ }
    };
    // endVoiceSession is intentionally captured once via closure stale-safety —
    // its body only touches refs, so a stable reference is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- TTS (sentence-buffered for ChatGPT-voice-mode feel) ----------
  const stopTts = useCallback(() => {
    ttsRequestIdRef.current += 1;
    ttsQueueRef.current = [];
    ttsPlayingRef.current = false;
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch { /* ignore */ }
      try { ttsAudioRef.current.src = ""; } catch { /* ignore */ }
      ttsAudioRef.current = null;
    }
    aiSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (ttsPlayingRef.current) return;
    const next = ttsQueueRef.current.shift();
    if (!next) {
      setIsSpeaking(false);
      aiSpeakingRef.current = false;
      return;
    }
    const myId = ttsRequestIdRef.current;
    ttsPlayingRef.current = true;
    aiSpeakingRef.current = true;
    setIsSpeaking(true);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: next, speed: 1.0 }),
      });
      if (myId !== ttsRequestIdRef.current) { ttsPlayingRef.current = false; return; }
      if (!res.ok) { ttsPlayingRef.current = false; playNextInQueue(); return; }
      const blob = await res.blob();
      if (myId !== ttsRequestIdRef.current) { ttsPlayingRef.current = false; return; }
      const url = URL.createObjectURL(blob);
      // REUSE the audio element that was unlocked inside the user gesture in
      // startVoiceSession. Creating a `new Audio()` here would lose the iOS /
      // Safari autoplay unlock and audio.play() would reject silently → "no
      // voice, just text".
      const audio = ttsAudioRef.current ?? new Audio();
      ttsAudioRef.current = audio;
      audio.onplaying = () => {
        // Arm barge-in only AFTER audio is actually playing, plus a grace
        // window so the first frames of speaker bleed don't kill Churchill
        // mid-word. AEC needs ~400-600ms to converge on new TTS audio.
        if (myId === ttsRequestIdRef.current) {
          bargeInArmedAtRef.current = performance.now() + 600;
        }
      };
      audio.onended = () => {
        URL.revokeObjectURL(url);
        ttsPlayingRef.current = false;
        if (myId === ttsRequestIdRef.current) playNextInQueue();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        ttsPlayingRef.current = false;
        if (myId === ttsRequestIdRef.current) playNextInQueue();
      };
      audio.src = url;
      try { await audio.play(); } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[tts] play() rejected", err);
        URL.revokeObjectURL(url);
        ttsPlayingRef.current = false;
        if (myId === ttsRequestIdRef.current) playNextInQueue();
      }
    } catch {
      ttsPlayingRef.current = false;
      if (myId === ttsRequestIdRef.current) playNextInQueue();
    }
  }, []);

  const enqueueTts = useCallback((text: string) => {
    if (mode !== "voice") return;
    const clean = stripForTts(text);
    if (!clean) return;
    ttsQueueRef.current.push(clean);
    playNextInQueue();
  }, [mode, playNextInQueue]);

  // ---------- Hands-free voice session (Silero neural VAD + Whisper STT) ----------
  // Float32 mono PCM @ 16 kHz (vad-web's native output) → 16-bit PCM WAV blob.
  const float32ToWavBlob = useCallback((samples: Float32Array, sampleRate = 16000): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Blob([buffer], { type: "audio/wav" });
  }, []);

  const transcribeAndSend = useCallback(async (audio: Float32Array) => {
    if (!sessionActiveRef.current) return;
    setIsTranscribing(true);
    setUserSpeaking(false);
    transcribeAbortRef.current?.abort();
    const ctrl = new AbortController();
    transcribeAbortRef.current = ctrl;
    try {
      const wav = float32ToWavBlob(audio, 16000);
      const fd = new FormData();
      fd.append("audio", wav, "speech.wav");
      const res = await fetch(`${BASE_URL}/api-intro/whisper`, {
        method: "POST",
        body: fd,
        credentials: "include",
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted || !sessionActiveRef.current) return;
      if (!res.ok) { setIsTranscribing(false); return; }
      const data = (await res.json()) as { text?: string };
      const text = (data.text || "").trim();
      setIsTranscribing(false);
      if (text && sendUserMessageRef.current) {
        sendUserMessageRef.current(text);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("[FreeConv] transcribe error:", e);
      }
      setIsTranscribing(false);
    }
  }, [float32ToWavBlob]);

  // Synchronous, sub-frame barge-in: tear down TTS and any in-flight LLM
  // stream in the SAME tick the user starts speaking. Called by both the
  // energy pre-trigger (~20ms) and Silero confirmation (~64ms).
  const triggerBargeIn = useCallback(() => {
    if (!aiSpeakingRef.current) return;
    const now = performance.now();
    // Don't allow barge-in until the arm window has elapsed AFTER TTS audio
    // actually started playing — otherwise Churchill's own first syllable
    // (leaking through laptop speakers) kills his own response.
    if (bargeInArmedAtRef.current === 0 || now < bargeInArmedAtRef.current) return;
    // Coalesce double-fires from energy + VAD within a single barge window.
    if (now - lastBargeAtRef.current < 400) return;
    lastBargeAtRef.current = now;
    stopTts();
    streamAbortRef.current?.abort();
  }, [stopTts]);

  const endVoiceSession = useCallback(() => {
    sessionActiveRef.current = false;
    setVoiceActive(false);
    setUserSpeaking(false);
    setMicLevel(0);
    setInterim("");
    setIsTranscribing(false);
    transcribeAbortRef.current?.abort();
    transcribeAbortRef.current = null;
    if (energyTimerRef.current) {
      clearInterval(energyTimerRef.current);
      energyTimerRef.current = null;
    }
    energyAnalyserRef.current = null;
    energyDataRef.current = null;
    if (energyCtxRef.current) {
      try { energyCtxRef.current.close(); } catch { /* ignore */ }
      energyCtxRef.current = null;
    }
    if (energyStreamRef.current) {
      energyStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
      energyStreamRef.current = null;
    }
    energyHotFramesRef.current = 0;
    if (vadRef.current) {
      try { vadRef.current.pause(); } catch { /* ignore */ }
      try { vadRef.current.destroy(); } catch { /* ignore */ }
      vadRef.current = null;
    }
  }, []);

  const startVoiceSession = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (sessionActiveRef.current) return true;

    // ---- Audio unlock primer (iOS Safari & strict autoplay browsers).
    // We MUST call .play() inside the user gesture before any `await`, or the
    // gesture context is lost and later TTS audio.play() rejects silently.
    // Reuse this element for every TTS clip so the unlock persists.
    try {
      if (!ttsAudioRef.current) {
        const primer = new Audio();
        primer.preload = "auto";
        // Tiny silent MP3 (~50 bytes). Playing it inside the gesture unlocks audio.
        primer.src = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQwAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAAAAAFhYsRkkmYZA=";
        primer.muted = false;
        primer.volume = 1;
        const playPromise = primer.play();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise.catch(() => { /* unlock attempt; ignore failure */ });
        }
        ttsAudioRef.current = primer;
      }
    } catch { /* ignore */ }

    // ---- Open OUR mic stream first (vad-web opens its own internally; the
    // browser de-dupes device access). We use this stream for the real-time
    // energy pre-trigger that gives sub-50ms barge-in.
    let energyStream: MediaStream;
    try {
      energyStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as MediaTrackConstraints,
      });
    } catch (e: any) {
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone access was blocked. Please allow it in your browser and start again.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No microphone was found on this device.");
      } else {
        setError("Could not access the microphone. Please switch to Text mode.");
      }
      return false;
    }
    energyStreamRef.current = energyStream;

    // ---- Wire the energy analyser. fftSize 256 = ~5.3ms of samples @48kHz,
    // smoothing 0 so we react INSTANTLY to bursts (no exponential lag).
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new Ctx();
      if (audioCtx.state === "suspended") {
        try { await audioCtx.resume(); } catch { /* ignore */ }
      }
      const source = audioCtx.createMediaStreamSource(energyStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      energyCtxRef.current = audioCtx;
      energyAnalyserRef.current = analyser;
      energyDataRef.current = new Float32Array(analyser.fftSize);
    } catch (e) {
      console.error("[FreeConv] energy analyser init failed:", e);
      energyStream.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
      energyStreamRef.current = null;
      setError("Could not initialize voice processing. Please try again.");
      return false;
    }

    try {
      const vadMod = await import("@ricky0123/vad-web");
      const { MicVAD } = vadMod as unknown as {
        MicVAD: { new: (opts: Record<string, unknown>) => Promise<{ start: () => void; pause: () => void; destroy: () => void }> };
      };
      // Host vad-web + onnxruntime-web assets from jsDelivr so we don't need to
      // copy WASM/ONNX files into /public.
      const vad = await MicVAD.new({
        baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/",
        onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/",
        // Silero tuning — balanced for snappy barge-in WITHOUT killing
        // Churchill's own first syllable from speaker bleed.
        positiveSpeechThreshold: 0.65,       // confident-speech threshold
        negativeSpeechThreshold: 0.45,
        redemptionFrames: 14,                 // ~448ms silence → end-of-speech
        preSpeechPadFrames: 6,                // ~192ms padding before start
        minSpeechFrames: 4,                   // ~128ms to confirm speech
        // Real-time mic level for the orb visual (Silero runs 30ms frames).
        onFrameProcessed: (probs: { isSpeech: number }) => {
          if (sessionActiveRef.current) setMicLevel(probs.isSpeech);
        },
        onSpeechStart: () => {
          if (!sessionActiveRef.current) return;
          // Confirmation layer: if the energy pre-trigger already barged in,
          // triggerBargeIn coalesces this no-op. If not (rare, e.g. quiet
          // speaker), this still fires within ~64ms.
          triggerBargeIn();
          // Cancel any in-flight transcription from a previous turn.
          transcribeAbortRef.current?.abort();
          setUserSpeaking(true);
        },
        onSpeechEnd: (audio: Float32Array) => {
          if (!sessionActiveRef.current) return;
          setUserSpeaking(false);
          // Skip extremely short utterances (double-guard against blanks).
          if (audio.length < 16000 * 0.25) return; // <250ms
          transcribeAndSend(audio);
        },
        onVADMisfire: () => {
          if (!sessionActiveRef.current) return;
          setUserSpeaking(false);
        },
      });
      vadRef.current = vad;
      sessionActiveRef.current = true;
      aiSpeakingRef.current = false;
      energyHotFramesRef.current = 0;
      setVoiceActive(true);

      // ---- Energy pre-trigger loop @ 10ms. Only ARMS while AI is speaking
      // AND the AEC convergence window has elapsed (see bargeInArmedAtRef).
      // Threshold 0.14 RMS sits well above worst-case TTS bleed through laptop
      // speakers (~0.05-0.10 even with AEC) but below normal speech (~0.2-0.4).
      // 4 hot frames = ~40ms of sustained voice — instant-feeling but ignores
      // coughs, key clicks, door slams, and single-frame DC pops.
      const ENERGY_RMS_THRESHOLD = 0.14;
      const ENERGY_HOT_FRAMES_REQUIRED = 4;
      energyTimerRef.current = setInterval(() => {
        if (!sessionActiveRef.current) return;
        // Save CPU when AI isn't speaking — the only purpose of this loop is
        // to interrupt TTS faster than Silero can confirm.
        if (!aiSpeakingRef.current) {
          if (energyHotFramesRef.current !== 0) energyHotFramesRef.current = 0;
          return;
        }
        const analyser = energyAnalyserRef.current;
        const data = energyDataRef.current;
        if (!analyser || !data) return;
        analyser.getFloatTimeDomainData(data as Float32Array<ArrayBuffer>);
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
        const rms = Math.sqrt(sumSq / data.length);
        if (rms > ENERGY_RMS_THRESHOLD) {
          energyHotFramesRef.current += 1;
          if (energyHotFramesRef.current >= ENERGY_HOT_FRAMES_REQUIRED) {
            // Synchronous barge-in — same tick.
            triggerBargeIn();
            energyHotFramesRef.current = 0;
          }
        } else {
          energyHotFramesRef.current = 0;
        }
      }, 10);

      vad.start();
      return true;
    } catch (e) {
      console.error("[FreeConv] VAD init failed:", e);
      setError("Could not start voice mode. Please refresh and try again, or switch to Text mode.");
      // Clean up the energy stream if VAD failed to load.
      if (energyTimerRef.current) { clearInterval(energyTimerRef.current); energyTimerRef.current = null; }
      if (energyCtxRef.current) { try { energyCtxRef.current.close(); } catch { /* ignore */ } energyCtxRef.current = null; }
      if (energyStreamRef.current) {
        energyStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
        energyStreamRef.current = null;
      }
      energyAnalyserRef.current = null;
      energyDataRef.current = null;
      return false;
    }
  }, [transcribeAndSend, triggerBargeIn]);

  // ---------- Conversation flow ----------
  const sendUserMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    stopTts();
    streamAbortRef.current?.abort();

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMsgs = [...messagesRef.current, userMsg];
    setMessages(newMsgs);
    setTextInput("");
    setStreaming("");
    setIsAssistantTyping(true);
    setError(null);

    const ctrl = new AbortController();
    streamAbortRef.current = ctrl;
    const myReqId = ++streamRequestIdRef.current;
    const isCurrent = () => myReqId === streamRequestIdRef.current && !ctrl.signal.aborted;

    let assistantText = "";
    let buffer = "";

    try {
      const res = await fetch(`${BASE_URL}/api-intro/conversation/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: ctrl.signal,
        body: JSON.stringify({ messages: newMsgs, topic, isStart: false }),
      });
      if (!isCurrent()) return;
      if (!res.ok || !res.body) throw new Error("chat_failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let leftover = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!isCurrent()) return;
        const text = leftover + decoder.decode(value, { stream: true });
        const parts = text.split("\n\n");
        leftover = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]" || payload === "[ERROR]") continue;
          try {
            const json = JSON.parse(payload);
            if (typeof json.delta === "string" && json.delta.length > 0) {
              assistantText += json.delta;
              buffer += json.delta;
              if (isCurrent()) setStreaming(assistantText);
              const split = splitSentences(buffer);
              if (split.ready.length > 0) {
                if (isCurrent()) {
                  for (const s of split.ready) enqueueTts(s);
                }
                buffer = split.remainder;
              }
            }
          } catch { /* ignore */ }
        }
      }
      if (isCurrent()) {
        const tail = buffer.trim();
        if (tail) enqueueTts(tail);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError" && isCurrent()) {
        console.error("[FreeConv] chat error:", e);
        setError("Something went wrong. Please try again.");
      }
    } finally {
      if (myReqId === streamRequestIdRef.current) {
        setIsAssistantTyping(false);
        setStreaming("");
        if (!ctrl.signal.aborted && assistantText.trim()) {
          setMessages((prev) => [...prev, { role: "assistant", content: assistantText.trim() }]);
        }
      }
    }
  }, [topic, enqueueTts, stopTts]);

  useEffect(() => { sendUserMessageRef.current = sendUserMessage; }, [sendUserMessage]);

  const startConversation = useCallback(async (chosenTopic: string, chosenMode: "voice" | "text", source: "preset" | "custom") => {
    setTopic(chosenTopic);
    setMode(chosenMode);
    setTopicSource(source);
    setMessages([]);
    setStreaming("");
    setFeedback(null);
    setFeedbackError(null);
    setSavedThisSession(false);
    setError(null);
    setSessionStartAt(Date.now());
    setDuration(0);

    // For voice mode, start the hands-free session WITHIN the user gesture (mic permission needs it).
    if (chosenMode === "voice") {
      const ok = await startVoiceSession();
      if (!ok) {
        // error is already set; do not enter chat stage
        return;
      }
    }

    setStage("chat");
    // Kick off the assistant's opening line immediately.
    setIsAssistantTyping(true);
    streamAbortRef.current?.abort();
    const ctrl = new AbortController();
    streamAbortRef.current = ctrl;
    const myReqId = ++streamRequestIdRef.current;
    const isCurrent = () => myReqId === streamRequestIdRef.current && !ctrl.signal.aborted;

    let assistantText = "";
    let buffer = "";
    try {
      const res = await fetch(`${BASE_URL}/api-intro/conversation/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: ctrl.signal,
        body: JSON.stringify({ messages: [], topic: chosenTopic, isStart: true }),
      });
      if (!isCurrent()) return;
      if (!res.ok || !res.body) throw new Error("chat_failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let leftover = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!isCurrent()) return;
        const text = leftover + decoder.decode(value, { stream: true });
        const parts = text.split("\n\n");
        leftover = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]" || payload === "[ERROR]") continue;
          try {
            const json = JSON.parse(payload);
            if (typeof json.delta === "string" && json.delta.length > 0) {
              assistantText += json.delta;
              buffer += json.delta;
              if (isCurrent()) setStreaming(assistantText);
              const split = splitSentences(buffer);
              if (split.ready.length > 0 && chosenMode === "voice" && isCurrent()) {
                for (const s of split.ready) {
                  const clean = stripForTts(s);
                  if (clean) {
                    ttsQueueRef.current.push(clean);
                    playNextInQueue();
                  }
                }
                buffer = split.remainder;
              } else if (split.ready.length > 0) {
                buffer = split.remainder;
              }
            }
          } catch { /* ignore */ }
        }
      }
      if (isCurrent()) {
        const tail = buffer.trim();
        if (tail && chosenMode === "voice") {
          const clean = stripForTts(tail);
          if (clean) { ttsQueueRef.current.push(clean); playNextInQueue(); }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError" && isCurrent()) {
        console.error("[FreeConv] opening error:", e);
        setError("Could not start the conversation. Please try again.");
      }
    } finally {
      if (myReqId === streamRequestIdRef.current) {
        setIsAssistantTyping(false);
        setStreaming("");
        if (!ctrl.signal.aborted && assistantText.trim()) {
          setMessages([{ role: "assistant", content: assistantText.trim() }]);
        }
      }
    }
  }, [playNextInQueue]);

  const endConversation = useCallback(async () => {
    stopTts();
    endVoiceSession();
    streamAbortRef.current?.abort();
    const finalMsgs = messagesRef.current;
    setStage("report");
    if (finalMsgs.length === 0) {
      setFeedback(null);
      return;
    }
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/conversation/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: finalMsgs, topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "feedback_failed");
      setFeedback(data.feedback as FeedbackPayload);

      // Persist the session
      try {
        await fetch(`${BASE_URL}/api-intro/conversation/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            topic,
            topicSource,
            mode,
            messages: finalMsgs,
            feedback: data.feedback,
            durationSeconds: Math.floor((Date.now() - sessionStartAt) / 1000),
          }),
        });
        setSavedThisSession(true);
        fetchPast();
      } catch { /* non-fatal */ }
    } catch (e: any) {
      console.error("[FreeConv] feedback error:", e);
      setFeedbackError("Could not generate the feedback report. Please try again.");
    } finally {
      setFeedbackLoading(false);
    }
  }, [topic, topicSource, mode, sessionStartAt, fetchPast, endVoiceSession, stopTts]);

  const resetAll = useCallback(() => {
    stopTts();
    endVoiceSession();
    streamAbortRef.current?.abort();
    setMessages([]);
    setStreaming("");
    setFeedback(null);
    setFeedbackError(null);
    setError(null);
    setTextInput("");
    setInterim("");
    setSavedThisSession(false);
    setStage("topic-source");
  }, [endVoiceSession, stopTts]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopTts();
    endVoiceSession();
    streamAbortRef.current?.abort();
  }, [endVoiceSession, stopTts]);

  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api-intro/auth/logout`, { method: "POST", credentials: "include" });
    onLogout?.();
  };

  // ---------- Header (shared) ----------
  const Header = ({ leftAction }: { leftAction?: () => void }) => (
    <header className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(107,47,230,0.15)" }}>
      <div className="flex items-center gap-3">
        <button onClick={leftAction || onBack} className="text-white/40 hover:text-white/70 transition-colors p-1 -ml-1" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${GREEN}25`, border: `1px solid ${GREEN}55` }}>
            <MessageCircle className="w-4 h-4" style={{ color: GREEN }} />
          </div>
          <div>
            <div className="font-black text-white text-sm leading-none">Free Conversation</div>
            <div className="text-[10px] font-semibold" style={{ color: GREEN }}>natural chat</div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DaysLeftBadge expiresAt={expiresAt} />
        {onLogout && (
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-2.5 py-1.5 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            <LogOut className="w-3 h-3" />
          </button>
        )}
      </div>
    </header>
  );

  // ---------- STAGE: topic-source ----------
  if (stage === "topic-source") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8">
          <div className="text-center max-w-md">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
              What would you like to <span style={{ color: GREEN }}>talk about?</span>
            </h1>
            <p className="text-white/60 text-sm">Pick a topic from our list, or bring your own.</p>
          </div>
          <div className="w-full max-w-2xl grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setStage("topic-pick")}
              className="group flex flex-col gap-3 p-6 rounded-3xl text-left transition-all hover:scale-[1.015]"
              style={{ background: `linear-gradient(160deg, rgba(107,47,230,0.18), rgba(107,47,230,0.05))`, border: `1px solid rgba(107,47,230,0.35)` }}
            >
              <BookOpen className="w-7 h-7" style={{ color: TEAL }} />
              <h2 className="text-xl font-black text-white">Choose a topic</h2>
              <p className="text-white/60 text-sm">30 popular conversation starters — from Travel to Technology.</p>
              <div className="mt-auto flex items-center gap-2 text-sm font-bold pt-2" style={{ color: TEAL }}>
                Browse topics <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
            <button
              onClick={() => setStage("topic-input")}
              className="group flex flex-col gap-3 p-6 rounded-3xl text-left transition-all hover:scale-[1.015]"
              style={{ background: `linear-gradient(160deg, rgba(245,197,24,0.18), rgba(245,197,24,0.05))`, border: `1px solid rgba(245,197,24,0.35)` }}
            >
              <Pencil className="w-7 h-7" style={{ color: YELLOW }} />
              <h2 className="text-xl font-black text-white">Your own topic</h2>
              <p className="text-white/60 text-sm">Type anything you want to discuss — work, hobbies, current events.</p>
              <div className="mt-auto flex items-center gap-2 text-sm font-bold pt-2" style={{ color: YELLOW }}>
                Write a topic <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          </div>

          {pastSessions.length > 0 && (
            <div className="w-full max-w-2xl rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" style={{ color: TEAL }} />
                <h3 className="font-bold text-white text-sm">Your last session</h3>
              </div>
              <PastSessionRow s={pastSessions[0]} />
            </div>
          )}
        </main>
      </div>
    );
  }

  // ---------- STAGE: topic-pick ----------
  if (stage === "topic-pick") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
        <Header leftAction={() => setStage("topic-source")} />
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-5">
              <h1 className="text-2xl font-black text-white mb-1">Choose a topic</h1>
              <p className="text-white/50 text-sm">Tap one to start chatting.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {FREE_TOPICS.map((t) => (
                <button
                  key={t.name}
                  onClick={() => { setTopic(t.name); setTopicSource("preset"); setStage("mode-pick"); }}
                  className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-left transition-all hover:scale-[1.02]"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <span className="text-xl">{t.emoji}</span>
                  <span className="text-sm font-semibold text-white/90">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---------- STAGE: topic-input ----------
  if (stage === "topic-input") {
    const canContinue = customTopic.trim().length >= 2;
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
        <Header leftAction={() => setStage("topic-source")} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-6">
          <div className="w-full max-w-md text-center">
            <Pencil className="w-10 h-10 mx-auto mb-3" style={{ color: YELLOW }} />
            <h1 className="text-2xl font-black text-white mb-1">Your own topic</h1>
            <p className="text-white/55 text-sm">What would you like to talk about?</p>
          </div>
          <div className="w-full max-w-md space-y-3">
            <input
              autoFocus
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canContinue) { setTopic(customTopic.trim()); setTopicSource("custom"); setStage("mode-pick"); } }}
              placeholder="e.g. living in Riyadh, my favorite TV show, AI in healthcare..."
              className="w-full rounded-2xl px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 transition-all"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", "--tw-ring-color": YELLOW } as React.CSSProperties}
            />
            <button
              disabled={!canContinue}
              onClick={() => { setTopic(customTopic.trim()); setTopicSource("custom"); setStage("mode-pick"); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${YELLOW}, #FFD93B)`, color: NAVY }}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ---------- STAGE: mode-pick ----------
  if (stage === "mode-pick") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
        <Header leftAction={() => setStage(topicSource === "custom" ? "topic-input" : "topic-pick")} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-7">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <Sparkles className="w-3 h-3" style={{ color: GREEN }} />
              <span className="text-xs font-bold text-white">Topic: {topic}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">How do you want to chat?</h1>
            <p className="text-white/55 text-sm">You can switch later by ending the session.</p>
          </div>
          <div className="w-full max-w-2xl grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => startConversation(topic, "voice", topicSource)}
              className="group flex flex-col gap-3 p-6 rounded-3xl text-left transition-all hover:scale-[1.015]"
              style={{ background: `linear-gradient(160deg, rgba(29,185,84,0.18), rgba(29,185,84,0.05))`, border: `1px solid rgba(29,185,84,0.35)` }}
            >
              <Mic className="w-7 h-7" style={{ color: GREEN }} />
              <h2 className="text-xl font-black text-white">Voice</h2>
              <p className="text-white/60 text-sm">Hands-free conversation. Just talk — Churchill listens, replies out loud, and you can interrupt him anytime.</p>
              <div className="mt-auto flex items-center gap-2 text-sm font-bold pt-2" style={{ color: GREEN }}>
                Start voice chat <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
            <button
              onClick={() => startConversation(topic, "text", topicSource)}
              className="group flex flex-col gap-3 p-6 rounded-3xl text-left transition-all hover:scale-[1.015]"
              style={{ background: `linear-gradient(160deg, rgba(107,47,230,0.18), rgba(107,47,230,0.05))`, border: `1px solid rgba(107,47,230,0.35)` }}
            >
              <MessageSquare className="w-7 h-7" style={{ color: TEAL }} />
              <h2 className="text-xl font-black text-white">Text</h2>
              <p className="text-white/60 text-sm">Type your responses. Best for quiet places or when you prefer reading.</p>
              <div className="mt-auto flex items-center gap-2 text-sm font-bold pt-2" style={{ color: TEAL }}>
                Start text chat <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ---------- STAGE: chat ----------
  if (stage === "chat") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
        <header className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(107,47,230,0.15)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${GREEN}25`, border: `1px solid ${GREEN}55` }}>
              <MessageCircle className="w-4 h-4" style={{ color: GREEN }} />
            </div>
            <div className="min-w-0">
              <div className="font-black text-white text-sm leading-tight truncate">{topic}</div>
              <div className="text-[10px] text-white/45 flex items-center gap-2">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDuration(duration)}</span>
                <span>·</span>
                <span className="capitalize flex items-center gap-1">
                  {mode === "voice" ? <Mic className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                  {mode}
                </span>
                {isSpeaking && (
                  <span className="flex items-center gap-1" style={{ color: GREEN }}>
                    · <Volume2 className="w-3 h-3 animate-pulse" /> speaking
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={endConversation}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all hover:scale-[1.03] shrink-0"
            style={{ background: "rgba(239,68,68,0.18)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.4)" }}
          >
            <Square className="w-3.5 h-3.5" />
            End & Get Feedback
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && !isAssistantTyping && (
              <div className="text-center py-12 text-white/40 text-sm">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Starting the conversation...
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}
            {streaming && (
              <MessageBubble role="assistant" content={streaming} streaming />
            )}
            {isAssistantTyping && !streaming && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-white/50 text-sm" style={{ background: "rgba(255,255,255,0.04)", maxWidth: "fit-content" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Churchill is thinking...
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </main>

        <footer className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid rgba(107,47,230,0.15)", background: "rgba(0,0,0,0.2)" }}>
          <div className="max-w-2xl mx-auto">
            {mode === "voice" ? (
              <VoiceOrb
                voiceActive={voiceActive}
                userSpeaking={userSpeaking}
                aiSpeaking={isSpeaking}
                micLevel={micLevel}
                isTranscribing={isTranscribing}
                isAssistantTyping={isAssistantTyping}
              />
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendUserMessage(textInput); } }}
                  placeholder="Type your reply..."
                  rows={1}
                  disabled={isAssistantTyping}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 resize-none max-h-32 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", "--tw-ring-color": TEAL } as React.CSSProperties}
                />
                <button
                  onClick={() => sendUserMessage(textInput)}
                  disabled={!textInput.trim() || isAssistantTyping}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY }}
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </footer>
      </div>
    );
  }

  // ---------- STAGE: report ----------
  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
      <header className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(107,47,230,0.15)" }}>
        <div className="flex items-center gap-3">
          <button onClick={resetAll} className="text-white/40 hover:text-white/70 transition-colors p-1 -ml-1" aria-label="New session">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" style={{ color: YELLOW }} />
            <span className="font-black text-white text-sm">Session Report</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DaysLeftBadge expiresAt={expiresAt} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-2xl mx-auto space-y-4">

          {feedbackLoading && (
            <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: TEAL }} />
              <p className="text-white/70 font-semibold text-sm">Analysing your conversation...</p>
              <p className="text-white/40 text-xs mt-1">Hold on a moment.</p>
            </div>
          )}

          {!feedbackLoading && feedbackError && (
            <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" style={{ color: "#fca5a5" }} />
                <h3 className="font-bold text-white">Could not generate report</h3>
              </div>
              <p className="text-white/70 text-sm">{feedbackError}</p>
              <button onClick={endConversation} className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: `${TEAL}30`, color: TEAL, border: `1px solid ${TEAL}50` }}>
                <RotateCcw className="inline w-3.5 h-3.5 mr-1" /> Try again
              </button>
            </div>
          )}

          {!feedbackLoading && !feedbackError && !feedback && messages.length === 0 && (
            <div className="rounded-2xl p-6 text-center text-white/60" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-sm">No conversation to analyse.</p>
            </div>
          )}

          {feedback && (
            <>
              <BandHero feedback={feedback} duration={duration} topic={topic} previousBest={pastSessions.find(s => s.id !== undefined && s.bandScore != null)?.bandScore ?? null} />
              <ScoreGrid feedback={feedback} />
              <SectionCard title="Overall Assessment" icon={<Sparkles className="w-4 h-4" style={{ color: TEAL }} />}>
                <p className="text-white/80 text-sm leading-relaxed">{feedback.summary}</p>
              </SectionCard>
              {feedback.grammarMistakes?.length > 0 && (
                <SectionCard title={`Grammar Corrections (${feedback.grammarMistakes.length})`} icon={<CheckCircle className="w-4 h-4" style={{ color: GREEN }} />}>
                  <div className="space-y-3">
                    {feedback.grammarMistakes.map((g, i) => (
                      <div key={i} className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-xs text-red-300 line-through opacity-80"><Quote className="inline w-3 h-3 mr-1" />{g.original}</div>
                        <div className="text-xs font-semibold" style={{ color: GREEN }}>→ {g.correction}</div>
                        <div className="text-[11px] text-white/45 italic">{g.explanation}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
              {feedback.vocabularyUpgrades?.length > 0 && (
                <SectionCard title={`Better Vocabulary (${feedback.vocabularyUpgrades.length})`} icon={<BookOpen className="w-4 h-4" style={{ color: TEAL }} />}>
                  <div className="space-y-3">
                    {feedback.vocabularyUpgrades.map((v, i) => (
                      <div key={i} className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-xs">
                          <span className="text-white/50">{v.original}</span>
                          <span className="mx-1.5 text-white/30">→</span>
                          <span className="font-bold" style={{ color: TEAL }}>{v.better}</span>
                        </div>
                        <div className="text-[11px] text-white/55 italic">"{v.example}"</div>
                        <div className="text-[11px] text-white/40">{v.reason}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
              {feedback.sentenceUpgrades?.length > 0 && (
                <SectionCard title={`Stronger Sentences (${feedback.sentenceUpgrades.length})`} icon={<Sparkles className="w-4 h-4" style={{ color: YELLOW }} />}>
                  <div className="space-y-3">
                    {feedback.sentenceUpgrades.map((s, i) => (
                      <div key={i} className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-xs text-white/50">{s.original}</div>
                        <div className="text-xs font-semibold" style={{ color: YELLOW }}>→ {s.better}</div>
                        <div className="text-[11px] text-white/45 italic">{s.explanation}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
              {feedback.tips?.length > 0 && (
                <SectionCard title="Tips for Next Time" icon={<Lightbulb className="w-4 h-4" style={{ color: YELLOW }} />}>
                  <ul className="space-y-2">
                    {feedback.tips.map((t, i) => (
                      <li key={i} className="flex gap-2 text-sm text-white/80">
                        <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: `${YELLOW}25`, color: YELLOW }}>{i + 1}</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </>
          )}

          {/* Progress */}
          {pastSessions.length > 0 && (
            <SectionCard title="Your Progress" icon={<TrendingUp className="w-4 h-4" style={{ color: GREEN }} />}>
              <ProgressChart sessions={pastSessions} />
              <div className="mt-4 space-y-2">
                {pastSessions.slice(0, 5).map((s) => (
                  <PastSessionRow key={s.id} s={s} highlight={savedThisSession && s.id === pastSessions[0].id} />
                ))}
                {pastLoading && <div className="text-xs text-white/40 text-center py-2"><Loader2 className="inline w-3 h-3 animate-spin mr-1" />Loading...</div>}
              </div>
            </SectionCard>
          )}

          <div className="grid sm:grid-cols-2 gap-3 pt-2 pb-6">
            <button
              onClick={resetAll}
              className="py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              style={{ background: `linear-gradient(135deg, ${GREEN}, #2ed968)`, color: NAVY }}
            >
              <MessageCircle className="w-4 h-4" />
              New Conversation
            </button>
            <button
              onClick={onBack}
              className="py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Menu
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ----- Subcomponents -----

function VoiceOrb({
  voiceActive, userSpeaking, aiSpeaking, micLevel, isTranscribing, isAssistantTyping,
}: {
  voiceActive: boolean;
  userSpeaking: boolean;
  aiSpeaking: boolean;
  micLevel: number;
  isTranscribing: boolean;
  isAssistantTyping: boolean;
}) {
  // micLevel here is Silero's speech-probability (0..1) — already normalized.
  const levelScale = Math.min(1 + micLevel * 0.8, 1.55);
  const aiPulseScale = aiSpeaking ? 1.3 : 1;
  const status = !voiceActive
    ? "Connecting..."
    : userSpeaking
      ? "Listening..."
      : isTranscribing
        ? "Got it..."
        : aiSpeaking
          ? "Churchill is speaking — just talk to interrupt"
          : isAssistantTyping
            ? "Thinking..."
            : "Go ahead, I'm listening";

  const ringColor = userSpeaking ? GREEN : aiSpeaking ? YELLOW : TEAL;
  const innerGradient = userSpeaking
    ? `linear-gradient(135deg, ${GREEN}, #2ed968)`
    : aiSpeaking
      ? `linear-gradient(135deg, ${YELLOW}, #FFD93B)`
      : `linear-gradient(135deg, ${TEAL}, #8B5FF6)`;

  return (
    <div className="flex flex-col items-center gap-3 py-1">
      <div className="w-full text-center text-xs text-white/55 italic min-h-[1.25rem] truncate px-4">
        {isTranscribing ? "Transcribing..." : "\u00A0"}
      </div>
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer halos that react to who's talking */}
        <span
          className="absolute inset-0 rounded-full transition-transform duration-100 ease-out"
          style={{
            background: `${ringColor}33`,
            transform: `scale(${userSpeaking ? levelScale : aiPulseScale})`,
            opacity: voiceActive ? 0.7 : 0.3,
          }}
        />
        <span
          className={`absolute inset-2 rounded-full ${aiSpeaking ? "animate-ping" : ""}`}
          style={{
            background: `${ringColor}22`,
            opacity: voiceActive ? 0.6 : 0.25,
          }}
        />
        {/* Inner orb */}
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-100"
          style={{
            background: innerGradient,
            boxShadow: `0 8px 28px ${ringColor}66`,
            transform: `scale(${userSpeaking ? Math.min(1 + micLevel * 1.5, 1.15) : aiSpeaking ? 1.06 : 1})`,
          }}
        >
          {aiSpeaking ? (
            <Volume2 className="w-7 h-7 text-white" />
          ) : userSpeaking ? (
            <Mic className="w-7 h-7 text-white" />
          ) : (
            <Ear className="w-7 h-7 text-white" />
          )}
        </div>
      </div>
      <p className="text-[11px] text-white/50 text-center font-semibold tracking-wide">
        {status}
      </p>
    </div>
  );
}

function MessageBubble({ role, content, streaming }: { role: "user" | "assistant"; content: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? { background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY, fontWeight: 600, borderBottomRightRadius: 6 }
            : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.92)", border: "1px solid rgba(255,255,255,0.08)", borderBottomLeftRadius: 6 }
        }
      >
        {content}
        {streaming && <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: "rgba(255,255,255,0.6)" }} />}
      </div>
    </div>
  );
}

function bandColor(band: number | null | undefined): string {
  if (band == null) return "rgba(255,255,255,0.4)";
  if (band >= 7) return GREEN;
  if (band >= 6) return TEAL;
  if (band >= 5) return YELLOW;
  return "#fca5a5";
}

function BandHero({ feedback, duration, topic, previousBest }: { feedback: FeedbackPayload; duration: number; topic: string; previousBest: number | null }) {
  const band = feedback.overallBand;
  const color = bandColor(band);
  const delta = previousBest != null ? band - previousBest : null;
  return (
    <div className="rounded-3xl p-5 text-center" style={{ background: `linear-gradient(160deg, ${color}25, ${color}08)`, border: `1px solid ${color}40` }}>
      <div className="text-[11px] text-white/50 uppercase tracking-wider font-bold mb-1">Estimated Band</div>
      <div className="text-6xl font-black" style={{ color }}>{band.toFixed(1)}</div>
      <div className="text-xs text-white/50 mt-1 mb-3">{topic} · {fmtDuration(duration)}</div>
      {delta !== null && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{
          background: delta > 0 ? `${GREEN}20` : delta < 0 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
          color: delta > 0 ? GREEN : delta < 0 ? "#fca5a5" : "rgba(255,255,255,0.6)",
        }}>
          <TrendingUp className="w-3 h-3" style={delta < 0 ? { transform: "scaleY(-1)" } : undefined} />
          {delta > 0 ? `+${delta.toFixed(1)} from last best` : delta < 0 ? `${delta.toFixed(1)} from last best` : "Same as last best"}
        </div>
      )}
    </div>
  );
}

function ScoreGrid({ feedback }: { feedback: FeedbackPayload }) {
  const items: { key: keyof FeedbackPayload["scores"]; label: string }[] = [
    { key: "fluencyCoherence", label: "Fluency" },
    { key: "lexicalResource", label: "Vocabulary" },
    { key: "grammaticalRange", label: "Grammar" },
    { key: "pronunciation", label: "Pronunciation" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ key, label }) => {
        const s = feedback.scores?.[key];
        if (!s) return null;
        const color = bandColor(s.band);
        return (
          <div key={key} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</div>
              <div className="text-xl font-black" style={{ color }}>{s.band.toFixed(1)}</div>
            </div>
            <p className="text-[11px] text-white/55 leading-snug">{s.comment}</p>
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-bold text-white text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PastSessionRow({ s, highlight }: { s: SessionSummary; highlight?: boolean }) {
  const color = bandColor(s.bandScore);
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: highlight ? `${GREEN}15` : "rgba(255,255,255,0.03)",
        border: highlight ? `1px solid ${GREEN}40` : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-black" style={{ background: `${color}20`, color }}>
        {s.bandScore != null ? s.bandScore.toFixed(1) : "—"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{s.topic}</div>
        <div className="text-[11px] text-white/40 flex items-center gap-2">
          <Calendar className="w-3 h-3" />{fmtRelative(s.createdAt)}
          <span>·</span>
          <Clock className="w-3 h-3" />{fmtDuration(s.durationSeconds)}
          <span>·</span>
          <span className="capitalize">{s.mode}</span>
        </div>
      </div>
      {highlight && (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: GREEN, color: NAVY }}>NEW</span>
      )}
    </div>
  );
}

function ProgressChart({ sessions }: { sessions: SessionSummary[] }) {
  const scored = [...sessions].filter((s) => s.bandScore != null).reverse(); // chronological
  if (scored.length === 0) {
    return <p className="text-xs text-white/40 italic">No band scores yet — finish a few sessions to see your trend.</p>;
  }
  const W = 320;
  const H = 100;
  const PAD = 14;
  const minBand = 3;
  const maxBand = 9;
  const xStep = scored.length > 1 ? (W - PAD * 2) / (scored.length - 1) : 0;
  const yFor = (b: number) => H - PAD - ((b - minBand) / (maxBand - minBand)) * (H - PAD * 2);
  const points = scored.map((s, i) => ({ x: PAD + i * xStep, y: yFor(s.bandScore as number), b: s.bandScore as number, t: s.topic }));
  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const area = `${path} L ${points[points.length - 1].x} ${H - PAD} L ${points[0].x} ${H - PAD} Z`;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-white/50">
        <BarChart3 className="w-3.5 h-3.5" />
        Band score over your last {scored.length} session{scored.length === 1 ? "" : "s"}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[5, 6, 7, 8].map((g) => (
          <line key={g} x1={PAD} x2={W - PAD} y1={yFor(g)} y2={yFor(g)} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 3" />
        ))}
        <path d={area} fill={`${TEAL}20`} />
        <path d={path} fill="none" stroke={TEAL} strokeWidth="2" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={NAVY} stroke={bandColor(p.b)} strokeWidth="2" />
            <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)" fontWeight="bold">
              {p.b.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Default export wrapped in error boundary
export default function FreeConversation(props: Props) {
  return (
    <FreeConvErrorBoundary onBack={props.onBack}>
      <FreeConversationInner {...props} />
    </FreeConvErrorBoundary>
  );
}

