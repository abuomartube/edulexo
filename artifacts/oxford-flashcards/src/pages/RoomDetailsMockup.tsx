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
  PhoneFrame,
  PageBackdrop,
} from "@/components/chat-ui";
import { useLocation, useRoute } from "wouter";
import { getRoomById, MOCK_ROOMS } from "@/lib/chatMock";

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
  const [, params] = useRoute("/room-details/:id");
  const [, setLocation] = useLocation();
  const room = getRoomById(params?.id) ?? MOCK_ROOMS[1];

  return (
    <PageBackdrop>
      <PhoneFrame>
        <Header
          title="تفاصيل الغرفة"
          subtitle={
            <span className="text-[10px] text-slate-400">
              تعرف على الغرفة قبل الانضمام
            </span>
          }
          onBack={() => setLocation("/room-selection")}
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
            title={room.title}
            subtitle={room.desc}
            badges={
              <>
                <HeroBadge icon={<Users size={11} />}>{room.online} online</HeroBadge>
                <HeroBadge icon={<Globe size={11} />}>English Only</HeroBadge>
                <HeroBadge icon={<Clock size={11} />}>متاحة الآن</HeroBadge>
              </>
            }
          />

          {/* DESCRIPTION */}
          <Card title="عن الغرفة" icon={<Info size={13} />}>
            <p className="text-[12px] text-slate-300 leading-relaxed">
              {room.about}
            </p>
          </Card>

          {/* PARTICIPANTS */}
          <Card
            title={
              <span className="flex items-center gap-2">
                المشاركون
                <span className="text-[10px] font-semibold text-emerald-400">
                  {room.online} online
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
                +{Math.max(0, room.online - 6)}
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
              onClick={() => setLocation(`/chat-screen/${room.id}`)}
            >
              استمع أولاً
            </SecondaryButton>
            <PrimaryButton
              size="lg"
              icon={<Mic size={14} />}
              className="flex-1"
              onClick={() => setLocation(`/chat-screen/${room.id}`)}
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
    </PageBackdrop>
  );
}
