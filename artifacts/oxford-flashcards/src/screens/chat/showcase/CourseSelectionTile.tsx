import { BookOpen, GraduationCap, Sparkles, ChevronLeft } from "lucide-react";
import { Header, BottomNav, ChatScrollBg, chatUI } from "@/components/chat-ui";

const COURSES = [
  {
    title: "Oxford 3000",
    desc: "أهم 3000 كلمة في الإنجليزية",
    progress: 64,
    accent: "linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #a855f7 100%)",
    icon: <BookOpen size={20} className="text-white" />,
  },
  {
    title: "IELTS Preparation",
    desc: "تحضير شامل لاختبار IELTS",
    progress: 28,
    accent: "linear-gradient(135deg, #f472b6 0%, #ec4899 60%, #be185d 100%)",
    icon: <GraduationCap size={20} className="text-white" />,
  },
  {
    title: "English for Work",
    desc: "العمل والمحادثات المهنية",
    progress: 0,
    accent: "linear-gradient(135deg, #34d399 0%, #10b981 60%, #047857 100%)",
    icon: <Sparkles size={20} className="text-white" />,
  },
];

export function CourseSelectionTile() {
  return (
    <>
      <Header
        title="الدورات"
        subtitle={
          <span className="text-[10px] text-slate-400">
            اختر الدورة التي تريد البدء بها
          </span>
        }
      />
      <ChatScrollBg className="px-4 pt-3 pb-2 space-y-2.5">
        {COURSES.map((c) => (
          <div
            key={c.title}
            className={`${chatUI.radius.card} ${chatUI.surface.card} ${chatUI.spacing.cardPad} relative overflow-hidden`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center ring-1 ring-white/15 shrink-0"
                style={{
                  background: c.accent,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                }}
              >
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-bold text-white truncate">
                  {c.title}
                </div>
                <div className="text-[10.5px] text-slate-400 truncate">
                  {c.desc}
                </div>
              </div>
              <ChevronLeft size={14} className="text-slate-500" />
            </div>
            <div className="mt-2.5">
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.progress}%`, background: c.accent }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[9.5px] text-slate-400">
                <span>التقدّم</span>
                <span className="font-semibold text-slate-200">
                  {c.progress}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </ChatScrollBg>
      <BottomNav active="courses" />
    </>
  );
}
