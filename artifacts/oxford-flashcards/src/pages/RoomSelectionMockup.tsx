import {
  ChevronLeft,
  MoreVertical,
  Search,
  Mic,
  Headphones,
  GraduationCap,
  MessageCircle,
  PenLine,
  GraduationCap as Course,
  MessageSquare,
  User,
} from "lucide-react";

type Tone = "blue" | "purple" | "emerald" | "pink" | "rose" | "indigo";

const TONE_GRAD: Record<Tone, string> = {
  blue: "from-blue-400 via-blue-500 to-indigo-600",
  purple: "from-fuchsia-500 via-purple-500 to-indigo-600",
  emerald: "from-emerald-400 via-emerald-500 to-teal-600",
  pink: "from-pink-500 via-rose-500 to-rose-600",
  rose: "from-rose-500 via-red-500 to-orange-600",
  indigo: "from-sky-400 via-blue-500 to-indigo-600",
};

const TONE_GLOW: Record<Tone, string> = {
  blue: "rgba(59,130,246,0.55)",
  purple: "rgba(168,85,247,0.55)",
  emerald: "rgba(16,185,129,0.55)",
  pink: "rgba(244,63,94,0.55)",
  rose: "rgba(249,115,22,0.55)",
  indigo: "rgba(99,102,241,0.55)",
};

function FilterChip({ label, active = false }: { label: string; active?: boolean }) {
  if (active) {
    return (
      <button
        className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white ring-1 ring-white/15 shadow-[0_6px_18px_-4px_rgba(124,58,237,0.6),inset_0_1px_0_rgba(255,255,255,0.2)]"
        style={{
          background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <button className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-slate-300 bg-white/5 ring-1 ring-white/10 hover:bg-white/10">
      {label}
    </button>
  );
}

function RoomCard({
  icon,
  tone,
  title,
  desc,
  online,
}: {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  desc: string;
  online: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-800/70 backdrop-blur border border-white/5 p-2.5 flex items-center gap-3 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="relative shrink-0">
        <div
          className="absolute inset-0 -m-1 rounded-2xl blur-md opacity-70"
          style={{ background: TONE_GLOW[tone] }}
        />
        <div
          className={`relative w-10 h-10 rounded-2xl bg-gradient-to-br ${TONE_GRAD[tone]} flex items-center justify-center ring-1 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]`}
        >
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-bold text-white truncate leading-tight">{title}</div>
        <div className="text-[10.5px] text-slate-400 truncate mt-0.5 leading-tight">{desc}</div>
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-400 font-semibold">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          {online} online
        </div>
      </div>
      <button
        className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white ring-1 ring-white/15"
        style={{
          background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
          boxShadow:
            "0 6px 16px -4px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        انضمام
      </button>
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
      <div
        className={`relative ${active ? "" : "opacity-60"}`}
      >
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
              ? {
                  background:
                    "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                }
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

export default function RoomSelectionMockup() {
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
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-700/25 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-blue-700/25 blur-[140px]" />
      </div>

      {/* ── PHONE FRAME ─────────────────────────── */}
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
          {/* notch */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-7 rounded-full bg-black z-30" />

          {/* status bar */}
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

          {/* ── HEADER ─────────────────────────── */}
          <header className="relative z-10 px-4 pt-2 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
                <ChevronLeft size={18} className="text-slate-300 rotate-180" />
              </button>
              <div className="flex-1 min-w-0 text-center">
                <h1 className="text-[15px] font-bold text-white leading-tight">
                  اختيار الغرفة
                </h1>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  اختر نوع الغرفة الذي تريد الانضمام إليها
                </p>
              </div>
              <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
                <MoreVertical size={16} className="text-slate-300" />
              </button>
            </div>

            {/* search */}
            <div className="mt-3 flex items-center gap-2 rounded-full bg-slate-900/80 ring-1 ring-white/10 backdrop-blur px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <Search size={14} className="text-slate-500" />
              <input
                readOnly
                dir="rtl"
                placeholder="ابحث عن غرفة..."
                className="flex-1 bg-transparent text-[12px] text-slate-200 placeholder:text-slate-500 outline-none text-right"
              />
            </div>

            {/* filter chips */}
            <div dir="rtl" className="flex items-center gap-2 mt-3">
              <FilterChip label="كل الغرف" active />
              <FilterChip label="المحادثة" />
              <FilterChip label="الصوت فقط" />
              <FilterChip label="IELTS" />
            </div>
          </header>

          {/* ── ROOM LIST ─────────────────────────── */}
          <div
            className="relative z-10 flex-1 overflow-y-auto px-4 pt-2.5 pb-2 space-y-2"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(124,58,237,0.06), transparent 60%)",
            }}
          >
            <RoomCard
              icon={<Mic size={18} className="text-white" />}
              tone="blue"
              title="Speaking Room - Beginner"
              desc="تحدث وتدرب على المحادثة اليومية"
              online={18}
            />
            <RoomCard
              icon={<Mic size={18} className="text-white" />}
              tone="purple"
              title="Speaking Room - Intermediate"
              desc="تطوير الطلاقة وزيادة الثقة"
              online={24}
            />
            <RoomCard
              icon={<Headphones size={18} className="text-white" />}
              tone="emerald"
              title="Voice Only Room"
              desc="تحدث بصوت فقط بدون كتابة"
              online={12}
            />
            <RoomCard
              icon={<GraduationCap size={18} className="text-white" />}
              tone="pink"
              title="IELTS Speaking Room"
              desc="تدرب على أسئلة الـ Speaking خاصة بـ IELTS"
              online={16}
            />
            <RoomCard
              icon={<MessageCircle size={18} className="text-white" />}
              tone="rose"
              title="Casual Chat"
              desc="دردشة حرة في أي موضوع"
              online={20}
            />
            <RoomCard
              icon={<PenLine size={18} className="text-white" />}
              tone="indigo"
              title="Writing Help Room"
              desc="طور كتاباتك واطلب المراجعة"
              online={10}
            />
          </div>

          {/* ── BOTTOM NAV ─────────────────────────── */}
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
            {/* home indicator */}
            <div className="flex justify-center pt-0.5 pb-1">
              <div className="w-28 h-1 rounded-full bg-white/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
