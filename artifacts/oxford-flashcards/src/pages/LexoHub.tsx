import { Link } from "wouter";
import {
  Mic,
  PenLine,
  Headphones,
  BookOpen,
  Video,
  Layers,
  ArrowLeft,
} from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";

type Tool = {
  slug: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: React.ReactNode;
  tone: string;
};

const TOOLS: Tool[] = [
  {
    slug: "speaking",
    titleEn: "Speaking",
    titleAr: "التحدث",
    descEn: "Practice conversation with the Churchill mentor.",
    descAr: "تدرّب على المحادثة مع مرشد تشرشل.",
    icon: <Mic size={22} />,
    tone: "from-rose-500 to-pink-600",
  },
  {
    slug: "writing",
    titleEn: "Writing",
    titleAr: "الكتابة",
    descEn: "Sharpen your writing with the Orwell mentor.",
    descAr: "طوّر كتابتك مع مرشد أورويل.",
    icon: <PenLine size={22} />,
    tone: "from-amber-500 to-orange-600",
  },
  {
    slug: "listening",
    titleEn: "Listening",
    titleAr: "الاستماع",
    descEn: "Train your ear with the Attenborough mentor.",
    descAr: "درّب أذنك مع مرشد أتينبره.",
    icon: <Headphones size={22} />,
    tone: "from-sky-500 to-blue-600",
  },
  {
    slug: "reading",
    titleEn: "Reading",
    titleAr: "القراءة",
    descEn: "Read with guidance from the Hemingway mentor.",
    descAr: "اقرأ بإرشاد من مرشد هيمنغواي.",
    icon: <BookOpen size={22} />,
    tone: "from-emerald-500 to-teal-600",
  },
  {
    slug: "lessons",
    titleEn: "Video Lessons",
    titleAr: "دروس الفيديو",
    descEn: "Watch structured video lessons.",
    descAr: "شاهد دروس فيديو منظّمة.",
    icon: <Video size={22} />,
    tone: "from-violet-500 to-purple-600",
  },
  {
    slug: "flashcards",
    titleEn: "Flashcards",
    titleAr: "البطاقات",
    descEn: "Review vocabulary with smart flashcards.",
    descAr: "راجع المفردات ببطاقات ذكية.",
    icon: <Layers size={22} />,
    tone: "from-indigo-600 to-blue-700",
  },
];

export default function LexoHub() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 mb-6"
          data-testid="link-back-dashboard"
        >
          <ArrowLeft size={16} className={isAr ? "rotate-180" : ""} />
          {isAr ? "العودة إلى لوحة التحكم" : "Back to dashboard"}
        </Link>

        <section className="bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-600 text-white rounded-3xl p-7 sm:p-10 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100/90">
            EduLexo · Lexo
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isAr ? "أدوات ليكسو" : "Lexo Tools"}
          </h1>
          <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-xl">
            {isAr
              ? "تدرّب على المهارات الأربع، شاهد الدروس، وراجع المفردات — كل ذلك من داخل منصّتك."
              : "Practice the four skills, watch lessons, and review vocabulary — all inside your platform."}
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={`/dashboard/english/${tool.slug}`}
              data-testid={`card-lexo-tool-${tool.slug}`}
              className="group bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow hover:shadow-lg transition flex items-start gap-4"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.tone} text-white flex items-center justify-center shadow-md shrink-0`}
              >
                {tool.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition">
                  {isAr ? tool.titleAr : tool.titleEn}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr ? tool.descAr : tool.descEn}
                </p>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
