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
} from "@/components/chat-ui";
import { useState } from "react";

type RoomFilter = "all" | "speaking" | "voice" | "ielts";

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-[390px] h-[844px] rounded-[44px] p-[6px]"
      style={{
        background:
          "linear-gradient(180deg, #1f2937 0%, #0f172a 50%, #020617 100%)",
        boxShadow:
          "0 60px 120px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px -20px rgba(124,58,237,0.45)",
      }}
    >
      <div
        dir="rtl"
        className="relative w-full h-full rounded-[38px] overflow-hidden flex flex-col text-white"
        style={{
          background:
            "linear-gradient(180deg, #0b1224 0%, #060b1a 50%, #02050d 100%)",
        }}
      >
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-7 rounded-full bg-black z-30" />
        <div
          dir="ltr"
          className="relative z-10 flex items-center justify-between px-7 pt-3 pb-1 text-[12px] font-semibold text-white/90"
        >
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-[2px]">
              <span className="w-[3px] h-[5px] bg-white rounded-sm" />
              <span className="w-[3px] h-[7px] bg-white rounded-sm" />
              <span className="w-[3px] h-[9px] bg-white rounded-sm" />
              <span className="w-[3px] h-[11px] bg-white rounded-sm" />
            </span>
            <span className="ml-1 text-[10px]">5G</span>
            <span className="ml-1 inline-flex items-center">
              <span className="w-5 h-2.5 rounded-[3px] border border-white/80 relative">
                <span className="absolute inset-0.5 rounded-sm bg-white" />
              </span>
              <span className="w-0.5 h-1 bg-white/80 rounded-r-sm" />
            </span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

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
    <div
      dir="ltr"
      className="min-h-screen w-full flex items-center justify-center p-8 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, #1a1444 0%, #0a1126 30%, #050816 60%, #02030a 100%)",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-700/25 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-blue-700/25 blur-[140px]" />
      </div>

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
    </div>
  );
}
