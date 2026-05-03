import type { AvatarTone } from "@/components/chat-ui";

// ---- Users -----------------------------------------------------------------

export type User = {
  id: string;
  name: string;
  letter: string;
  tone: AvatarTone;
  bio?: string;
  level?: "Beginner" | "Intermediate" | "Advanced";
  country?: string;
};

export const USERS: User[] = [
  { id: "u1", name: "Omar", letter: "O", tone: "blue", level: "Intermediate", country: "🇸🇦" },
  { id: "u2", name: "Sara", letter: "S", tone: "pink", level: "Advanced", country: "🇪🇬" },
  { id: "u3", name: "James", letter: "J", tone: "emerald", level: "Advanced", country: "🇬🇧" },
  { id: "u4", name: "Lina", letter: "L", tone: "amber", level: "Intermediate", country: "🇲🇦" },
  { id: "u5", name: "Maya", letter: "M", tone: "purple", level: "Beginner", country: "🇯🇴" },
  { id: "u6", name: "Ahmad", letter: "A", tone: "rose", level: "Intermediate", country: "🇦🇪" },
  { id: "u7", name: "Kenza", letter: "K", tone: "indigo", level: "Advanced", country: "🇩🇿" },
  { id: "u8", name: "Nora", letter: "N", tone: "blue", level: "Beginner", country: "🇰🇼" },
  { id: "u9", name: "Yusuf", letter: "Y", tone: "emerald", level: "Intermediate", country: "🇹🇷" },
  { id: "u10", name: "Rana", letter: "R", tone: "pink", level: "Intermediate", country: "🇶🇦" },
];

export function userById(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}

// ---- Rooms -----------------------------------------------------------------

export type RoomCategory = "speaking" | "voice" | "ielts";
export type RoomIconKey =
  | "mic"
  | "headphones"
  | "graduation"
  | "message"
  | "pen";

export type MockRoom = {
  id: string;
  cat: RoomCategory;
  title: string;
  desc: string;
  online: number;
  tone: AvatarTone;
  iconKey: RoomIconKey;
  about: string;
};

export const MOCK_ROOMS: MockRoom[] = [
  {
    id: "1",
    cat: "speaking",
    title: "Speaking Room - Beginner",
    desc: "تحدث وتدرب على المحادثة اليومية",
    online: 18,
    tone: "blue",
    iconKey: "mic",
    about:
      "غرفة للمبتدئين. تدرب على عبارات يومية وكوّن جملك بثقة مع زملائك.",
  },
  {
    id: "2",
    cat: "speaking",
    title: "Speaking Room - Intermediate",
    desc: "تطوير الطلاقة وزيادة الثقة",
    online: 24,
    tone: "purple",
    iconKey: "mic",
    about:
      "غرفة مخصصة للمتحدثين بمستوى متوسط. تدرب على المحادثات اليومية، شارك تجاربك، واستخدم مولّد المواضيع لكسر الجمود مع الأعضاء الآخرين.",
  },
  {
    id: "3",
    cat: "voice",
    title: "Voice Only Room",
    desc: "تحدث بصوت فقط بدون كتابة",
    online: 12,
    tone: "emerald",
    iconKey: "headphones",
    about: "غرفة صوتية فقط — استمع وشارك بدون كتابة.",
  },
  {
    id: "4",
    cat: "ielts",
    title: "IELTS Speaking Room",
    desc: "تدرب على أسئلة الـ Speaking خاصة بـ IELTS",
    online: 16,
    tone: "pink",
    iconKey: "graduation",
    about:
      "غرفة مخصصة للتحضير لاختبار IELTS Speaking مع أسئلة مشابهة للاختبار.",
  },
  {
    id: "5",
    cat: "speaking",
    title: "Casual Chat",
    desc: "دردشة حرة في أي موضوع",
    online: 31,
    tone: "rose",
    iconKey: "message",
    about: "دردشة عامة وحرة بدون قيود على الموضوع.",
  },
];

export function getRoomById(id: string | undefined): MockRoom | undefined {
  if (!id) return undefined;
  return MOCK_ROOMS.find((r) => r.id === id);
}

// ---- Participants / voice room sub-data ------------------------------------

export const PARTICIPANTS = USERS.slice(0, 7).map((u) => ({
  letter: u.letter,
  tone: u.tone,
  name: u.name,
}));

export const ROOM_RULES = [
  "تحدث بالإنجليزية فقط داخل الغرفة",
  "احترم بقية المشاركين ولا تقاطعهم",
  "لا تشارك معلومات شخصية",
  "ممنوع الإعلانات أو الروابط الخارجية",
];

export const VOICE_SPEAKERS: {
  letter: string;
  tone: AvatarTone;
  name: string;
  speaking?: boolean;
}[] = [
  { letter: "O", tone: "blue", name: "Omar", speaking: true },
  { letter: "S", tone: "pink", name: "Sara" },
  { letter: "J", tone: "emerald", name: "James" },
];

export const VOICE_LISTENERS: { letter: string; tone: AvatarTone; name: string }[] =
  USERS.slice(3).map((u) => ({ letter: u.letter, tone: u.tone, name: u.name }));

// ---- Topics & ice-breakers -------------------------------------------------

export const ICE_BREAKERS = [
  "What was the best part of your week?",
  "If you could travel anywhere right now, where would you go?",
  "What's a small thing that made you smile today?",
  "What's your favorite way to learn English?",
  "Describe your perfect weekend in 3 sentences.",
  "What's a skill you want to learn this year?",
  "Coffee or tea — and how do you take it?",
];

export const TOPICS = [
  "Travel & Cultures",
  "Daily Routines",
  "Food & Cooking",
  "Movies & Books",
  "Future Goals",
  "Technology & AI",
  "Sports & Fitness",
  "Music & Hobbies",
];

// ---- Messages --------------------------------------------------------------

export type ChatMsgKind =
  | "incoming"
  | "outgoing"
  | "system"
  | "voice-out"
  | "voice-in";

export type ChatMsg = {
  id: string;
  kind: ChatMsgKind;
  name?: string;
  letter?: string;
  tone?: AvatarTone;
  time: string;
  text?: string;
  reactions?: number;
  duration?: string;
};

export function nowTime(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

// Helper to build an incoming message from a user id
function inMsg(
  id: string,
  userId: string,
  time: string,
  text: string,
  reactions?: number,
): ChatMsg {
  const u = userById(userId)!;
  return {
    id,
    kind: "incoming",
    name: u.name,
    letter: u.letter,
    tone: u.tone,
    time,
    text,
    reactions,
  };
}

function inVoice(id: string, userId: string, time: string, duration: string): ChatMsg {
  const u = userById(userId)!;
  return {
    id,
    kind: "voice-in",
    name: u.name,
    letter: u.letter,
    tone: u.tone,
    time,
    duration,
  };
}

function outMsg(id: string, time: string, text: string): ChatMsg {
  return { id, kind: "outgoing", time, text };
}

function outVoice(id: string, time: string, duration: string): ChatMsg {
  return { id, kind: "voice-out", time, duration };
}

function sysMsg(id: string, time: string, text: string): ChatMsg {
  return { id, kind: "system", time, text };
}

// Per-room seed conversations — each one is a self-contained "live" feel.

const CONVERSATION_BY_ROOM: Record<string, ChatMsg[]> = {
  // Speaking - Beginner
  "1": [
    inMsg("r1m1", "u8", "9:58 AM", "Hi! I'm new here 👋 is it okay to start?", 1),
    inMsg("r1m2", "u4", "9:59 AM", "Welcome Nora! Yes of course, just say hello in English 🙂"),
    inMsg("r1m3", "u8", "10:01 AM", "Okay! My name is Nora and I'm from Kuwait."),
    inVoice("r1m4", "u4", "10:02 AM", "0:14"),
    inMsg("r1m5", "u1", "10:03 AM", "Nice to meet you Nora! What do you do?"),
    inMsg("r1m6", "u8", "10:05 AM", "I am a student. I study marketing 📚", 2),
    sysMsg("r1m7", "10:06 AM", "Topic suggestion: Daily Routines 💡"),
    inMsg("r1m8", "u5", "10:08 AM", "I usually wake up at 7 and go to the gym 💪"),
  ],

  // Speaking - Intermediate
  "2": [
    inMsg("r2m1", "u1", "10:20 AM", "Hi everyone! 👋 How was your weekend?", 2),
    inMsg("r2m2", "u2", "10:21 AM", "It was great! I went hiking with my friends 😊", 1),
    outVoice("r2m3", "10:22 AM", "0:18"),
    inMsg("r2m4", "u3", "10:23 AM", "Anyone wants to do a quick speaking exercise?"),
    sysMsg("r2m5", "10:24 AM", "Please try to use English only 😊"),
    inVoice("r2m6", "u7", "10:26 AM", "0:32"),
    inMsg("r2m7", "u6", "10:28 AM", "Kenza that pronunciation was 🔥 really clear!", 4),
    inMsg("r2m8", "u3", "10:30 AM", "Agreed! Try to slow down on long sentences though."),
    outMsg("r2m9", "10:31 AM", "Thanks Kenza, that helped me a lot 🙏"),
    inMsg("r2m10", "u10", "10:33 AM", "Can someone explain the difference between 'used to' and 'would'?"),
  ],

  // Voice Only Room (text fallback / preview)
  "3": [
    sysMsg("r3m1", "10:00 AM", "Welcome to Voice Only — please switch to the audio room 🎙️"),
    inMsg("r3m2", "u1", "10:02 AM", "Just listening today, going to share something soon."),
  ],

  // IELTS Speaking
  "4": [
    sysMsg("r4m1", "9:30 AM", "Today's task: Part 2 — Describe a place you'd like to visit."),
    inMsg("r4m2", "u7", "9:32 AM", "I'll go first. Give me 1 minute to prepare ✍️"),
    inVoice("r4m3", "u7", "9:34 AM", "1:48"),
    inMsg("r4m4", "u3", "9:36 AM", "Great structure Kenza — strong intro and conclusion. Try varying connectors more.", 5),
    inMsg("r4m5", "u2", "9:38 AM", "Can someone do Part 3 follow-up questions with me?"),
    outMsg("r4m6", "9:39 AM", "I can! Send the question 🙋"),
    inMsg("r4m7", "u2", "9:40 AM", "Why do people enjoy travelling abroad more than locally?"),
    inVoice("r4m8", "u9", "9:42 AM", "1:12"),
    sysMsg("r4m9", "9:43 AM", "Reminder: aim for 2 mins on Part 2, no less."),
  ],

  // Casual Chat
  "5": [
    inMsg("r5m1", "u6", "8:45 AM", "Good morning everyone ☕"),
    inMsg("r5m2", "u10", "8:46 AM", "Morning Ahmad! What are you up to today?"),
    inMsg("r5m3", "u6", "8:47 AM", "Working from a café today — best decision ever 😄", 3),
    inVoice("r5m4", "u5", "8:50 AM", "0:22"),
    inMsg("r5m5", "u9", "8:53 AM", "Maya I love that song! What's it called?"),
    inMsg("r5m6", "u5", "8:54 AM", "It's 'Golden Hour' — perfect morning vibes 🌅"),
    sysMsg("r5m7", "8:55 AM", "Ice Breaker: What's a small thing that made you smile today?"),
    inMsg("r5m8", "u4", "8:57 AM", "My cat brought me her toy at 6am 😹", 6),
    outMsg("r5m9", "8:58 AM", "haha that's adorable 😍"),
    inMsg("r5m10", "u3", "9:00 AM", "I finally finished a book I've been reading for months 📖"),
  ],
};

export function seedMessages(roomId?: string): ChatMsg[] {
  if (roomId && CONVERSATION_BY_ROOM[roomId]) {
    return [...CONVERSATION_BY_ROOM[roomId]];
  }
  return [...CONVERSATION_BY_ROOM["2"]];
}

// ---- Misc helpers used by chatApi ------------------------------------------

export function randomDuration(): string {
  const sec = 5 + Math.floor(Math.random() * 55);
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function nextMessageId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
