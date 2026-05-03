import {
  Mic,
  Users,
  Clock,
  Globe,
  Headphones,
  Info,
  ShieldCheck,
  GraduationCap as Course,
  MessageSquare,
  User,
  Check,
} from "lucide-react";
import {
  Header,
  HeroCard,
  Card,
  Avatar,
  PrimaryButton,
  SecondaryButton,
  chatUI,
  type AvatarTone,
} from "@/components/chat-ui";

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

function HeroBadge({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white text-[10.5px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
      {icon}
      {children}
    </span>
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
            active ? { background: chatUI.gradient.purpleSimple } : undefined
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

const PARTICIPANTS: { letter: string; tone: AvatarTone; name: string }[] = [
  { letter: "O", tone: "blue", name: "Omar" },
  { letter: "S", tone: "pink", name: "Sara" },
  { letter: "J", tone: "emerald", name: "James" },
  { letter: "L", tone: "amber", name: "Lina" },
  { letter: "M", tone: "purple", name: "Maya" },
  { letter: "A", tone: "rose", name: "Ahmad" },
  { letter: "K", tone: "indigo", name: "Kenza" },
];

const RULES = [
  "تحدث بالإنجليزية فقط داخل الغرفة",
  "احترم بقية المشاركين ولا تقاطعهم",
  "لا تشارك معلومات شخصية",
  "ممنوع الإعلانات أو الروابط الخارجية",
];

export default function RoomDetailsMockup() {
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
          title="تفاصيل الغرفة"
          subtitle={
            <span className="text-[10px] text-slate-400">
              تعرف على الغرفة قبل الانضمام
            </span>
          }
        />

        {/* SCROLLABLE BODY */}
        <div
          className="relative z-10 flex-1 overflow-y-auto px-4 pt-3 pb-3 space-y-3"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(124,58,237,0.06), transparent 60%)",
          }}
        >
          {/* HERO */}
          <HeroCard
            icon={<Mic size={26} className="text-white" />}
            title="Speaking Room - Intermediate"
            subtitle="غرفة محادثة لتطوير الطلاقة وزيادة الثقة في التحدث"
            badges={
              <>
                <HeroBadge icon={<Users size={11} />}>18 online</HeroBadge>
                <HeroBadge icon={<Globe size={11} />}>English Only</HeroBadge>
                <HeroBadge icon={<Clock size={11} />}>متاحة الآن</HeroBadge>
              </>
            }
          />

          {/* DESCRIPTION */}
          <Card title="عن الغرفة" icon={<Info size={13} />}>
            <p className="text-[12px] text-slate-300 leading-relaxed">
              غرفة مخصصة للمتحدثين بمستوى متوسط. تدرب على المحادثات اليومية، شارك
              تجاربك، واستخدم مولّد المواضيع لكسر الجمود مع الأعضاء الآخرين.
            </p>
          </Card>

          {/* PARTICIPANTS */}
          <Card
            title={
              <span className="flex items-center gap-2">
                المشاركون
                <span className="text-[10px] font-semibold text-emerald-400">
                  18 online
                </span>
              </span>
            }
            icon={<Users size={13} />}
          >
            <div dir="ltr" className="flex items-center -space-x-2">
              {PARTICIPANTS.slice(0, 6).map((p) => (
                <Avatar
                  key={p.letter}
                  letter={p.letter}
                  tone={p.tone}
                  size={32}
                  ring
                />
              ))}
              <div className="w-8 h-8 rounded-full bg-slate-700 ring-2 ring-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-200">
                +12
              </div>
            </div>
            <div
              dir="ltr"
              className="flex items-center gap-3 mt-2 text-[10px] text-slate-400"
            >
              {PARTICIPANTS.slice(0, 4).map((p) => (
                <span key={p.letter}>{p.name}</span>
              ))}
              <span>...</span>
            </div>
          </Card>

          {/* RULES */}
          <Card title="قواعد الغرفة" icon={<ShieldCheck size={13} />}>
            <ul className="space-y-1.5">
              {RULES.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[11.5px] text-slate-300 leading-snug"
                >
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center shrink-0">
                    <Check
                      size={9}
                      strokeWidth={3}
                      className="text-emerald-400"
                    />
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* CTA BAR */}
        <div className="relative z-10 px-4 pt-2.5 pb-2 border-t border-white/5 bg-slate-950/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <SecondaryButton
              size="lg"
              icon={<Headphones size={14} />}
              className="flex-1"
            >
              استمع أولاً
            </SecondaryButton>
            <PrimaryButton
              size="lg"
              icon={<Mic size={14} />}
              className="flex-1"
            >
              انضمام للغرفة
            </PrimaryButton>
          </div>
        </div>

        {/* BOTTOM NAV */}
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
