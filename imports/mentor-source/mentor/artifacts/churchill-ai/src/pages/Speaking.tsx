import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from "react";
import {
  Mic, MicOff, Send, ChevronRight, RotateCcw, Timer, Trophy,
  MessageSquare, Loader2, CheckCircle, AlertCircle, BookOpen, Sparkles,
  Volume2, VolumeX, ArrowLeft, Square, LogOut
} from "lucide-react";
import { useAudioPlayback } from "@workspace/integrations-openai-ai-react/audio";
import DaysLeftBadge from "../components/DaysLeftBadge";
import FeedbackPopup from "../components/FeedbackPopup";

class SpeakingErrorBoundary extends Component<{ children: ReactNode; onBack: () => void }, { hasError: boolean; errorMsg: string; errorStack: string }> {
  state = { hasError: false, errorMsg: "", errorStack: "" };
  static getDerivedStateFromError(error: unknown) {
    let msg = "Unknown error";
    let stack = "";
    if (error instanceof Error) {
      msg = error.message || error.name || "Error (no message)";
      stack = error.stack || "";
    } else if (typeof error === "string") {
      msg = error;
    } else {
      try { msg = JSON.stringify(error); } catch { msg = String(error); }
    }
    return { hasError: true, errorMsg: msg, errorStack: stack };
  }
  componentDidCatch(error: unknown, errorInfo: { componentStack?: string }) {
    console.error("[Churchill AI] Speaking crash:", error);
    if (errorInfo?.componentStack) console.error("[Churchill AI] Component stack:", errorInfo.componentStack);
    if (errorInfo?.componentStack && !this.state.errorStack) {
      this.setState({ errorStack: errorInfo.componentStack });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "linear-gradient(160deg, #071422 0%, #0A1A30 40%, #0C2040 100%)" }}>
          <div className="text-center space-y-4 max-w-sm">
            <AlertCircle className="w-12 h-12 mx-auto" style={{ color: "#F5C518" }} />
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-white/60 text-sm">The speaking session encountered an error. This can happen if your browser doesn't support voice features.</p>
            <div className="text-left mt-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-red-400 text-xs font-mono break-all">{this.state.errorMsg}</p>
              {this.state.errorStack && (
                <details className="mt-2">
                  <summary className="text-white/30 text-xs cursor-pointer">Stack trace</summary>
                  <pre className="text-white/20 text-[10px] font-mono mt-1 whitespace-pre-wrap break-all max-h-40 overflow-auto">{this.state.errorStack}</pre>
                </details>
              )}
            </div>
            <div className="space-y-2">
              <button onClick={() => this.setState({ hasError: false, errorMsg: "", errorStack: "" })} className="w-full py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #00B4C8, #00D4F0)", color: "#0A1A30" }}>
                Try Again
              </button>
              <button onClick={this.props.onBack} className="w-full py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90 text-white/60" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const WORKLET_URL = `${BASE_URL}/audio-playback-worklet.js`;

const TOPICS = [
  "Weather","Seasons","Nature","Animals","Environment","Plants","Oceans","Mountains","Forests","Climate change",
  "Daily routine","Food & cooking","Sports","Music","Reading","Shopping","Fashion","Sleep habits","Morning routines","Cooking",
  "Eating out","Street food","Diets","Exercise habits","Weekend activities",
  "Friends","Family","Neighbors","Childhood","Relationships","Social media","Festivals","Celebrations","Weddings","Traditions","Community","Volunteering",
  "Hometown","Travel","Cities","Villages","Parks","Museums","Restaurants","Airports","Hotels","Beaches","Markets","Landmarks",
  "School","University","Teachers","Studying","Online learning","Libraries","Exams","Scholarships","Subjects","Homework",
  "Work","Career goals","Money","Success","Ambition","Retirement","Future plans","Business","Job interviews","Salaries","Working from home","Entrepreneurship",
  "Internet","Phones","AI","Games","Transportation","Space","Innovation","Social apps","Online shopping","Robots","Electric cars","Smart homes",
  "Health","Exercise","Mental health","Hobbies","Relaxation","Happiness","Stress","Sleep","Hospitals","Medicine","Healthy eating","Work-life balance",
  "Movies","Art","Photography","Languages","Cultural heritage","History","Books","Music genres","Theater","Dance","Crafts","Architecture",
  "Kindness","Leadership","Patience","Honesty","Personal ambition","Creativity","Decision making","Risk taking","Role models","Heroes","Memories","Dreams","Personal goals",
];

const CUE_CARDS: Record<string, string> = {
  "Weather":"a time when the weather had a strong effect on your plans or mood",
  "Seasons":"a season of the year that is special or meaningful to you",
  "Nature":"a place in nature that you find beautiful or peaceful",
  "Animals":"an animal that you find interesting or that has been important to you",
  "Environment":"something you or others do to help protect the environment",
  "Plants":"a plant, flower, or garden that you find meaningful",
  "Oceans":"a memorable experience you had near the sea or ocean",
  "Mountains":"a mountain or outdoor landscape you have visited or would like to visit",
  "Forests":"a forest, park, or green area that you enjoy or find interesting",
  "Climate change":"something you have noticed about climate change or its effects",
  "Daily routine":"a typical day in your life",
  "Food & cooking":"a meal or dish that is special to you",
  "Sports":"a sport or physical activity you enjoy or have tried",
  "Music":"a song, artist, or type of music that is meaningful to you",
  "Reading":"a book, article, or story that impressed or influenced you",
  "Shopping":"a purchase or shopping experience you remember well",
  "Fashion":"an item of clothing or style that is meaningful to you",
  "Sleep habits":"a sleep habit or bedtime routine that you follow",
  "Morning routines":"your morning routine or a morning that stands out in your memory",
  "Cooking":"a dish you enjoy cooking or a cooking experience you remember",
  "Eating out":"a restaurant or café that you have enjoyed visiting",
  "Street food":"a type of street food or local snack that you enjoy",
  "Diets":"a change in eating habits or diet that has affected your life",
  "Exercise habits":"a form of exercise or physical activity you do regularly",
  "Weekend activities":"something you enjoy doing at the weekend",
  "Friends":"a close friend and your friendship with them",
  "Family":"a family member who has been important to you",
  "Neighbors":"a neighbour or someone who lives near you that you find interesting",
  "Childhood":"a memory or experience from your childhood that stands out",
  "Relationships":"an important relationship in your life and what makes it special",
  "Social media":"a social media platform or online community you use",
  "Festivals":"a festival or cultural event you have attended or celebrated",
  "Celebrations":"a celebration or special occasion that you remember well",
  "Weddings":"a wedding or marriage ceremony you have attended or know about",
  "Traditions":"a tradition in your family or culture that is meaningful to you",
  "Community":"a community group, club, or organisation you are part of or know about",
  "Volunteering":"a time when you or someone you know volunteered to help others",
  "Hometown":"a place you grew up in or know very well",
  "Travel":"a journey or trip that was particularly memorable",
  "Cities":"a city you have visited or would like to visit",
  "Villages":"a village or small town you have visited or heard about",
  "Parks":"a park or outdoor public space you enjoy",
  "Museums":"a museum, gallery, or cultural site you have visited",
  "Restaurants":"a restaurant or place to eat that you have enjoyed",
  "Airports":"an experience you had at an airport or while travelling",
  "Hotels":"a hotel or place you have stayed that was memorable",
  "Beaches":"a beach or coastal area you have visited or would like to visit",
  "Markets":"a market or street bazaar you have visited",
  "Landmarks":"a famous landmark or historical site you have seen",
  "School":"a school, teacher, or learning experience from your past",
  "University":"a university or higher education experience",
  "Teachers":"a teacher or mentor who has had a positive impact on you",
  "Studying":"a subject or topic you have studied and found interesting",
  "Online learning":"an online course, video, or learning platform you have used",
  "Libraries":"a library or place where you like to study or read",
  "Exams":"an important exam or test you have taken",
  "Scholarships":"a scholarship, award, or academic achievement you know about",
  "Subjects":"a school subject you found interesting or challenging",
  "Homework":"a homework task or assignment you remember from school",
  "Work":"a job or work experience that has been important to you",
  "Career goals":"a career goal or professional ambition you have",
  "Money":"something money-related that has taught you an important lesson",
  "Success":"a success or achievement you are proud of",
  "Ambition":"an ambition or dream you have for the future",
  "Retirement":"an older person you know and their life after retirement",
  "Future plans":"a plan or goal you have for the near or distant future",
  "Business":"a business idea you have or an entrepreneur you admire",
  "Job interviews":"a job interview or application process you have experienced",
  "Salaries":"a job or career that you think should be better paid",
  "Working from home":"an experience of working or studying from home",
  "Entrepreneurship":"an entrepreneur or small business that you admire",
  "Internet":"a website, app, or online service that has changed your daily life",
  "Phones":"a mobile phone or device that has been important to you",
  "AI":"a use of artificial intelligence that you find interesting or useful",
  "Games":"a video game, board game, or online game you enjoy",
  "Transportation":"a form of transport or journey that stands out in your memory",
  "Space":"something related to space exploration that fascinates you",
  "Innovation":"a recent invention or technological innovation you find impressive",
  "Social apps":"a social media app or online platform you use regularly",
  "Online shopping":"an experience you have had with online shopping",
  "Robots":"a robot or automated machine that you have seen or read about",
  "Electric cars":"an electric vehicle or new type of transport you find interesting",
  "Smart homes":"a smart device or home technology you use or find interesting",
  "Health":"a health habit or practice that has been important in your life",
  "Exercise":"a form of exercise or physical activity that you enjoy",
  "Mental health":"something that helps you relax or maintain your mental wellbeing",
  "Hobbies":"a hobby or free-time activity that you enjoy",
  "Relaxation":"a way you like to relax and unwind after a busy day",
  "Happiness":"something or someone that makes you feel genuinely happy",
  "Stress":"a stressful situation and how you dealt with it",
  "Sleep":"a sleep routine or experience related to sleep that you remember",
  "Hospitals":"an experience you or someone close to you had in a hospital",
  "Medicine":"a medical advance or treatment that you find impressive",
  "Healthy eating":"a healthy food or eating habit that you practice or admire",
  "Work-life balance":"something you do to maintain a healthy balance between work and personal life",
  "Movies":"a film or movie that has had an impact on you",
  "Art":"a painting, sculpture, or work of art that you find meaningful",
  "Photography":"a photograph or photographer that has impressed you",
  "Languages":"a language you have learned or would like to learn",
  "Cultural heritage":"a cultural tradition or heritage that you find fascinating",
  "History":"a historical event or period that you find fascinating",
  "Books":"a book that has made a strong impression on you",
  "Music genres":"a style of music or genre that you enjoy",
  "Theater":"a live performance or theatre show you have seen",
  "Dance":"a type of dance or dancing experience you enjoy or admire",
  "Crafts":"a craft, art project, or creative activity you enjoy",
  "Architecture":"a building or architectural style that you find impressive",
  "Kindness":"an act of kindness that you have witnessed or experienced",
  "Leadership":"a leader or person in authority you admire",
  "Patience":"a time when patience helped you or someone else succeed",
  "Honesty":"a time when honesty made an important difference in a situation",
  "Personal ambition":"a personal ambition or aspiration that drives you forward",
  "Creativity":"a creative person or creative project that you admire",
  "Decision making":"an important decision you have made that changed your life",
  "Risk taking":"a risk you or someone you know took and what happened as a result",
  "Role models":"a person who has been a role model or inspiration to you",
  "Heroes":"a hero or admirable person from real life or history",
  "Memories":"a childhood or family memory that is special to you",
  "Dreams":"a dream or aspiration you have had since you were young",
  "Personal goals":"a personal goal you are working towards right now",
};

const PART_LIMITS = { 1: 8, 2: 1, 3: 4 };
const PREP_TIME = 60;
const USED_TOPICS_KEY = "churchill_used_topics";
const TTS_SPEED_KEY = "churchill_tts_speed";

const VOICE_INTRO = "Welcome to Churchill AI. I am your personal IELTS Speaking Examiner. Please relax, speak naturally, and let's begin your practice session.";
const GOODBYE_MESSAGE = "This has been Churchill AI. Thank you for practising today. Keep going, stay consistent, and your band score will improve. Goodbye and good luck.";

const SPEED_OPTIONS = [
  { value: 0.75, label: "Slow", arabic: "بطيء" },
  { value: 1.0,  label: "Normal", arabic: "طبيعي" },
  { value: 1.25, label: "Fast",  arabic: "سريع" },
] as const;

interface Message { role: "user" | "assistant"; content: string; }
interface ReportData {
  overallBand: number;
  fluencyCoherence: { band: number; comment: string };
  lexicalResource: { band: number; comment: string };
  grammaticalRange: { band: number; comment: string };
  pronunciation: { band: number; tips: string[] };
  topVocab: string[];
  strengths: string[];
  improvements: string[];
  recommendation?: string;
}
type SessionMode = "voice" | "text";
interface TranscriptEntry { part: 1|2|3; question: string; answer: string; correction:string|null; suggestion:string|null; vocab:string|null; band:string|null; }
type Phase = "idle"|"part1"|"part2-prep"|"part2-answer"|"part3"|"report-loading"|"complete";
interface SessionState { topic:string; part:1|2|3; answeredCount:number; messages:Message[]; phase:Phase; report:ReportData|null; partDone:boolean; }

function pickTopic() {
  const raw = localStorage.getItem(USED_TOPICS_KEY);
  let used: string[] = [];
  try { used = JSON.parse(raw ?? "[]"); } catch { used = []; }
  const available = TOPICS.filter(t => !used.includes(t));
  const cycleComplete = available.length === 0;
  const pool = cycleComplete ? [...TOPICS] : available;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const newUsed = cycleComplete ? [chosen] : [...used, chosen];
  localStorage.setItem(USED_TOPICS_KEY, JSON.stringify(newUsed));
  return { topic: chosen, sessionNumber: cycleComplete ? 1 : newUsed.length };
}

function loadSpeed(): number {
  try { const v = parseFloat(localStorage.getItem(TTS_SPEED_KEY) ?? ""); if ([0.75,1.0,1.25].includes(v)) return v; } catch { /* ignore */ }
  return 1.0;
}

function parseFeedback(text: string) {
  const lines = text.split("\n");
  const examinerLines: string[] = [];
  let correction: string|null = null, suggestion: string|null = null, vocab: string|null = null, band: string|null = null;
  const bandParts: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes("❌") && trimmed.includes("→")) correction = trimmed;
    else if (trimmed.includes("💡")) suggestion = trimmed;
    else if (trimmed.includes("📝")) vocab = trimmed;
    else if (trimmed.includes("⭐")) bandParts.push(trimmed);
    else examinerLines.push(line);
  }
  band = bandParts.length > 0 ? bandParts.join("\n") : null;

  const joined = examinerLines.join("\n");

  if (!correction) {
    const corrMatch = joined.match(/(?:instead of|rather than)\s+["']?(.+?)["']?,?\s*(?:you (?:could|should|can) say|say|it would be better to say|try)\s+["']?(.+?)["']?[."]/i)
      || joined.match(/(?:it(?:'s| is| would be) better to say)\s+["']?(.+?)["']?\s+(?:instead of|rather than)\s+["']?(.+?)["']?/i);
    if (corrMatch) {
      const [, wrong, right] = corrMatch;
      correction = `❌ "${wrong.replace(/^["']|["']$/g,"")}" → ✅ "${right.replace(/^["']|["']$/g,"")}"`;
    }
  }

  if (!vocab) {
    const vocabMatch = joined.match(/(?:you could (?:also )?use|try using|better (?:words?|vocabulary)|words? like)\s+["']?(.+?)["']?(?:\.|$)/i);
    if (vocabMatch) {
      vocab = `📝 Better vocabulary: ${vocabMatch[1].replace(/^["']|["']$/g,"")}`;
    }
  }

  if (!band) {
    const scoreMatch = joined.match(/[Ff]luency\s+(\d\.?\d?)\s*[.,;]?\s*[Vv]ocabulary\s+(\d\.?\d?)\s*[.,;]?\s*[Gg]rammar\s+(\d\.?\d?)\s*[.,;]?\s*[Pp]ronunciation\s+(\d\.?\d?)\s*[.,;]?\s*(?:so\s+)?(?:overall|that gives|that's|with an overall)\s+(?:about\s+)?(\d\.?\d?)/i);
    if (scoreMatch) {
      const [, fc, lr, gra, p, overall] = scoreMatch;
      band = `⭐ Fluency & Coherence: ${fc}/9\n⭐ Lexical Resource: ${lr}/9\n⭐ Grammatical Range & Accuracy: ${gra}/9\n⭐ Pronunciation: ${p}/9\n⭐ Answer Band Score: ${overall}/9`;
    }
  }

  const examinerText = (band || correction || vocab)
    ? examinerLines.filter(l => {
        const t = l.trim().toLowerCase();
        if (correction && (t.includes("instead of") || t.includes("better to say"))) return false;
        if (vocab && (t.includes("you could use") || t.includes("try using") || t.includes("words like"))) return false;
        if (band && /fluency\s+\d/i.test(t)) return false;
        return true;
      }).join("\n").replace(/\*\*\[PART[123]_DONE\]\*\*/g,"").replace(/—\s*$/gm,"").trim()
    : joined.replace(/\*\*\[PART[123]_DONE\]\*\*/g,"").replace(/—\s*$/gm,"").trim();
  return { examinerText, correction, suggestion, vocab, band };
}

function stripForTts(text: string) {
  return text.replace(/\*\*\[PART[123]_DONE\]\*\*/g,"").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1").replace(/^---+$/gm,"").replace(/^#{1,6}\s/gm,"").replace(/\n{3,}/g,"\n\n").trim();
}

function writeWavString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function downsample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate <= toRate) return samples;
  const ratio = fromRate / toRate;
  const newLen = Math.ceil(samples.length / ratio);
  const result = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const idx = Math.floor(i * ratio);
    result[i] = samples[idx];
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeWavString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeWavString(view, 8, "WAVE");
  writeWavString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeWavString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

async function callMessageStream(messages: Message[], topic: string, part: number, questionNum: number, isStart: boolean, onChunk: (t:string)=>void): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/churchill/message`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ messages, topic, part, questionNum, isStart }) });
  if (!res.ok || !res.body) throw new Error("API error");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "", buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]" || payload === "[ERROR]") continue;
      try { const { delta } = JSON.parse(payload) as { delta: string }; full += delta; onChunk(full); } catch { /* ignore */ }
    }
  }
  return full;
}

async function callReport(messages: Message[], topic: string): Promise<ReportData> {
  const res = await fetch(`${BASE_URL}/api/churchill/report`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ messages, topic }) });
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  return data.report as ReportData;
}

const TEAL = "#00B4C8";
const GREEN = "#1DB954";
const YELLOW = "#F5C518";
const GOLD = TEAL;
const NAVY = "#0A1A30";

function PartIndicator({ part, phase }: { part:1|2|3; phase:Phase }) {
  const parts = [{ n:1, label:"Introduction" },{ n:2, label:"Long Turn" },{ n:3, label:"Discussion" }] as const;
  return (
    <div className="flex items-center gap-1 rounded-2xl p-1" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)" }}>
      {parts.map((p,i) => {
        const done = phase !== "idle" && p.n < part;
        const active = phase !== "idle" && p.n === part;
        return (
          <div key={p.n} className="flex items-center gap-1 flex-1">
            <div className={`flex-1 rounded-xl px-3 py-2 text-center transition-all`} style={active ? { background: GOLD, color: NAVY } : done ? { background:"rgba(74,222,128,0.15)", color:"#4ade80" } : { color:"rgba(255,255,255,0.4)" }}>
              <div className="flex items-center justify-center gap-1.5">
                {done && <CheckCircle className="w-3 h-3" />}
                <span className="text-xs font-bold">Part {p.n}</span>
              </div>
              <div className="text-[10px] opacity-75 hidden sm:block">{p.label}</div>
            </div>
            {i < 2 && <ChevronRight className="w-3 h-3 shrink-0" style={{ color:"rgba(255,255,255,0.3)" }} />}
          </div>
        );
      })}
    </div>
  );
}

function renderBandLines(band: string) {
  return band.split("\n").map((line, i) => {
    const trimmed = line.trim();
    const isOverall = /answer band score/i.test(trimmed);
    const starMatch = trimmed.match(/^⭐\s*(.+?):\s*(\d\.?\d?)\/9\s*(.*)$/);
    if (starMatch) {
      const [, label, score, rest] = starMatch;
      return (
        <div key={i} className={`text-sm flex items-start gap-1.5 ${isOverall ? "mt-1 pt-1.5 border-t border-white/10" : ""}`}>
          <span style={{ color: "#F59E0B" }}>⭐</span>
          <span className={isOverall ? "font-bold" : "font-medium"} style={{ color: isOverall ? "#F59E0B" : "#e2e8f0" }}>
            {label}: {score}/9
          </span>
          {rest && <span className="text-white/50 text-xs mt-0.5">{rest}</span>}
        </div>
      );
    }
    return <div key={i} className="text-sm text-white/60">{trimmed}</div>;
  });
}

function AIChatBubble({ content }: { content: string }) {
  const { examinerText, correction, suggestion, vocab, band } = parseFeedback(content);
  const hasFeedback = correction || suggestion || vocab || band;
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: GOLD }}>
        <Mic className="w-4 h-4" style={{ color: NAVY }} />
      </div>
      <div className="max-w-[85%] space-y-2">
        {examinerText && (
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap" style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)" }}>
            {examinerText}
          </div>
        )}
        {hasFeedback && (
          <div className="rounded-2xl px-4 py-3 space-y-2" style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.1)" }}>
            {correction && (
              <div className="rounded-xl px-3 py-2 text-sm" style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)" }}>
                <span className="text-red-400">{correction.split("→")[0]?.trim()}</span>
                <span className="text-white/40 mx-2">→</span>
                <span className="text-green-400 font-semibold">{correction.split("→")[1]?.trim()}</span>
              </div>
            )}
            {suggestion && <div className="rounded-xl px-3 py-2 text-sm text-teal-300" style={{ background:"rgba(20,184,166,0.1)", border:"1px solid rgba(20,184,166,0.3)" }}>{suggestion}</div>}
            {vocab && <div className="text-sm text-sky-300 px-1">{vocab}</div>}
            {band && <div className="space-y-1 px-1 mt-1">{renderBandLines(band)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function UserChatBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap" style={{ background: GOLD, color: NAVY }}>
        {content}
      </div>
    </div>
  );
}

function VoiceOrb({ state, onTap }: { state: "listening" | "thinking" | "speaking" | "idle"; onTap?: () => void }) {
  const disabled = state === "thinking" || state === "speaking";
  const labels: Record<string, string> = {
    speaking: "Churchill speaking\u2026",
    idle: "Your turn \u2014 tap to answer",
    listening: "Recording\u2026 tap to stop",
    thinking: "Churchill is reviewing your answer\u2026",
  };
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <button
        onClick={onTap}
        className="relative w-24 h-24 rounded-full flex items-center justify-center focus:outline-none transition-transform active:scale-95"
        disabled={disabled}
      >
        {state === "listening" && (
          <>
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(239,68,68,0.25)", animationDuration: "1.5s" }} />
            <div className="absolute -inset-4 rounded-full animate-pulse" style={{ background: "rgba(239,68,68,0.08)", animationDuration: "2s" }} />
          </>
        )}
        {state === "speaking" && (
          <>
            <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: `${TEAL}20`, animationDuration: "1s" }} />
            <div className="absolute -inset-3 rounded-full animate-pulse" style={{ background: `${TEAL}10`, animationDuration: "1.5s" }} />
          </>
        )}
        {state === "thinking" && (
          <div className="absolute -inset-1 rounded-full animate-spin" style={{ border: "3px solid transparent", borderTopColor: TEAL, animationDuration: "0.8s" }} />
        )}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${state === "listening" ? "scale-110" : ""}`}
          style={{
            background: state === "listening"
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : state === "idle"
                ? `linear-gradient(135deg, ${TEAL}, #00D4F0)`
                : state === "speaking"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.08)",
            boxShadow: state === "listening" ? "0 0 40px rgba(239,68,68,0.4)" : state === "idle" ? `0 0 40px ${TEAL}40` : "none",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {state === "listening" && <Mic className="w-8 h-8 text-white" />}
          {state === "thinking" && <Loader2 className="w-8 h-8 animate-spin" style={{ color: TEAL }} />}
          {state === "speaking" && <Volume2 className="w-8 h-8" style={{ color: TEAL }} />}
          {state === "idle" && <Mic className="w-8 h-8" style={{ color: NAVY }} />}
        </div>
      </button>
      <span className="text-xs font-semibold tracking-wider uppercase text-center" style={{ color: state === "listening" ? "#f87171" : state === "idle" ? TEAL : "rgba(255,255,255,0.4)" }}>
        {labels[state]}
      </span>
    </div>
  );
}

function Part2CueCard({ topic }: { topic: string }) {
  const cue = CUE_CARDS[topic] ?? `something related to ${topic}`;
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background:`rgba(0,180,200,0.08)`, border:`2px solid rgba(0,180,200,0.3)` }}>
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4" style={{ color: GOLD }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Cue Card — Part 2</span>
      </div>
      <p className="font-bold text-white text-base">Describe {cue}.</p>
      <div className="space-y-1 text-sm text-white/60">
        <p className="font-semibold text-white/80 text-xs uppercase tracking-wider mb-2">You should say:</p>
        <p>• What it is / who they are</p>
        <p>• When and where you experienced it</p>
        <p>• Why it is important or special to you</p>
        <p>• How it has affected your life</p>
      </div>
      <p className="text-xs text-white/40 italic">You have 1 minute to prepare. Then speak for 1–2 minutes.</p>
    </div>
  );
}

function CountdownTimer({ seconds, onEnd }: { seconds: number; onEnd: ()=>void }) {
  const [remaining, setRemaining] = useState(seconds);
  const onEndRef = useRef(onEnd);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => {
    const t = setInterval(() => setRemaining(prev => {
      if (prev <= 1) { clearInterval(t); onEndRef.current(); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);
  const pct = (remaining/seconds)*100;
  const urgent = remaining <= 15;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-colors`} style={urgent ? { background:"rgba(239,68,68,0.1)", borderColor:"rgba(239,68,68,0.4)" } : { background:"rgba(56,189,248,0.1)", borderColor:"rgba(56,189,248,0.3)" }}>
      <Timer className={`w-5 h-5 shrink-0 ${urgent ? "animate-pulse" : ""}`} style={{ color: urgent ? "#ef4444" : "#38bdf8" }} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-white/50">Preparation time</span>
          <span className={`font-bold text-lg tabular-nums ${urgent ? "text-red-400" : "text-sky-300"}`}>{remaining}s</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.1)" }}>
          <div className={`h-full rounded-full transition-all duration-1000`} style={{ width:`${pct}%`, background: urgent ? "#ef4444" : "#38bdf8" }} />
        </div>
      </div>
    </div>
  );
}

function BandBar({ label, band }: { label: string; band: number }) {
  const pct = (band/9)*100;
  const barColor = band>=7 ? "#4ade80" : band>=6 ? GOLD : "#f97316";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-sm font-bold tabular-nums text-white">{band}/9</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.1)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

function FinalReport({ report, topic, onNewSession }: { report:ReportData; topic:string; onNewSession:()=>void }) {
  const band = report.overallBand;
  const bandColor = band>=7 ? GREEN : band>=6 ? TEAL : YELLOW;
  return (
    <div className="space-y-5">
      <div className="rounded-3xl p-6 text-center" style={{ background:`rgba(0,180,200,0.08)`, border:`2px solid rgba(0,180,200,0.3)` }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-5 h-5" style={{ color: TEAL }} />
          <span className="text-sm font-bold uppercase tracking-widest text-white/60">Speaking Test Report</span>
        </div>
        <p className="text-sm text-white/50 mb-1">Topic: <strong className="text-white">{topic}</strong></p>
        <div className="text-7xl font-black my-3" style={{ color: bandColor }}>{band}</div>
        <p className="text-white/60 font-semibold">Estimated Band Score</p>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
        <h3 className="font-bold text-white">Detailed Scores</h3>
        <BandBar label="Fluency & Coherence" band={report.fluencyCoherence.band} />
        <BandBar label="Lexical Resource" band={report.lexicalResource.band} />
        <BandBar label="Grammatical Range & Accuracy" band={report.grammaticalRange.band} />
        <BandBar label="Pronunciation (estimated)" band={report.pronunciation.band} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 space-y-3" style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: TEAL }}>Examiner Feedback</h3>
          {[
            { label:"Fluency & Coherence", text:report.fluencyCoherence.comment },
            { label:"Vocabulary", text:report.lexicalResource.comment },
            { label:"Grammar", text:report.grammaticalRange.comment },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs font-semibold text-white/40 mb-0.5">{f.label}</p>
              <p className="text-sm text-white/80">{f.text}</p>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-white">Pronunciation Tips</h3>
            <ul className="space-y-1">{report.pronunciation.tips.map((t,i) => <li key={i} className="text-sm text-white/70 flex items-start gap-2"><span style={{ color: GOLD }} className="mt-0.5">•</span>{t}</li>)}</ul>
          </div>
          <div className="rounded-2xl p-5" style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)" }}>
            <h3 className="font-bold text-green-400 text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4" />What you did well</h3>
            <ul className="space-y-1">{report.strengths.map((s,i) => <li key={i} className="text-sm text-white/70 flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span>{s}</li>)}</ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
        <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" style={{ color: YELLOW }} />Top 5 Vocabulary Upgrades</h3>
        <div className="flex flex-wrap gap-2">{report.topVocab.map((w,i) => <span key={i} className="px-3 py-1 text-sm font-medium rounded-full" style={{ background:`rgba(0,180,200,0.12)`, color: TEAL, border:`1px solid rgba(0,180,200,0.3)` }}>{w}</span>)}</div>
      </div>

      <div className="rounded-2xl p-5" style={{ background:`rgba(245,197,24,0.07)`, border:`1px solid rgba(245,197,24,0.2)` }}>
        <h3 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: YELLOW }}><AlertCircle className="w-4 h-4" />Focus Areas for Next Session</h3>
        <ul className="space-y-1">{report.improvements.map((s,i) => <li key={i} className="text-sm text-white/70 flex items-start gap-2"><span style={{ color: YELLOW }} className="mt-0.5">→</span>{s}</li>)}</ul>
      </div>

      {report.recommendation && (
        <div className="rounded-2xl p-5" style={{ background:`linear-gradient(135deg, rgba(0,180,200,0.1), rgba(0,212,240,0.05))`, border:`1px solid rgba(0,180,200,0.3)` }}>
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: TEAL }}>
            <Sparkles className="w-4 h-4" />My Recommendation for You
          </h3>
          <p className="text-sm text-white/80 leading-relaxed">{report.recommendation}</p>
        </div>
      )}

      <button onClick={onNewSession} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base transition-all hover:opacity-90" style={{ background:`linear-gradient(135deg,${TEAL},#00D4F0)`, color: NAVY }}>
        <RotateCcw className="w-5 h-5" />Try Again with New Topic
      </button>
    </div>
  );
}

function buildTranscriptText(topic: string, entries: TranscriptEntry[], report: ReportData|null) {
  const date = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const lines = ["CHURCHILL AI","IELTS Speaking Session Report","━━━━━━━━━━━━━━━━━━━━━",`Topic: ${topic}`,`Date: ${date}`,"━━━━━━━━━━━━━━━━━━━━━"];
  let currentPart = 0;
  for (const e of entries) {
    if (e.part !== currentPart) {
      currentPart = e.part;
      const labels: Record<number,string> = { 1:"Part 1 - Introduction", 2:"Part 2 - Long Turn", 3:"Part 3 - Discussion" };
      lines.push("", labels[e.part] ?? `Part ${e.part}`, "");
    }
    if (e.question) lines.push(`Q: ${e.question}`);
    lines.push(`A: ${e.answer}`);
    if (e.correction) lines.push(`${e.correction}`);
    if (e.suggestion) lines.push(`${e.suggestion}`);
    if (e.vocab) lines.push(`${e.vocab}`);
    if (e.band) lines.push(`${e.band}`);
    lines.push("");
  }
  if (report) {
    lines.push("","━━━━━━━━━━━━━━━━━━━━━","FINAL REPORT","━━━━━━━━━━━━━━━━━━━━━",`Overall Band: ${report.overallBand}/9`,`Fluency & Coherence: ${report.fluencyCoherence.band}/9`,`Lexical Resource: ${report.lexicalResource.band}/9`,`Grammatical Range: ${report.grammaticalRange.band}/9`);
    if (report.improvements?.length) { lines.push("","Top improvements:"); report.improvements.slice(0,5).forEach((imp,idx) => lines.push(`${idx+1}. ${imp}`)); }
    lines.push("━━━━━━━━━━━━━━━━━━━━━");
  }
  return lines.join("\n");
}

function TranscriptViewer({ topic, entries, report, onClose, onNewSession }: { topic:string; entries:TranscriptEntry[]; report:ReportData|null; onClose:()=>void; onNewSession?:()=>void }) {
  const text = buildTranscriptText(topic, entries, report);
  const date = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const partsInTranscript = [...new Set(entries.map(e=>e.part))].length;
  const partCounters: Record<number,number> = {};

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background:"#0D1B3E" }}>
      <div className="shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD }}>
              <Mic className="w-4 h-4" style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-wide">CHURCHILL AI</h2>
              <p className="text-xs font-semibold" style={{ color: GOLD }}>IELTS Speaking Session Report</p>
            </div>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white/60 hover:bg-white/10 transition-colors">✕</button>
        </div>
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap text-xs text-white/40">
          <span>{topic}</span><span>·</span><span>{date}</span><span>·</span><span>Part {partsInTranscript} of 3 completed</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {entries.map((e,i) => {
          const isNewPart = e.part !== (entries[i-1]?.part ?? 0);
          if (isNewPart) partCounters[e.part] = 0;
          partCounters[e.part] = (partCounters[e.part] ?? 0)+1;
          const qNum = partCounters[e.part];
          const partLabels: Record<number,string> = { 1:"Part 1 — Introduction", 2:"Part 2 — Long Turn", 3:"Part 3 — Discussion" };
          return (
            <div key={i}>
              {isNewPart && <h3 className="text-sm font-bold mb-2 pb-1" style={{ color: TEAL, borderBottom:`1px solid rgba(0,180,200,0.2)` }}>{partLabels[e.part]}</h3>}
              <div className="rounded-2xl p-3 space-y-1.5 text-sm" style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)" }}>
                {e.question && <p className="text-white/40 text-xs"><span className="font-semibold text-white/70">Q{qNum}:</span> {e.question}</p>}
                <p className="font-medium text-white"><span className="font-semibold" style={{ color: GOLD }}>Your answer:</span> {e.answer}</p>
                {e.correction && <p className="text-red-400 text-xs">{e.correction}</p>}
                {e.vocab && <p className="text-sky-400 text-xs">{e.vocab}</p>}
                {e.band && <p className="text-xs font-semibold" style={{ color: GOLD }}>{e.band}</p>}
              </div>
            </div>
          );
        })}
        {report && (
          <div className="rounded-2xl p-4 text-sm space-y-1.5" style={{ background:`rgba(0,180,200,0.07)`, border:`1px solid rgba(0,180,200,0.2)` }}>
            <h3 className="font-bold mb-2" style={{ color: GOLD }}>FINAL REPORT</h3>
            <p className="text-base font-bold text-white">Overall Band: {report.overallBand}/9</p>
            <p className="text-white/70">Fluency & Coherence: {report.fluencyCoherence.band}/9</p>
            <p className="text-white/70">Lexical Resource: {report.lexicalResource.band}/9</p>
            <p className="text-white/70">Grammatical Range: {report.grammaticalRange.band}/9</p>
          </div>
        )}
      </div>
      <div className="shrink-0 flex gap-2 p-4" style={{ borderTop:"1px solid rgba(255,255,255,0.1)" }}>
        <button onClick={() => navigator.clipboard.writeText(text)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold text-white/60 hover:bg-white/10 transition-colors" style={{ borderColor:"rgba(255,255,255,0.15)" }}>Copy</button>
        <button onClick={() => { const blob=new Blob([text],{type:"text/plain"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`IELTS_Speaking_${topic.replace(/\s+/g,"_")}.txt`; a.click(); URL.revokeObjectURL(url); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold text-white/60 hover:bg-white/10 transition-colors" style={{ borderColor:"rgba(255,255,255,0.15)" }}>Download .txt</button>
        {onNewSession && <button onClick={onNewSession} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: GOLD, color: NAVY }}>New Session</button>}
      </div>
    </div>
  );
}

interface Props { onBack: () => void; expiresAt: string | null; }

export default function Speaking(props: Props) {
  return (
    <SpeakingErrorBoundary onBack={props.onBack}>
      <SpeakingInner {...props} />
    </SpeakingErrorBoundary>
  );
}

function SpeakingInner({ onBack, expiresAt }: Props) {
  const [session, setSession] = useState<SessionState>({ topic:"", part:1, answeredCount:0, messages:[], phase:"idle", report:null, partDone:false });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [streamingContent, setStreamingContent] = useState<string|null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTtsText, setLastTtsText] = useState<string|null>(null);
  const [ttsSpeed, setTtsSpeedState] = useState<number>(loadSpeed);
  const [sessionNumber, setSessionNumber] = useState<number>(0);
  const [sessionMode, setSessionMode] = useState<SessionMode|null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const playback = useAudioPlayback(WORKLET_URL);
  const playbackRef = useRef(playback);
  useEffect(() => { playbackRef.current = playback; }, [playback]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognition|null>(null);
  const sendTextRef = useRef<((t:string)=>Promise<void>)|null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement|null>(null);
  const sessionRef = useRef(session);
  const startRecordingRef = useRef<(()=>void)|null>(null);
  const startVoiceRecordingRef = useRef<(()=>void)|null>(null);
  const sessionModeRef = useRef<SessionMode|null>(null);
  const isSpeakingRef = useRef(false);
  const lastTtsTextRef = useRef<string|null>(null);
  const ttsRequestIdRef = useRef(0);
  const ttsEndResolveRef = useRef<(()=>void)|null>(null);
  const ttsSpeedRef = useRef(ttsSpeed);
  const ttsGeneratedSpeedRef = useRef(1.0);
  const sessionGenRef = useRef(0);
  const isProcessingRef = useRef(false);
  const audioContextRef = useRef<AudioContext|null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const mediaStreamRef = useRef<MediaStream|null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const vadRef = useRef<{stop:()=>void}|null>(null);
  const voiceStreamCompleteRef = useRef(false);
  const voiceAbortRef = useRef<AbortController|null>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [session.messages, isLoading, streamingContent]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { sessionModeRef.current = sessionMode; }, [sessionMode]);
  useEffect(() => { ttsSpeedRef.current = ttsSpeed; }, [ttsSpeed]);

  useEffect(() => {
    if (playback.state === "idle" && voiceStreamCompleteRef.current) {
      voiceStreamCompleteRef.current = false;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    }
  }, [playback.state]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current.src = ""; ttsAudioRef.current = null; }
      if (speechRecognitionRef.current) { speechRecognitionRef.current.abort(); speechRecognitionRef.current = null; }
      vadRef.current?.stop();
      mediaRecorderRef.current?.state === "recording" && mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      voiceAbortRef.current?.abort();
    };
  }, []);

  const unlockAudio = useCallback(() => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AC();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
      const buf = audioContextRef.current.createBuffer(1, 1, 22050);
      const src = audioContextRef.current.createBufferSource();
      src.buffer = buf;
      src.connect(audioContextRef.current.destination);
      src.start(0);
    } catch { /* ignore */ }
  }, []);

  const setTtsSpeed = useCallback((speed: number) => {
    setTtsSpeedState(speed);
    localStorage.setItem(TTS_SPEED_KEY, String(speed));
    ttsSpeedRef.current = speed;
    if (ttsAudioRef.current && isSpeakingRef.current) {
      ttsAudioRef.current.playbackRate = Math.max(0.25, Math.min(4.0, speed / ttsGeneratedSpeedRef.current));
    }
  }, []);

  const stopTts = useCallback(() => {
    ttsRequestIdRef.current += 1;
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current.src = ""; ttsAudioRef.current = null; }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    if (ttsEndResolveRef.current) { ttsEndResolveRef.current(); ttsEndResolveRef.current = null; }
  }, []);

  const playTts = useCallback(async (text: string): Promise<boolean> => {
    if (!text.trim()) return false;
    stopTts();
    const clean = stripForTts(text);
    if (!clean) return false;
    setLastTtsText(clean);
    lastTtsTextRef.current = clean;
    const myId = ++ttsRequestIdRef.current;
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/tts`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ text:clean, speed:ttsSpeedRef.current }) });
      if (myId !== ttsRequestIdRef.current) return false;
      if (!res.ok) return false;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (myId !== ttsRequestIdRef.current) { URL.revokeObjectURL(url); return false; }
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      ttsGeneratedSpeedRef.current = ttsSpeedRef.current;
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      const played = await new Promise<boolean>(resolve => {
        let done = false;
        let safety: ReturnType<typeof setTimeout> | null = null;
        let hardCap: ReturnType<typeof setTimeout> | null = null;
        const onMeta = () => {
          const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 30;
          if (!done) safety = setTimeout(() => cleanup(true), (dur + 5) * 1000);
        };
        const cleanup = (ok: boolean) => {
          if (done) return;
          done = true;
          if (safety) { clearTimeout(safety); safety = null; }
          if (hardCap) { clearTimeout(hardCap); hardCap = null; }
          audio.removeEventListener("loadedmetadata", onMeta);
          audio.onended = null;
          audio.onerror = null;
          try { URL.revokeObjectURL(url); } catch {}
          if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          ttsEndResolveRef.current = null;
          resolve(ok);
        };
        ttsEndResolveRef.current = () => cleanup(true);
        audio.onended = () => cleanup(true);
        audio.onerror = () => cleanup(false);
        audio.addEventListener("loadedmetadata", onMeta);
        hardCap = setTimeout(() => { if (!done) cleanup(true); }, 90000);
        audio.play().catch(() => cleanup(false));
      });
      return played;
    } catch {
      isSpeakingRef.current=false; setIsSpeaking(false);
      return false;
    }
  }, [stopTts]);

  const replayTts = useCallback(() => { if (lastTtsText) playTts(lastTtsText); }, [lastTtsText, playTts]);
  void lastTtsTextRef;

  const playStreamingTts = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    const clean = stripForTts(text);
    if (!clean) return;
    stopTts();
    setLastTtsText(clean);
    lastTtsTextRef.current = clean;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    try {
      try { await playbackRef.current.init(); } catch { /* audio init failed */ }
      playbackRef.current.clear();
      const res = await fetch(`${BASE_URL}/api/churchill/tts-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok || !res.body) { isSpeakingRef.current = false; setIsSpeaking(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          const payload = event.slice(6).trim();
          try {
            const data = JSON.parse(payload);
            if (data.type === "audio") {
              playbackRef.current.pushAudio(data.data);
            } else if (data.done) {
              playbackRef.current.signalComplete();
            }
          } catch { /* ignore */ }
        }
      }
      playbackRef.current.signalComplete();
      await new Promise<void>(resolve => {
        const deadline = Date.now() + 60000;
        const check = () => {
          if (playbackRef.current.state === "idle" || Date.now() > deadline) { resolve(); return; }
          setTimeout(check, 50);
        };
        setTimeout(check, 100);
      });
    } catch { /* ignore */ }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, [stopTts]);

  const playTtsAndTriggerMic = useCallback(async (text: string) => {
    if (sessionModeRef.current === "voice") {
      await playStreamingTts(text);
    } else {
      const played = await playTts(text);
      if (!played) {
        await new Promise(r => setTimeout(r, 500));
        const retried = await playTts(text);
        if (!retried) {
          await new Promise(r => setTimeout(r, 300));
          return;
        }
      }
    }
  }, [playTts, playStreamingTts]);

  const stopVoiceRecording = useCallback((discard = false) => {
    if (discard) {
      vadRef.current?.stop();
      vadRef.current = null;
      mediaRecorderRef.current = null;
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      vadRef.current = null;
    }
  }, []);

  const processVoiceAnswer = useCallback(async (audioBlob: Blob) => {
    if (isProcessingRef.current) return;
    if (sessionModeRef.current !== "voice") return;
    if (audioBlob.size < 1000) {
      return;
    }
    isProcessingRef.current = true;
    const myGen = sessionGenRef.current;
    const currentSession = sessionRef.current;
    stopTts();
    setError(null);
    setIsLoading(true);
    setStreamingContent("");
    const lastAiMsg = [...currentSession.messages].reverse().find(m => m.role === "assistant");
    const { examinerText: lastQuestion } = lastAiMsg ? parseFeedback(lastAiMsg.content) : { examinerText: "" };
    const newAnsweredCount = currentSession.answeredCount + 1;
    const limit = PART_LIMITS[currentSession.part];
    const partDoneNow = newAnsweredCount >= limit;
    try {
      const arrayBuf = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);

      const abortController = new AbortController();
      voiceAbortRef.current = abortController;

      const res = await fetch(`${BASE_URL}/api/churchill/voice-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64,
          messages: currentSession.messages,
          topic: currentSession.topic,
          part: currentSession.part,
          questionNum: newAnsweredCount + 1,
          isStart: false,
        }),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) throw new Error("API error");
      if (myGen !== sessionGenRef.current) return;

      try { await playbackRef.current.init(); } catch { /* audio init failed, continue without playback */ }
      playbackRef.current.clear();
      isSpeakingRef.current = true;
      setIsSpeaking(true);

      const streamReader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let userTranscript = "";
      let fullTranscript = "";
      let feedbackBlock = "";
      let userMsgAdded = false;

      while (true) {
        const { done, value } = await streamReader.read();
        if (done) break;
        if (myGen !== sessionGenRef.current) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          const payload = event.slice(6).trim();
          try {
            const data = JSON.parse(payload);
            if (data.type === "user_transcript") {
              userTranscript = data.data;
              if (!userMsgAdded) {
                userMsgAdded = true;
                setSession(s => ({ ...s, messages: [...s.messages, { role: "user", content: userTranscript }] }));
              }
            } else if (data.type === "transcript") {
              fullTranscript += data.data;
              setStreamingContent(fullTranscript);
            } else if (data.type === "audio") {
              playbackRef.current.pushAudio(data.data);
            } else if (data.type === "feedback") {
              feedbackBlock = data.data;
            } else if (data.done) {
              if (data.userTranscript && !userTranscript) userTranscript = data.userTranscript;
              if (data.assistantTranscript) fullTranscript = data.assistantTranscript;
              if (data.feedback && !feedbackBlock) feedbackBlock = data.feedback;
              playbackRef.current.signalComplete();
            } else if (data.type === "error") {
              throw new Error(data.error || "Voice processing failed");
            }
          } catch (e) {
            if (e instanceof Error && e.message.includes("Voice processing")) throw e;
          }
        }
      }

      const combinedAssistantContent = feedbackBlock
        ? `${fullTranscript}\n\n${feedbackBlock}`
        : fullTranscript;

      playbackRef.current.signalComplete();
      if (myGen !== sessionGenRef.current) return;

      if (!userMsgAdded && userTranscript) {
        setSession(s => ({ ...s, messages: [...s.messages, { role: "user", content: userTranscript }] }));
      }

      setStreamingContent(null);
      setSession(s => ({
        ...s,
        messages: [
          ...s.messages,
          ...(!userMsgAdded && userTranscript ? [{ role: "user" as const, content: userTranscript }] : []),
          { role: "assistant" as const, content: combinedAssistantContent },
        ],
        answeredCount: newAnsweredCount,
        partDone: partDoneNow,
      }));

      const { correction, suggestion, vocab, band } = parseFeedback(combinedAssistantContent);
      setTranscript(prev => [...prev, { part: currentSession.part, question: lastQuestion || "", answer: userTranscript, correction, suggestion, vocab, band }]);

      isProcessingRef.current = false;
      setIsLoading(false);

      if (partDoneNow && currentSession.part === 3) {
        voiceStreamCompleteRef.current = false;
        await new Promise<void>(resolve => {
          const deadline = Date.now() + 60000;
          const check = () => {
            if (playbackRef.current.state === "idle" || Date.now() > deadline) { resolve(); return; }
            setTimeout(check, 50);
          };
          setTimeout(check, 100);
        });
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        await playStreamingTts(GOODBYE_MESSAGE);
      } else {
        voiceStreamCompleteRef.current = true;
      }
    } catch (e) {
      setStreamingContent(null);
      isProcessingRef.current = false;
      setIsLoading(false);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      voiceAbortRef.current = null;
      if ((e as Error)?.name === "AbortError") return;
      setError("Failed to get AI response. Please try again.");
    } finally {
      voiceAbortRef.current = null;
    }
  }, [stopTts, playStreamingTts]);

  const startVoiceRecording = useCallback(async () => {
    if (mediaRecorderRef.current) return;
    if (isProcessingRef.current) return;
    if (sessionModeRef.current !== "voice") return;
    const s = sessionRef.current;
    if (!(s.phase === "part1" || s.phase === "part2-answer" || s.phase === "part3")) return;
    if (s.partDone) return;

    if (isSpeakingRef.current) {
      stopTts();
      playbackRef.current.clear();
      voiceAbortRef.current?.abort();
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      voiceStreamCompleteRef.current = false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const source = audioCtx.createMediaStreamSource(stream);

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      const pcmChunks: Float32Array[] = [];
      let running = true;
      const capturedGen = sessionGenRef.current;
      const capturedRate = audioCtx.sampleRate;

      // The student controls start/stop via the mic button — no auto-stop.
      // We still enforce a hard cap so a forgotten recording can't run forever.
      const startedAt = Date.now();
      const MAX_RECORDING_MS = 120000;

      processor.onaudioprocess = (e) => {
        if (!running) return;
        const input = e.inputBuffer.getChannelData(0);
        pcmChunks.push(new Float32Array(input));
        if (Date.now() - startedAt > MAX_RECORDING_MS) {
          finishRecording();
        }
      };

      const finishRecording = () => {
        if (!running) return;
        running = false;
        processor.disconnect();
        silentGain.disconnect();
        source.disconnect();
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close().catch(() => {});
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        setIsRecording(false);
        if (sessionModeRef.current !== "voice" || sessionGenRef.current !== capturedGen) return;

        const totalLength = pcmChunks.reduce((acc, c) => acc + c.length, 0);
        if (totalLength < capturedRate * 0.3) {
          return;
        }
        const rawSamples = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of pcmChunks) {
          rawSamples.set(chunk, offset);
          offset += chunk.length;
        }
        const targetRate = 16000;
        const samples = downsample(rawSamples, capturedRate, targetRate);
        const wavBuffer = encodeWav(samples, Math.min(capturedRate, targetRate));
        const blob = new Blob([wavBuffer], { type: "audio/wav" });
        processVoiceAnswer(blob);
      };

      mediaRecorderRef.current = { state: "recording", stop: finishRecording } as unknown as MediaRecorder;

      vadRef.current = {
        stop: () => {
          running = false;
          processor.disconnect();
          silentGain.disconnect();
          source.disconnect();
          audioCtx.close().catch(() => {});
        }
      };

      setIsRecording(true);

    } catch (err) {
      setError("Could not access microphone. Please check permissions.");
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  }, [processVoiceAnswer, stopTts]);

  useEffect(() => { startVoiceRecordingRef.current = startVoiceRecording; }, [startVoiceRecording]);

  const startSession = useCallback(async (mode:SessionMode) => {
    unlockAudio();
    sessionGenRef.current+=1; isProcessingRef.current=false; stopTts();
    voiceStreamCompleteRef.current = false;
    setSessionMode(mode);
    sessionModeRef.current = mode;
    const { topic, sessionNumber:sNum } = pickTopic();
    setSessionNumber(sNum); setTranscript([]); setShowTranscript(false); setError(null);
    setIsLoading(true); setStreamingContent(""); setLastTtsText(null);
    setSession({ topic, part:1, answeredCount:0, messages:[], phase:"part1", report:null, partDone:false });
    try {
      if (mode === "voice") {
        await playStreamingTts(VOICE_INTRO);
      }
      const reply = await callMessageStream([], topic, 1, 1, true, setStreamingContent);
      setStreamingContent(null);
      setSession(s=>({...s, messages:[{role:"assistant",content:reply}]}));
      setIsLoading(false);
      const { examinerText } = parseFeedback(reply);
      const q1 = stripForTts(examinerText || reply);
      await playTtsAndTriggerMic(q1);
    } catch {
      setStreamingContent(null); setError("Could not connect to Churchill AI. Please try again.");
      setSession(s=>({...s, phase:"idle"})); setIsLoading(false);
    }
  }, [unlockAudio, stopTts, playStreamingTts, playTtsAndTriggerMic]);

  const processAnswer = useCallback(async (text:string) => {
    if (!text.trim()||isLoading||isProcessingRef.current) return;
    if (session.partDone) return;
    isProcessingRef.current=true;
    const myGen = sessionGenRef.current;
    stopTts(); setInput(""); setError(null);
    const lastAiMsg = [...session.messages].reverse().find(m=>m.role==="assistant");
    const { examinerText:lastQuestion } = lastAiMsg ? parseFeedback(lastAiMsg.content) : { examinerText:"" };
    const userMsg: Message = { role:"user", content:text };
    const newMessages = [...session.messages, userMsg];
    const newAnsweredCount = session.answeredCount+1;
    const limit = PART_LIMITS[session.part];
    const partDoneNow = newAnsweredCount>=limit;
    setSession(s=>({...s, messages:newMessages, answeredCount:newAnsweredCount}));
    setIsLoading(true); setStreamingContent("");
    try {
      const reply = await callMessageStream(newMessages, session.topic, session.part, newAnsweredCount+1, false, setStreamingContent);
      if (myGen!==sessionGenRef.current) return;
      setStreamingContent(null);
      setSession(s=>({...s, messages:[...newMessages,{role:"assistant",content:reply}], partDone:partDoneNow}));
      const { examinerText, correction, suggestion, vocab, band } = parseFeedback(reply);
      setTranscript(prev=>[...prev,{part:session.part, question:lastQuestion||"", answer:text, correction, suggestion, vocab, band}]);
      isProcessingRef.current=false; setIsLoading(false);
      const ttsText = examinerText||reply;
      if (partDoneNow&&session.part===3) {
        await playTts(ttsText);
        await playTts(GOODBYE_MESSAGE);
      } else {
        await playTtsAndTriggerMic(ttsText);
      }
    } catch {
      setStreamingContent(null); setError("Failed to get AI response. Please try again.");
      isProcessingRef.current=false; setIsLoading(false);
    }
    if (sessionModeRef.current==="text") setTimeout(()=>inputRef.current?.focus(),100);
  }, [isLoading, session, stopTts, playTts, playTtsAndTriggerMic]);

  useEffect(()=>{ sendTextRef.current=processAnswer; },[processAnswer]);

  const sendMessage = useCallback(async () => { if (!input.trim()||isLoading) return; await processAnswer(input.trim()); }, [input, isLoading, processAnswer]);

  const nextPart = useCallback(async () => {
    if (session.part===1) {
      const cue = CUE_CARDS[session.topic]??`something related to ${session.topic}`;
      const cueMsg: Message = { role:"assistant", content:`**Part 2 — Long Turn**\n\nDescribe ${cue}.\n\nYou should say:\n• What it is / who they are\n• When and where you experienced it\n• Why it is important or special to you\n• How it has affected your life\n\nYou have 1 minute to prepare.` };
      setSession(s=>({...s, part:2, answeredCount:0, messages:[...s.messages,cueMsg], phase:"part2-prep", partDone:false}));
    } else if (session.part===2) {
      setError(null); setIsLoading(true); setStreamingContent("");
      setSession(s=>({...s, part:3, answeredCount:0, phase:"part3", partDone:false}));
      try {
        const reply = await callMessageStream(session.messages, session.topic, 3, 1, true, setStreamingContent);
        setStreamingContent(null);
        setSession(s=>({...s, messages:[...s.messages,{role:"assistant",content:reply}]}));
        setIsLoading(false);
        const { examinerText } = parseFeedback(reply);
        await playTtsAndTriggerMic(examinerText||reply);
      } catch { setStreamingContent(null); setError("Failed to start Part 3. Please try again."); setIsLoading(false); }
    }
  }, [session, playTtsAndTriggerMic]);

  const handleTimerEnd = useCallback(() => { setSession(s=>({...s, phase:"part2-answer"})); setTimeout(()=>inputRef.current?.focus(),100); }, []);

  const viewReport = useCallback(async () => {
    setIsLoading(true); setError(null); setSession(s=>({...s, phase:"report-loading"}));
    try { const report = await callReport(session.messages, session.topic); setSession(s=>({...s, phase:"complete", report})); }
    catch { setError("Failed to generate report. Please try again."); setSession(s=>({...s, phase:"part3"})); }
    finally { setIsLoading(false); }
  }, [session.messages, session.topic]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
  }, []);

  const resetSilenceTimer = useCallback((recognition: SpeechRecognition) => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (speechRecognitionRef.current === recognition) {
        recognition.stop();
      }
    }, 3000);
  }, [clearSilenceTimer]);

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    clearRestartTimer();
    if (speechRecognitionRef.current) { speechRecognitionRef.current.abort(); speechRecognitionRef.current=null; }
    setIsRecording(false); setInterimText("");
  }, [clearSilenceTimer, clearRestartTimer]);

  const finishSession = useCallback(async () => {
    if (session.messages.length < 2) return;
    sessionGenRef.current+=1; isProcessingRef.current=false;
    stopTts(); stopRecording(); stopVoiceRecording(true);
    voiceAbortRef.current?.abort();
    voiceStreamCompleteRef.current = false;
    playbackRef.current.clear();
    setIsLoading(true); setError(null); setSession(s=>({...s, phase:"report-loading", partDone:true}));
    try {
      const report = await callReport(session.messages, session.topic);
      setSession(s=>({...s, phase:"complete", report}));
    } catch {
      setError("Failed to generate report. Please try again.");
      setSession(s=>({...s, phase:"part1", partDone:false}));
    } finally { setIsLoading(false); }
  }, [session.messages, session.topic, stopTts, stopRecording, stopVoiceRecording]);

  const stopSession = useCallback(async () => {
    if (session.messages.length >= 2) {
      await finishSession();
      return;
    }
    const wasVoice = sessionModeRef.current === "voice";
    setSessionMode(null);
    sessionModeRef.current = null;
    voiceStreamCompleteRef.current = false;
    voiceAbortRef.current?.abort();
    stopVoiceRecording(true);
    stopRecording(); stopTts(); setIsLoading(false);
    playbackRef.current.clear();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    isProcessingRef.current = false;
    try {
      if (wasVoice) {
        await playStreamingTts(GOODBYE_MESSAGE);
      } else {
        await playTts(GOODBYE_MESSAGE);
      }
    } catch { /* ignore */ }
    setShowTranscript(true);
  }, [session.messages.length, finishSession, stopVoiceRecording, stopRecording, stopTts, playTts, playStreamingTts]);

  const newSession = useCallback(() => {
    if (session.phase === "complete" && session.report && !showFeedback) {
      setShowFeedback(true);
      return;
    }
    sessionGenRef.current+=1; isProcessingRef.current=false; stopTts(); stopRecording(); stopVoiceRecording(true);
    voiceAbortRef.current?.abort();
    voiceStreamCompleteRef.current = false;
    playbackRef.current.clear();
    setSession({ topic:"", part:1, answeredCount:0, messages:[], phase:"idle", report:null, partDone:false });
    setInput(""); setError(null); setLastTtsText(null); setSessionNumber(0); setSessionMode(null);
    setTranscript([]); setShowTranscript(false); setShowFeedback(false);
  }, [stopTts, stopRecording, stopVoiceRecording, session.phase, session.report, showFeedback]);

  const canRecord = useCallback(() => {
    if (sessionModeRef.current !== "voice") return false;
    if (isSpeakingRef.current) return false;
    if (isProcessingRef.current) return false;
    const s = sessionRef.current;
    return s.phase === "part1" || s.phase === "part2-answer" || s.phase === "part3";
  }, []);

  const scheduleRestart = useCallback(() => {
    clearRestartTimer();
  }, [clearRestartTimer]);

  const startRecording = useCallback(() => {
    if (speechRecognitionRef.current) return;
    if (isSpeakingRef.current) return;
    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) {
      setError("Voice recognition is not supported in your browser. Please use Chrome or Edge, or switch to text mode.");
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let finalTranscript = "";
    let hasSpoken = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      hasSpoken = true;
      setInterimText(interim);
      if (finalTranscript) setInput(finalTranscript);
      resetSilenceTimer(recognition);
    };
    recognition.onspeechend = () => {
      if (hasSpoken) {
        resetSilenceTimer(recognition);
      }
    };
    recognition.onend = () => {
      clearSilenceTimer();
      speechRecognitionRef.current = null;
      setIsRecording(false); setInterimText("");
      const text = finalTranscript.trim();
      if (text && sessionModeRef.current === "voice") {
        setInput(""); sendTextRef.current?.(text);
      } else if (text) {
        setInput(text);
      } else if (!hasSpoken) {
        scheduleRestart();
      }
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilenceTimer();
      speechRecognitionRef.current = null;
      setIsRecording(false); setInterimText("");
      if (event.error === "no-speech") {
        scheduleRestart();
      } else if (event.error !== "aborted") {
        setError(`Voice recognition error: ${event.error}. Please try text mode instead.`);
      }
    };
    try {
      recognition.start();
      speechRecognitionRef.current = recognition;
      setIsRecording(true);
    } catch {
      setError("Could not start voice recognition. Please use text mode.");
    }
  }, [resetSilenceTimer, clearSilenceTimer, scheduleRestart]);

  useEffect(() => { startRecordingRef.current = startRecording; }, [startRecording]);

  if (showTranscript) {
    return <TranscriptViewer topic={session.topic} entries={transcript} report={session.report} onClose={()=>setShowTranscript(false)} onNewSession={newSession} />;
  }

  if (session.phase === "idle") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background:`linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>
        <div className="w-full max-w-md space-y-6 text-center">
          <div>
            <img src="/logo.png" alt="4 IELTS" className="w-20 h-20 object-contain mx-auto mb-3 drop-shadow-xl" />
            <h2 className="text-2xl font-black text-white mb-1">Choose Your Mode</h2>
            <p className="text-white/50 text-sm">How would you like to practise speaking?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startSession("voice")}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
              style={{ background:`rgba(0,180,200,0.08)`, border:`2px solid rgba(0,180,200,0.35)` }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background:`linear-gradient(135deg,${TEAL},#00D4F0)` }}>
                <Mic className="w-6 h-6" style={{ color: NAVY }} />
              </div>
              <div>
                <div className="font-bold text-white">Voice Mode</div>
                <div className="text-sm text-white/50">Real-time voice — speak and hear AI instantly</div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 ml-auto" />
            </button>

            <button
              onClick={() => startSession("text")}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(255,255,255,0.1)" }}>
                <MessageSquare className="w-6 h-6 text-white/60" />
              </div>
              <div>
                <div className="font-bold text-white">Text Mode</div>
                <div className="text-sm text-white/50">Type your answers and receive feedback</div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 ml-auto" />
            </button>
          </div>

          <button onClick={onBack} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors mx-auto">
            <ArrowLeft className="w-4 h-4" />Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background:`linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}>

      <header className="shrink-0 flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(0,180,200,0.15)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm" title="Back to Home">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <img src="/logo.png" alt="4 IELTS" className="w-8 h-8 object-contain" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Churchill AI</span>
              {sessionNumber > 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:`rgba(0,180,200,0.15)`, color: TEAL }}>Session #{sessionNumber}</span>}
            </div>
            {session.topic && <div className="text-xs text-white/40">Topic: {session.topic}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DaysLeftBadge expiresAt={expiresAt} />
          {session.phase !== "idle" && (
            <button onClick={() => setShowTranscript(true)} className="p-2 rounded-xl text-white/40 hover:bg-white/10 transition-colors" title="View transcript">
              <BookOpen className="w-4 h-4" />
            </button>
          )}
          <button onClick={stopSession} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors hover:bg-red-500/20" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171" }} title="Finish Session">
            <Square className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Finish</span>
          </button>
        </div>
      </header>

      {session.phase !== "idle" && (
        <div className="shrink-0 px-4 py-3">
          <PartIndicator part={session.part} phase={session.phase} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {session.phase === "complete" && session.report ? (
          <FinalReport report={session.report} topic={session.topic} onNewSession={newSession} />
        ) : (
          <>
            {session.messages.map((msg,i) => (
              msg.role === "assistant"
                ? <AIChatBubble key={i} content={msg.content} />
                : <UserChatBubble key={i} content={msg.content} />
            ))}

            {streamingContent !== null && (
              <AIChatBubble content={streamingContent || "…"} />
            )}

            {isLoading && streamingContent === null && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: GOLD }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: NAVY }} />
                </div>
                <div className="rounded-2xl px-4 py-3 text-sm text-white/50" style={{ background:"rgba(255,255,255,0.08)" }}>Churchill is reviewing your answer…</div>
              </div>
            )}

            {session.phase === "part2-prep" && (
              <div className="space-y-4">
                <Part2CueCard topic={session.topic} />
                <CountdownTimer seconds={PREP_TIME} onEnd={handleTimerEnd} />
                <button
                  onClick={handleTimerEnd}
                  className="w-full py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90"
                  style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"white" }}
                >
                  Skip Prep — Start Speaking
                </button>
              </div>
            )}

            {session.phase === "report-loading" && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: GOLD }} />
                <p className="text-white/60 font-medium">Generating your band score report…</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)" }}>
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-red-300">{error}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {session.phase !== "complete" && session.phase !== "report-loading" && session.phase !== "idle" && (
        <div className="shrink-0 border-t border-white/10 p-4 space-y-3">

          {session.partDone && (
            <div className="space-y-2">
              {session.part < 3 ? (
                <button
                  onClick={nextPart}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background:`linear-gradient(135deg,${TEAL},#00D4F0)`, color: NAVY }}
                >
                  <ChevronRight className="w-5 h-5" />
                  Continue to Part {session.part + 1}
                </button>
              ) : (
                <button
                  onClick={viewReport}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background:`linear-gradient(135deg,${TEAL},#00D4F0)`, color: NAVY }}
                >
                  <Trophy className="w-5 h-5" />
                  View Band Score Report
                </button>
              )}
            </div>
          )}

          {!session.partDone && session.phase !== "part2-prep" && sessionMode === "voice" && (
            <div className="space-y-3">
              <VoiceOrb
                state={isRecording ? "listening" : isLoading ? "thinking" : isSpeaking ? "speaking" : "idle"}
                onTap={() => {
                  if (isRecording) {
                    stopVoiceRecording(false);
                  } else if (!isLoading && !isSpeaking) {
                    startVoiceRecording();
                  }
                }}
              />
              <div className="flex items-center justify-center gap-2">
                <button onClick={isSpeaking ? stopTts : replayTts} className="p-2 rounded-xl transition-colors hover:bg-white/10" style={{ color:"rgba(255,255,255,0.4)" }}>
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="flex gap-1">
                  {SPEED_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTtsSpeed(opt.value)}
                      className="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={ttsSpeed === opt.value ? { background:`rgba(0,180,200,0.25)`, color: TEAL } : { color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.05)" }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!session.partDone && session.phase !== "part2-prep" && sessionMode !== "voice" && (
            <>
              <div className="flex items-start gap-2">
                <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={isRecording ? "Listening… speak now" : "Type your answer here… (Enter to send)"}
                  rows={5}
                  className="w-full resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 transition-all"
                  style={{ background:"rgba(255,255,255,0.08)", border: isRecording ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.15)" } as React.CSSProperties}
                  disabled={isLoading}
                />
                {isRecording && interimText && (
                  <div className="absolute bottom-3 left-0 right-0 px-4 py-1 text-xs text-white/40 italic truncate pointer-events-none">{interimText}</div>
                )}
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-2xl transition-all hover:opacity-90 disabled:opacity-40 shrink-0 self-end"
                style={{ background:`linear-gradient(135deg,${TEAL},#00D4F0)` }}
              >
                <Send className="w-5 h-5" style={{ color: NAVY }} />
              </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                    } else {
                      startRecording();
                    }
                  }}
                  disabled={isLoading || isSpeaking}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isRecording ? "animate-pulse" : ""}`}
                  style={isRecording ? { background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.5)", color:"#f87171" } : { background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.6)" }}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? "Stop Recording" : "Record Voice"}
                </button>

                <button
                  onClick={stopSession}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-red-500/20"
                  style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171" }}
                >
                  <Square className="w-3 h-3 fill-current" />
                  Finish Session
                </button>

                <div className="ml-auto flex items-center gap-1">
                  <button onClick={isSpeaking ? stopTts : replayTts} className="p-2 rounded-xl transition-colors hover:bg-white/10" style={{ color:"rgba(255,255,255,0.4)" }}>
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="flex gap-1">
                    {SPEED_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTtsSpeed(opt.value)}
                        className="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                        style={ttsSpeed === opt.value ? { background:`rgba(0,180,200,0.25)`, color: TEAL } : { color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.05)" }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showFeedback && (
        <FeedbackPopup
          tool="speaking"
          onClose={() => {
            setShowFeedback(false);
            sessionGenRef.current+=1; isProcessingRef.current=false; stopTts(); stopRecording();
            setSession({ topic:"", part:1, answeredCount:0, messages:[], phase:"idle", report:null, partDone:false });
            setInput(""); setError(null); setLastTtsText(null); setSessionNumber(0); setSessionMode(null);
            setTranscript([]); setShowTranscript(false);
          }}
        />
      )}
    </div>
  );
}
