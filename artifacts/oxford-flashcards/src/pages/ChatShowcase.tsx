import {
  Bell,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Mic,
  Headphones,
  Heart,
  PenLine,
  Target,
  Star,
  ArrowRight,
  ArrowLeft,
  Check,
  MoreHorizontal,
  Hand,
  Smile,
  Paperclip,
  Send,
  Play,
  FileText,
  Download,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Image as ImageIcon,
  ChevronDown,
  Trophy,
  Award,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  HelpCircle,
  Mail,
  Info,
  Bell as BellIcon,
  Globe,
  Moon,
  GraduationCap,
  Edit3,
  Users,
} from "lucide-react";

/* ──────────────────────────── primitives ──────────────────────────── */

function Frame({
  children,
  size = "lg",
  className = "",
}: {
  children: React.ReactNode;
  size?: "lg" | "sm";
  className?: string;
}) {
  const dims =
    size === "lg"
      ? "w-[300px] h-[620px] rounded-[32px] p-[18px]"
      : "w-[230px] h-[420px] rounded-[24px] p-3";
  return (
    <div
      className={`${dims} relative bg-gradient-to-b from-[rgba(15,23,42,0.98)] to-[rgba(2,6,23,0.98)] border border-white/[0.18] shadow-[0_25px_70px_rgba(0,0,0,0.50)] overflow-hidden flex flex-col ${className}`}
    >
      {children}
    </div>
  );
}

function StepHeader({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-[0_6px_20px_rgba(37,99,235,0.45)]">
        {n}
      </div>
      <div dir="rtl" className="text-right">
        <div className="text-white text-sm font-bold">{title}</div>
        <div className="text-slate-400 text-[11px]">{sub}</div>
      </div>
    </div>
  );
}

function StepArrow() {
  return (
    <div className="flex items-center justify-center pt-[170px] text-slate-600">
      <ChevronRight size={28} />
    </div>
  );
}

function BottomNav({ active }: { active: "courses" | "chat" | "profile" }) {
  const items = [
    { key: "courses", label: "الدورات", icon: GraduationCap },
    { key: "chat", label: "الشات", icon: MessageCircle },
    { key: "profile", label: "الملف الشخصي", icon: Users },
  ] as const;
  return (
    <div className="absolute bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur border-t border-white/10 flex items-center justify-around py-2">
      {items.map((it) => {
        const Icon = it.icon;
        const on = active === it.key;
        return (
          <div
            key={it.key}
            className={`flex flex-col items-center gap-0.5 ${
              on ? "text-blue-400" : "text-slate-500"
            }`}
          >
            <Icon size={16} />
            <span className="text-[9px] font-semibold">{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Avatar({
  name,
  size = 28,
  from = "from-purple-500",
  to = "to-indigo-600",
}: {
  name: string;
  size?: number;
  from?: string;
  to?: string;
}) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${from} ${to} flex items-center justify-center text-white font-bold border-2 border-slate-950`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

/* ──────────────────────────── Screen 1: Course Selection ──────────────────────────── */

function Screen1() {
  return (
    <Frame>
      <div dir="rtl" className="flex items-center justify-between mb-3">
        <Bell size={16} className="text-slate-400" />
        <div className="text-right">
          <div className="text-white text-[15px] font-bold">اختيار دورتك</div>
          <div className="text-slate-400 text-[10px]">
            اختر الباقة المناسبة لمستواك وهدفك
          </div>
        </div>
      </div>

      <div dir="rtl" className="text-blue-400 text-[10px] font-bold mb-2">
        LEXO FOR ENGLISH
      </div>

      <div className="space-y-2">
        {[
          {
            t: "A1 → B1",
            s: "ابدأ من الأساس وتحدث بثقة",
            chip: "Beginner",
            color: "blue",
          },
          {
            t: "B1+ → C1",
            s: "ارتقِ إلى الطلاقة المتقدمة",
            chip: "Intermediate+",
            color: "green",
          },
          {
            t: "A1 → C1",
            s: "رحلة كاملة من البداية للاحتراف",
            chip: "Complete",
            color: "purple",
          },
        ].map((c) => {
          const tones: Record<string, string> = {
            blue: "from-blue-500 to-blue-600 text-blue-300 bg-blue-500/15",
            green: "from-emerald-500 to-emerald-600 text-emerald-300 bg-emerald-500/15",
            purple: "from-purple-500 to-purple-600 text-purple-300 bg-purple-500/15",
          };
          const grad = tones[c.color].split(" text-")[0];
          const chipCls = "text-" + tones[c.color].split(" text-")[1];
          return (
            <div
              key={c.t}
              dir="rtl"
              className="rounded-2xl bg-white/[0.04] border border-white/10 p-2.5 flex items-center gap-2"
            >
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}
              >
                {c.color === "purple" ? (
                  <Star size={16} className="text-white" />
                ) : (
                  <MessageCircle size={16} className="text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="text-white text-[12px] font-bold">{c.t}</div>
                <div className="text-slate-400 text-[10px] truncate">{c.s}</div>
                <span
                  className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-semibold ${chipCls}`}
                >
                  {c.chip}
                </span>
              </div>
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center`}
              >
                <ArrowLeft size={12} className="text-white" />
              </div>
            </div>
          );
        })}
      </div>

      <div dir="rtl" className="text-purple-400 text-[10px] font-bold mt-3 mb-2">
        LEXO FOR IELTS
      </div>
      <div className="space-y-1.5">
        {[
          { t: "Lexo for Intro", r: "4.5 → 6" },
          { t: "Lexo for Advanced", r: "6 → 8" },
          { t: "Lexo for All-in-one", r: "4.5 → 8", best: true },
        ].map((c) => (
          <div
            key={c.t}
            dir="rtl"
            className="rounded-xl bg-white/[0.04] border border-white/10 p-2 flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Target size={13} className="text-purple-300" />
            </div>
            <div className="flex-1 text-right">
              <div className="text-white text-[11px] font-semibold flex items-center justify-end gap-1.5">
                {c.best && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[8px] font-bold">
                    Best Value
                  </span>
                )}
                {c.t}
              </div>
              <div className="text-slate-400 text-[10px]">{c.r}</div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav active="courses" />
    </Frame>
  );
}

/* ──────────────────────────── Screen 2: Room Selection ──────────────────────────── */

function Screen2() {
  const tabs = ["كل الغرف", "غرف المحادثة", "الصوت فقط", "IELTS"];
  const rooms = [
    {
      n: "Speaking Room - Beginner",
      s: "تحدث وتدرب على المحادثة اليومية",
      online: 18,
      icon: Mic,
      from: "from-blue-500",
      to: "to-blue-600",
    },
    {
      n: "Speaking Room - Intermediate",
      s: "تطوير الطلاقة وزيادة الثقة",
      online: 24,
      icon: Mic,
      from: "from-purple-500",
      to: "to-purple-600",
    },
    {
      n: "Voice Only Room",
      s: "تحدث بصوت فقط بدون كتابة",
      online: 12,
      icon: Headphones,
      from: "from-emerald-500",
      to: "to-emerald-600",
    },
    {
      n: "IELTS Speaking Room",
      s: "Speaking خاص لأسئلة IELTS",
      online: 16,
      icon: Award,
      from: "from-pink-500",
      to: "to-pink-600",
    },
    {
      n: "Casual Chat",
      s: "دردشة حرة في أي موضوع",
      online: 20,
      icon: Heart,
      from: "from-emerald-500",
      to: "to-teal-500",
    },
    {
      n: "Writing Help Room",
      s: "اطرح كتاباتك واحصل على ملاحظات",
      online: 10,
      icon: PenLine,
      from: "from-red-500",
      to: "to-rose-600",
    },
  ];
  return (
    <Frame>
      <div dir="rtl" className="flex items-center justify-between mb-3">
        <ArrowRight size={18} className="text-slate-400" />
        <div className="text-right">
          <div className="text-white text-[15px] font-bold">اختيار الغرفة</div>
          <div className="text-slate-400 text-[10px]">
            اختر الغرفة المناسبة لمستواك وهدفك
          </div>
        </div>
      </div>

      <div dir="rtl" className="flex gap-1.5 overflow-x-auto mb-3">
        {tabs.map((t, i) => (
          <span
            key={t}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap ${
              i === 0
                ? "bg-purple-500 text-white"
                : "bg-white/5 text-slate-400 border border-white/10"
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="space-y-2 overflow-y-auto pe-1">
        {rooms.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.n}
              dir="rtl"
              className="rounded-2xl bg-white/[0.04] border border-white/10 p-2.5 flex items-center gap-2"
            >
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${r.from} ${r.to} flex items-center justify-center shrink-0`}
              >
                <Icon size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="text-white text-[11px] font-bold truncate">
                  {r.n}
                </div>
                <div className="text-slate-400 text-[10px] truncate">{r.s}</div>
                <div className="text-slate-500 text-[9px] mt-0.5 flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {r.online} online
                </div>
              </div>
              <button className="px-2.5 py-1 rounded-lg bg-purple-500 text-white text-[10px] font-bold">
                انضمام
              </button>
            </div>
          );
        })}
      </div>

      <BottomNav active="chat" />
    </Frame>
  );
}

/* ──────────────────────────── Screen 3: Room Details ──────────────────────────── */

function Screen3() {
  return (
    <Frame>
      <div dir="rtl" className="flex items-center justify-between mb-3">
        <MoreHorizontal size={16} className="text-slate-400" />
        <div className="text-white text-[15px] font-bold">تفاصيل الغرفة</div>
        <ArrowRight size={16} className="text-slate-400" />
      </div>

      <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-600 to-blue-600 relative overflow-hidden">
        <div className="absolute right-2 top-3 flex items-end gap-0.5 opacity-50">
          {[8, 14, 20, 12, 18, 10].map((h, i) => (
            <span
              key={i}
              className="w-0.5 bg-white rounded-full"
              style={{ height: h }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center text-center text-white">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
            <Mic size={22} />
          </div>
          <div className="text-[13px] font-bold">Speaking Room -</div>
          <div className="text-[13px] font-bold">Intermediate</div>
          <div dir="rtl" className="text-[10px] text-white/80 mt-1">
            تطوير الطلاقة وزيادة الثقة
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              24 Online
            </span>
            <span dir="rtl" className="opacity-80">
              متوسط المستوى
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white/20 font-mono">
              B1+ → C1
            </span>
          </div>
        </div>
      </div>

      <div
        dir="rtl"
        className="mt-2.5 rounded-xl bg-white/[0.04] border border-white/10 p-2.5"
      >
        <div className="text-white text-[11px] font-bold mb-1">عن الغرفة</div>
        <p className="text-slate-300 text-[10px] leading-relaxed">
          غرفة المحادثة الإنجليزية للمستوى المتوسط فما فوق. تحدث عن مواضيع
          مختلفة ومناسبة لتحسين مهارتك.
        </p>
      </div>

      <div
        dir="rtl"
        className="mt-2 rounded-xl bg-white/[0.04] border border-white/10 p-2.5"
      >
        <div className="text-white text-[11px] font-bold mb-1.5">قواعد الغرفة</div>
        <ul className="space-y-1">
          {[
            "تحدث باللغة الإنجليزية فقط",
            "احترم الآخرين واستمع جيداً",
            "لا مقاطعة أثناء حديث الآخرين",
            "مشاركة مفيدة وإيجابية",
          ].map((r) => (
            <li
              key={r}
              className="flex items-center justify-end gap-1.5 text-slate-200 text-[10px]"
            >
              <span>{r}</span>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/25 text-emerald-300 flex items-center justify-center">
                <Check size={9} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        dir="rtl"
        className="mt-2 rounded-xl bg-white/[0.04] border border-white/10 p-2.5"
      >
        <div className="text-white text-[11px] font-bold mb-1.5">المشاركون الآن</div>
        <div className="flex -space-x-1.5 rtl:space-x-reverse items-center">
          {["O", "S", "J", "L", "N"].map((n, i) => (
            <Avatar
              key={i}
              name={n}
              size={22}
              from={
                ["from-purple-500", "from-pink-500", "from-blue-500", "from-emerald-500", "from-amber-500"][i]
              }
              to="to-indigo-600"
            />
          ))}
          <span className="ms-2 ps-2 text-slate-400 text-[10px] font-bold">+19</span>
        </div>
      </div>

      <button className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[12px] font-bold flex items-center justify-center gap-2">
        <Headphones size={13} /> الانضمام إلى الغرفة
      </button>
      <button
        dir="rtl"
        className="mt-1.5 w-full py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[11px] font-semibold"
      >
        استمع أولاً 🎧
      </button>
    </Frame>
  );
}

/* ──────────────────────────── Screen 4: Chat ──────────────────────────── */

function Bars({ count = 22, color = "bg-white" }: { count?: number; color?: string }) {
  return (
    <div className="flex items-center gap-[2px] h-5">
      {Array.from({ length: count }).map((_, i) => {
        const h = 30 + Math.abs(Math.sin(i * 1.7)) * 70;
        return (
          <span
            key={i}
            className={`w-[2px] rounded-full ${color}`}
            style={{ height: `${h}%`, opacity: i < count * 0.6 ? 1 : 0.4 }}
          />
        );
      })}
    </div>
  );
}

function Screen4() {
  return (
    <Frame>
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <ChevronLeft size={16} className="text-slate-400" />
        <div className="flex-1 min-w-0">
          <div className="text-white text-[12px] font-bold truncate">
            Speaking Room - Intermediate
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400 text-[9px]">18 online</span>
            <div className="flex -space-x-1 rtl:space-x-reverse ms-1">
              {["O", "S", "J"].map((n, i) => (
                <Avatar
                  key={i}
                  name={n}
                  size={14}
                  from={["from-purple-500", "from-pink-500", "from-blue-500"][i]}
                />
              ))}
            </div>
          </div>
        </div>
        <MoreHorizontal size={14} className="text-slate-400" />
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between mb-2 gap-1">
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-bold flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-400" />
          EN English Only
        </span>
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.6)]">
          <Mic size={12} className="text-white" />
        </div>
        <button className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-amber-300 text-[9px] font-bold">
          <Hand size={10} /> رفع اليد
          <span className="bg-amber-400 text-slate-900 rounded-full w-3.5 h-3.5 text-[8px] flex items-center justify-center">
            3
          </span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto pe-0.5">
        {/* Omar */}
        <div className="flex items-start gap-1.5">
          <Avatar name="O" size={22} from="from-blue-500" to="to-indigo-600" />
          <div className="flex-1">
            <div className="text-blue-300 text-[9px] font-bold">Omar</div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-800/80 border border-white/5 px-2.5 py-1.5 text-white text-[10px]">
              Hi everyone! 👋
              <br />
              How was your weekend?
            </div>
            <div className="flex items-center gap-1 text-[8px] text-slate-500 mt-0.5">
              10:20 AM
              <span className="ms-auto flex items-center gap-0.5 text-rose-400">
                <Heart size={9} fill="currentColor" /> 2
              </span>
            </div>
          </div>
        </div>

        {/* Sara */}
        <div className="flex items-start gap-1.5">
          <Avatar name="S" size={22} from="from-pink-500" to="to-rose-600" />
          <div className="flex-1">
            <div className="text-pink-300 text-[9px] font-bold">Sara</div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-800/80 border border-white/5 px-2.5 py-1.5 text-white text-[10px]">
              It was great! I went hiking with my friends 😊
            </div>
            <div className="flex items-center gap-1 text-[8px] text-slate-500 mt-0.5">
              10:21 AM
              <span className="ms-auto flex items-center gap-0.5 text-rose-400">
                <Heart size={9} fill="currentColor" /> 1
              </span>
            </div>
          </div>
        </div>

        {/* You voice */}
        <div className="flex justify-end">
          <div className="max-w-[80%]">
            <div className="text-right text-[9px] text-purple-300 font-bold">You</div>
            <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-purple-600 to-blue-600 px-2.5 py-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
                <Play size={10} className="text-white ms-0.5" />
              </div>
              <Bars />
              <span className="text-white text-[9px] font-mono">0:18</span>
            </div>
            <div className="text-[8px] text-slate-500 mt-0.5 text-right">
              10:22 AM ✓✓
            </div>
          </div>
        </div>

        {/* James file */}
        <div className="flex items-start gap-1.5">
          <Avatar name="J" size={22} from="from-emerald-500" to="to-teal-600" />
          <div className="flex-1">
            <div className="text-emerald-300 text-[9px] font-bold">James</div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-800/80 border border-white/5 px-2.5 py-2 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
                <FileText size={13} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-[10px] font-semibold truncate">
                  Useful Phrases.pdf
                </div>
                <div className="text-slate-400 text-[8px]">1.2 MB</div>
              </div>
              <Download size={11} className="text-slate-400" />
            </div>
            <div className="text-[8px] text-slate-500 mt-0.5">10:23 AM</div>
          </div>
        </div>

        {/* Lina image */}
        <div className="flex items-start gap-1.5">
          <Avatar name="L" size={22} from="from-amber-500" to="to-orange-600" />
          <div className="flex-1">
            <div className="text-amber-300 text-[9px] font-bold">Lina</div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-800/80 border border-white/5 overflow-hidden">
              <div className="h-16 bg-gradient-to-br from-amber-700 via-orange-700 to-rose-800 relative">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_60%,#fff_1px,transparent_1px),radial-gradient(circle_at_70%_30%,#fff_1px,transparent_1px)] bg-[length:14px_14px]" />
              </div>
              <div className="px-2.5 py-1.5 text-white text-[10px]">
                Let's talk about this picture! ☕
              </div>
            </div>
            <div className="flex items-center gap-1 text-[8px] text-slate-500 mt-0.5">
              10:28 AM
              <span className="ms-auto flex items-center gap-0.5 text-rose-400">
                <Heart size={9} fill="currentColor" /> 3
              </span>
            </div>
          </div>
        </div>

        {/* System */}
        <div className="rounded-xl bg-amber-400/10 border border-amber-400/30 px-2.5 py-1.5">
          <div className="text-amber-300 text-[9px] font-bold">System</div>
          <div className="text-amber-100 text-[10px]">
            Please try to use English only 😊
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 mt-2">
        {[
          { l: "Topic", c: "bg-purple-500/20 text-purple-300", I: Sparkles },
          { l: "Ice Breaker", c: "bg-blue-500/20 text-blue-300", I: Lightbulb },
          { l: "Rotate", c: "bg-emerald-500/20 text-emerald-300", I: RefreshCw },
          { l: "Image Talk", c: "bg-orange-500/20 text-orange-300", I: ImageIcon },
        ].map((b) => {
          const Icon = b.I;
          return (
            <div
              key={b.l}
              className={`flex-1 rounded-lg ${b.c} flex flex-col items-center justify-center py-1.5 gap-0.5`}
            >
              <Icon size={11} />
              <span className="text-[8px] font-semibold">{b.l}</span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="mt-2 flex items-center gap-1.5 rounded-full bg-slate-900 border border-white/10 px-2 py-1.5">
        <Smile size={12} className="text-slate-400" />
        <input
          placeholder="Type a message..."
          readOnly
          className="flex-1 bg-transparent text-[10px] text-slate-300 placeholder:text-slate-500 outline-none"
        />
        <Paperclip size={12} className="text-slate-400" />
        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
          <Send size={10} className="text-white" />
        </div>
      </div>

      {/* Floating mic */}
      <div className="flex flex-col items-center mt-1.5">
        <Bars count={18} color="bg-purple-400/40" />
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center -mt-2 shadow-[0_0_24px_rgba(124,58,237,0.7)]">
          <Mic size={18} className="text-white" />
        </div>
        <div className="text-[9px] text-slate-400 mt-0.5">Tap to speak</div>
      </div>
    </Frame>
  );
}

/* ──────────────────────────── Bottom Small Screens ──────────────────────────── */

function VoiceOnlyScreen() {
  return (
    <Frame size="sm">
      <div className="flex items-center justify-between mb-2">
        <ChevronLeft size={14} className="text-slate-400" />
        <div className="text-white text-[11px] font-bold">Voice Only Room</div>
        <span className="text-[8px] text-slate-400">10 online</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 -m-3 rounded-full bg-blue-500/30 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.7)]">
            <Mic size={32} className="text-white" />
          </div>
        </div>
        <div className="mt-3 text-white text-[11px] font-bold">You are Live</div>
        <div className="text-emerald-300 text-[10px] font-mono mt-0.5">00:45</div>
      </div>
      <div className="text-slate-400 text-[9px] mb-1">Listeners</div>
      <div className="flex -space-x-1.5 rtl:space-x-reverse mb-2">
        {["S", "O", "J", "L", "N"].map((n, i) => (
          <Avatar
            key={i}
            name={n}
            size={20}
            from={["from-pink-500", "from-blue-500", "from-emerald-500", "from-amber-500", "from-purple-500"][i]}
          />
        ))}
        <span className="ms-2 ps-2 text-slate-400 text-[9px] font-bold">+4</span>
      </div>
      <div className="flex gap-1">
        <button className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-[9px] font-semibold flex items-center justify-center gap-1">
          <Hand size={10} /> Raise Hand
        </button>
        <button className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-[9px] font-semibold flex items-center justify-center gap-1">
          <MessageCircle size={10} /> Message
        </button>
        <button className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-[9px] font-semibold">
          Leave
        </button>
      </div>
    </Frame>
  );
}

function TopicGenScreen() {
  const tabs = ["All", "Travel", "Daily Life", "Study", "Work"];
  const topics = [
    "Describe a place you visited recently",
    "What are your goals for the next year?",
    "Do you prefer working in a team or alone?",
    "What skill would you like to learn and why?",
    "Talk about your favorite movie and why you like it.",
  ];
  return (
    <Frame size="sm">
      <div className="flex items-center justify-between mb-2">
        <ChevronLeft size={14} className="text-slate-400" />
        <div className="text-white text-[11px] font-bold">Topic Generator</div>
        <Sparkles size={12} className="text-purple-400" />
      </div>
      <div className="flex gap-1 mb-2 overflow-x-auto">
        {tabs.map((t, i) => (
          <span
            key={t}
            className={`px-2 py-0.5 rounded-full text-[8px] font-bold whitespace-nowrap ${
              i === 0
                ? "bg-purple-500 text-white"
                : "bg-white/5 text-slate-400 border border-white/10"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {topics.map((t) => (
          <div
            key={t}
            className="rounded-lg bg-white/[0.04] border border-white/10 p-2 flex items-start gap-1.5"
          >
            <Sparkles size={10} className="text-amber-300 mt-0.5 shrink-0" />
            <p className="text-slate-200 text-[9px] leading-snug">{t}</p>
          </div>
        ))}
      </div>
      <button className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] font-bold">
        ✨ Surprise me
      </button>
    </Frame>
  );
}

function ProfileScreen() {
  return (
    <Frame size="sm">
      <div className="flex items-center justify-between mb-2">
        <ChevronLeft size={14} className="text-slate-400" />
        <div className="text-white text-[11px] font-bold">Profile</div>
        <Edit3 size={12} className="text-slate-400" />
      </div>
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold border-2 border-white/20">
          O
        </div>
        <div className="text-white text-[12px] font-bold mt-1.5">Omar</div>
        <span className="px-2 py-0.5 mt-1 rounded-full bg-blue-500/20 text-blue-300 text-[8px] font-semibold">
          Intermediate
        </span>
      </div>
      <div className="mt-3 text-center">
        <div className="text-slate-400 text-[9px]">Level 12</div>
        <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-[62%] bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
        </div>
        <div className="text-slate-500 text-[8px] mt-0.5">750 / 1200 XP</div>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2.5">
        {[
          { l: "Messages", v: "320" },
          { l: "Voice Time", v: "85 min" },
          { l: "Rooms Joined", v: "24" },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-lg bg-white/[0.04] border border-white/10 p-1.5 text-center"
          >
            <div className="text-white text-[10px] font-bold">{s.v}</div>
            <div className="text-slate-400 text-[7px]">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 space-y-0.5">
        {[
          { I: Trophy, l: "Achievements" },
          { I: BarChart3, l: "Statistics" },
          { I: Award, l: "Badges" },
          { I: SettingsIcon, l: "Account Settings" },
        ].map((m) => {
          const Icon = m.I;
          return (
            <div
              key={m.l}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <Icon size={11} className="text-slate-400" />
              <span className="text-slate-200 text-[10px] flex-1">{m.l}</span>
              <ChevronRight size={11} className="text-slate-500" />
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

function LeaderboardScreen() {
  const rows = [
    { n: "Omar", xp: 850, c: "from-amber-400 to-amber-600" },
    { n: "Sara", xp: 720, c: "from-slate-300 to-slate-500" },
    { n: "James", xp: 610, c: "from-orange-500 to-amber-700" },
    { n: "Lina", xp: 540, c: "from-purple-500 to-indigo-600" },
    { n: "Noah", xp: 430, c: "from-blue-500 to-indigo-600" },
  ];
  return (
    <Frame size="sm">
      <div className="flex items-center justify-between mb-2">
        <ChevronLeft size={14} className="text-slate-400" />
        <div className="text-white text-[11px] font-bold">Leaderboard</div>
        <span className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[8px] flex items-center gap-0.5">
          This Week <ChevronDown size={8} />
        </span>
      </div>
      <div className="flex-1 space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={r.n}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10"
          >
            <div
              className={`w-6 h-6 rounded-full bg-gradient-to-br ${r.c} flex items-center justify-center text-white text-[10px] font-bold`}
            >
              {i + 1}
            </div>
            <Avatar name={r.n} size={18} />
            <span className="text-white text-[10px] font-semibold flex-1">
              {r.n}
            </span>
            <span className="text-amber-300 text-[10px] font-mono font-bold">
              {r.xp} XP
            </span>
          </div>
        ))}
      </div>
      <button className="mt-2 w-full py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[9px] font-semibold">
        View full leaderboard
      </button>
    </Frame>
  );
}

function SettingsScreen() {
  return (
    <Frame size="sm">
      <div className="flex items-center justify-between mb-2">
        <ChevronLeft size={14} className="text-slate-400" />
        <div className="text-white text-[11px] font-bold">Settings</div>
        <span />
      </div>
      <div className="text-slate-400 text-[8px] font-bold mb-1">Preferences</div>
      <div className="space-y-1 mb-2">
        {[
          { l: "English Only Mode", t: true },
          { l: "Notifications", t: false },
          { l: "Dark Mode", t: true },
          { l: "Language", val: "English" },
        ].map((p) => (
          <div
            key={p.l}
            className="flex items-center px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10"
          >
            <span className="text-slate-200 text-[9px] flex-1">{p.l}</span>
            {"val" in p ? (
              <span className="text-slate-400 text-[9px]">{p.val}</span>
            ) : (
              <div
                className={`w-7 h-4 rounded-full p-0.5 transition ${
                  p.t ? "bg-blue-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition ${
                    p.t ? "translate-x-3" : ""
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-slate-400 text-[8px] font-bold mb-1">Support</div>
      <div className="space-y-1">
        {[
          { I: HelpCircle, l: "Help Center" },
          { I: Mail, l: "Contact Us" },
          { I: Info, l: "About the App" },
        ].map((s) => {
          const Icon = s.I;
          return (
            <div
              key={s.l}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10"
            >
              <Icon size={10} className="text-slate-400" />
              <span className="text-slate-200 text-[9px] flex-1">{s.l}</span>
              <ChevronRight size={10} className="text-slate-500" />
            </div>
          );
        })}
      </div>
      <button className="mt-2 w-full py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-bold flex items-center justify-center gap-1">
        <LogOut size={10} /> Log Out
      </button>
    </Frame>
  );
}

function ToolBarCard() {
  return (
    <Frame size="sm">
      <div dir="rtl" className="flex items-center justify-between mb-3">
        <span />
        <div className="text-white text-[12px] font-bold">شريط الأدوات</div>
        <span />
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {[
          { l: "Topic", c: "from-purple-500 to-purple-600", I: Sparkles },
          { l: "Ice Breaker", c: "from-blue-500 to-blue-600", I: Lightbulb },
          { l: "Rotate", c: "from-emerald-500 to-emerald-600", I: RefreshCw },
          { l: "Image Talk", c: "from-orange-500 to-rose-500", I: ImageIcon },
        ].map((b) => {
          const Icon = b.I;
          return (
            <div
              key={b.l}
              className={`rounded-xl bg-gradient-to-br ${b.c} p-2 flex flex-col items-center gap-1`}
            >
              <Icon size={16} className="text-white" />
              <span className="text-white text-[9px] font-bold">{b.l}</span>
            </div>
          );
        })}
      </div>
      <div className="flex-1 flex flex-col items-center justify-end">
        <Bars count={20} color="bg-blue-400/50" />
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center -mt-2 shadow-[0_0_28px_rgba(59,130,246,0.7)]">
          <Mic size={20} className="text-white" />
        </div>
        <div className="text-[9px] text-slate-400 mt-1">Tap to speak</div>
      </div>
    </Frame>
  );
}

/* ──────────────────────────── Sidebar ──────────────────────────── */

function Sidebar() {
  return (
    <aside className="w-[260px] shrink-0 space-y-3">
      <div>
        <div className="text-[28px] font-bold leading-tight">
          <span className="text-blue-400">LEXO</span>{" "}
          <span className="text-white">Chat</span>
        </div>
        <div className="text-slate-300 text-[12px] font-semibold">
          English Practice Community
        </div>
      </div>

      <p
        dir="rtl"
        className="text-slate-400 text-[11px] leading-relaxed text-right"
      >
        منصة تفاعلية لممارسة اللغة الإنجليزية عبر الشات النصي والصوتي مع متعلمين
        من جميع أنحاء العالم.
      </p>

      <div className="rounded-2xl bg-[rgba(15,23,42,0.68)] backdrop-blur border border-white/10 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div dir="rtl" className="text-white text-[12px] font-bold mb-2 text-right">
          المميزات الرئيسية
        </div>
        <ul dir="rtl" className="space-y-1.5 text-right">
          {[
            { I: MessageCircle, l: "غرف محادثة متعددة", c: "text-blue-400 bg-blue-500/15" },
            { I: Mic, l: "محادثة نصية وصوتية", c: "text-purple-400 bg-purple-500/15" },
            { I: Globe, l: "وضع إنجليزي فقط", c: "text-emerald-400 bg-emerald-500/15" },
            { I: Sparkles, l: "مواضيع تفاعلية", c: "text-amber-400 bg-amber-500/15" },
            { I: Trophy, l: "تحديات ولوحة المتصدرين", c: "text-pink-400 bg-pink-500/15" },
            { I: Users, l: "ملف شخصي متكامل", c: "text-cyan-400 bg-cyan-500/15" },
          ].map((f) => {
            const Icon = f.I;
            return (
              <li key={f.l} className="flex items-center justify-end gap-2">
                <span className="text-slate-300 text-[11px]">{f.l}</span>
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${f.c}`}>
                  <Icon size={11} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl bg-[rgba(15,23,42,0.68)] backdrop-blur border border-white/10 p-3">
        <div dir="rtl" className="text-white text-[12px] font-bold mb-2 text-right">
          مستويات اللغة
        </div>
        <ul className="space-y-1">
          {[
            { c: "A1", l: "Beginner", color: "bg-blue-500" },
            { c: "A2", l: "Elementary", color: "bg-cyan-500" },
            { c: "B1", l: "Intermediate", color: "bg-emerald-500" },
            { c: "B1+", l: "Upper Intermediate", color: "bg-amber-500" },
            { c: "C1", l: "Advanced", color: "bg-purple-500" },
          ].map((lv) => (
            <li
              key={lv.c}
              className="flex items-center gap-2 text-slate-300 text-[11px]"
            >
              <span
                className={`w-7 h-6 rounded-md ${lv.color} text-white text-[10px] font-bold flex items-center justify-center`}
              >
                {lv.c}
              </span>
              {lv.l}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-[rgba(15,23,42,0.68)] backdrop-blur border border-white/10 p-3">
        <div dir="rtl" className="text-white text-[12px] font-bold mb-2 text-right">
          باقاتنا التدريبية
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-2 mb-2">
          <div className="text-blue-400 text-[10px] font-bold mb-1">
            LEXO FOR ENGLISH
          </div>
          <ul className="text-slate-300 text-[11px] space-y-0.5">
            <li>A1 → B1</li>
            <li>B1+ → C1</li>
            <li>A1 → C1</li>
          </ul>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-2">
          <div className="text-purple-400 text-[10px] font-bold mb-1">
            LEXO FOR IELTS
          </div>
          <ul className="text-slate-300 text-[11px] space-y-0.5">
            <li>Lexo for Intro</li>
            <li>Lexo for Advanced</li>
            <li>Lexo for All-in-one</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

/* ──────────────────────────── Page ──────────────────────────── */

export default function ChatShowcase() {
  return (
    <div
      dir="ltr"
      className="min-h-screen text-white p-7"
      style={{
        background:
          "radial-gradient(circle at top, #10213a 0%, #07111f 45%, #030712 100%)",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div className="flex gap-6">
        <Sidebar />
        <main className="flex-1 min-w-0 space-y-6">
          {/* Top row: 4 main flow screens */}
          <div className="flex gap-4 items-start overflow-x-auto pb-3">
            <div>
              <StepHeader n={1} title="اختيار الدورة" sub="اختر الباقة المناسبة لمستواك وهدفك" />
              <Screen1 />
            </div>
            <StepArrow />
            <div>
              <StepHeader n={2} title="اختيار الغرفة" sub="اختر النوع الذي تريد الانضمام إليها" />
              <Screen2 />
            </div>
            <StepArrow />
            <div>
              <StepHeader n={3} title="تفاصيل الغرفة" sub="تعرف على الغرفة وقوانينها والمشاركين" />
              <Screen3 />
            </div>
            <StepArrow />
            <div>
              <StepHeader n={4} title="دخول الشات" sub="ابدأ بالمحادثة النصية أو الصوتية" />
              <Screen4 />
            </div>
          </div>

          {/* Bottom row: 6 small screens */}
          <div className="flex flex-wrap gap-4 items-start">
            <VoiceOnlyScreen />
            <TopicGenScreen />
            <ProfileScreen />
            <LeaderboardScreen />
            <SettingsScreen />
            <ToolBarCard />
          </div>
        </main>
      </div>
    </div>
  );
}
