import type { AvatarTone } from "@/components/chat-ui";

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
    online: 20,
    tone: "rose",
    iconKey: "message",
    about: "دردشة عامة وحرة بدون قيود على الموضوع.",
  },
  {
    id: "6",
    cat: "speaking",
    title: "Writing Help Room",
    desc: "طور كتاباتك واطلب المراجعة",
    online: 10,
    tone: "indigo",
    iconKey: "pen",
    about: "شارك كتاباتك واحصل على مراجعة من بقية المشاركين.",
  },
];

export function getRoomById(id: string | undefined): MockRoom | undefined {
  if (!id) return undefined;
  return MOCK_ROOMS.find((r) => r.id === id);
}

export const PARTICIPANTS: { letter: string; tone: AvatarTone; name: string }[] =
  [
    { letter: "O", tone: "blue", name: "Omar" },
    { letter: "S", tone: "pink", name: "Sara" },
    { letter: "J", tone: "emerald", name: "James" },
    { letter: "L", tone: "amber", name: "Lina" },
    { letter: "M", tone: "purple", name: "Maya" },
    { letter: "A", tone: "rose", name: "Ahmad" },
    { letter: "K", tone: "indigo", name: "Kenza" },
  ];

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
  [
    { letter: "L", tone: "amber", name: "Lina" },
    { letter: "M", tone: "purple", name: "Maya" },
    { letter: "A", tone: "rose", name: "Ahmad" },
    { letter: "K", tone: "indigo", name: "Kenza" },
    { letter: "N", tone: "blue", name: "Nora" },
    { letter: "Y", tone: "emerald", name: "Yusuf" },
    { letter: "R", tone: "pink", name: "Rana" },
    { letter: "H", tone: "purple", name: "Hadi" },
  ];

export const ICE_BREAKERS = [
  "What was the best part of your week?",
  "If you could travel anywhere right now, where would you go?",
  "What's a small thing that made you smile today?",
  "What's your favorite way to learn English?",
];

export const TOPICS = [
  "Travel & Cultures",
  "Daily Routines",
  "Food & Cooking",
  "Movies & Books",
  "Future Goals",
];

export type ChatMsgKind = "incoming" | "outgoing" | "system" | "voice-out";

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

export function seedMessages(): ChatMsg[] {
  return [
    {
      id: "m1",
      kind: "incoming",
      name: "Omar",
      letter: "O",
      tone: "blue",
      time: "10:20 AM",
      text: "Hi everyone! 👋 How was your weekend?",
      reactions: 2,
    },
    {
      id: "m2",
      kind: "incoming",
      name: "Sara",
      letter: "S",
      tone: "pink",
      time: "10:21 AM",
      text: "It was great! I went hiking with my friends 😊",
      reactions: 1,
    },
    { id: "m3", kind: "voice-out", time: "10:22 AM", duration: "0:18" },
    {
      id: "m4",
      kind: "incoming",
      name: "James",
      letter: "J",
      tone: "emerald",
      time: "10:23 AM",
      text: "Anyone wants to do a quick speaking exercise?",
    },
    {
      id: "m5",
      kind: "system",
      time: "10:24 AM",
      text: "Please try to use English only 😊",
    },
  ];
}

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
