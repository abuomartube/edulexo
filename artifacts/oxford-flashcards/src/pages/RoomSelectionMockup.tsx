import {
  Mic,
  Headphones,
  GraduationCap,
  MessageCircle,
  PenLine,
  GraduationCap as Course,
  MessageSquare,
  User,
} from "lucide-react";
import {
  Header,
  SearchBar,
  Tabs,
  RoomCard,
  chatUI,
  PhoneFrame,
  PageBackdrop,
} from "@/components/chat-ui";
import { useState } from "react";

type RoomFilter = "all" | "speaking" | "voice" | "ielts";

function NavTab({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button className="flex-1 flex flex-col items-center gap-0.5 py-1.5">
      <div className={`relative ${active ? "" : "opacity-60"}`}>
        {active && (
          <div className="absolute inset-0 -m-1.5 rounded-full bg-purple-500/40 blur-md" />
        )}
        <div
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${
            active
              ? "ring-1 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              : ""
          }`}
          style={
            active
              ? { background: chatUI.gradient.purpleSimple }
              : undefined
          }
        >
          {icon}
        </div>
      </div>
      <span
        className={`text-[10px] font-semibold ${
          active ? "text-white" : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

const ALL_ROOMS = [
  {
    id: "1",
    cat: "speaking" as const,
    icon: <Mic size={18} className="text-white" />,
    tone: "blue" as const,
    title: "Speaking Room - Beginner",
    desc: "تحدث وتدرب على المحادثة اليومية",
    online: 18,
  },
  {
    id: "2",
    cat: "speaking" as const,
    icon: <Mic size={18} className="text-white" />,
    tone: "purple" as const,
    title: "Speaking Room - Intermediate",
    desc: "تطوير الطلاقة وزيادة الثقة",
    online: 24,
  },
  {
    id: "3",
    cat: "voice" as const,
    icon: <Headphones size={18} className="text-white" />,
    tone: "emerald" as const,
    title: "Voice Only Room",
    desc: "تحدث بصوت فقط بدون كتابة",
    online: 12,
  },
  {
    id: "4",
    cat: "ielts" as const,
    icon: <GraduationCap size={18} className="text-white" />,
    tone: "pink" as const,
    title: "IELTS Speaking Room",
    desc: "تدرب على أسئلة الـ Speaking خاصة بـ IELTS",
    online: 16,
  },
  {
    id: "5",
    cat: "speaking" as const,
    icon: <MessageCircle size={18} className="text-white" />,
    tone: "rose" as const,
    title: "Casual Chat",
    desc: "دردشة حرة في أي موضوع",
    online: 20,
  },
  {
    id: "6",
    cat: "speaking" as const,
    icon: <PenLine size={18} className="text-white" />,
    tone: "indigo" as const,
    title: "Writing Help Room",
    desc: "طور كتاباتك واطلب المراجعة",
    online: 10,
  },
];

export default function RoomSelectionMockup() {
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [search, setSearch] = useState("");

  const visible = ALL_ROOMS.filter(
    (r) =>
      (filter === "all" || r.cat === filter) &&
      (search === "" ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.desc.includes(search)),
  );

  return (
    <PageBackdrop>
      <PhoneFrame>
        <Header
          title="اختيار الغرفة"
          subtitle={
            <span className="text-[10px] text-slate-400">
              اختر نوع الغرفة الذي تريد الانضمام إليها
            </span>
          }
        />

        {/* search + tabs */}
        <div className="relative z-10 px-4 pt-2.5 pb-2 space-y-2.5 border-b border-white/5">
          <SearchBar
            placeholder="ابحث عن غرفة..."
            value={search}
            onChange={setSearch}
            dir="rtl"
          />
          <Tabs
            dir="rtl"
            value={filter}
            onChange={(v) => setFilter(v as RoomFilter)}
            items={[
              { value: "all", label: "كل الغرف" },
              { value: "speaking", label: "المحادثة" },
              { value: "voice", label: "الصوت فقط" },
              { value: "ielts", label: "IELTS" },
            ]}
          />
        </div>

        {/* room list */}
        <div
          className="relative z-10 flex-1 overflow-y-auto px-4 pt-2.5 pb-2 space-y-2"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(124,58,237,0.06), transparent 60%)",
          }}
        >
          {visible.map((r) => (
            <RoomCard
              key={r.id}
              icon={r.icon}
              tone={r.tone}
              title={r.title}
              desc={r.desc}
              online={r.online}
              joinLabel="انضمام"
            />
          ))}
        </div>

        {/* bottom nav */}
        <div className="relative z-10 px-3 pt-1 pb-1 border-t border-white/5 bg-slate-950/40 backdrop-blur">
          <div dir="ltr" className="flex items-stretch">
            <NavTab
              icon={<Course size={16} className="text-slate-300" />}
              label="الدورات"
            />
            <NavTab
              icon={<MessageSquare size={16} className="text-white" />}
              label="الشات"
              active
            />
            <NavTab
              icon={<User size={16} className="text-slate-300" />}
              label="الملف الشخصي"
            />
          </div>
          <div className="flex justify-center pt-0.5 pb-1">
            <div className="w-28 h-1 rounded-full bg-white/40" />
          </div>
        </div>
      </PhoneFrame>
    </PageBackdrop>
  );
}
