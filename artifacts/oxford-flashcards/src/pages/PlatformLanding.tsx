import { Link } from "wouter";
import {
  Sparkles,
  ArrowRight,
  Brain,
  Globe2,
  Volume2,
  GraduationCap,
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  Trophy,
  Mic,
  PenLine,
  Headphones,
  BookMarked,
  Star,
} from "lucide-react";
import edulexoLogo from "@/assets/edulexo-logo.png";
import Header from "@/components/Header";

const arabicFont = "'Cairo', 'Amiri', 'Noto Sans Arabic', sans-serif";

const platformFeatures = [
  {
    icon: Brain,
    title: "AI-Powered Practice",
    titleAr: "تدريب بالذكاء الاصطناعي",
    description: "Personal AI coaches for speaking and writing. Instant, detailed feedback.",
    descriptionAr: "مدرّبون بالذكاء الاصطناعي للمحادثة والكتابة، مع ملاحظات فورية ومفصّلة.",
    color: "from-indigo-500 to-purple-600",
  },
  {
    icon: Volume2,
    title: "Native Audio",
    titleAr: "صوت أصلي",
    description: "Hear every word in clear native English — train your ear from day one.",
    descriptionAr: "اسمع كل كلمة بنطق إنجليزي أصلي وواضح، ودرّب أذنك من اليوم الأول.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Globe2,
    title: "Bilingual EN ↔ AR",
    titleAr: "ثنائي اللغة",
    description: "Every lesson, definition, and example available in both English and Arabic.",
    descriptionAr: "كل درس وتعريف ومثال متوفر بالإنجليزية والعربية.",
    color: "from-purple-500 to-pink-600",
  },
  {
    icon: GraduationCap,
    title: "Live Teacher Support",
    titleAr: "دعم من معلّم مباشر",
    description: "Real teachers, not just bots. Get help from Abu Omar and the team.",
    descriptionAr: "معلّمون حقيقيون لا روبوتات فقط — احصل على دعم من أبو عمر والفريق.",
    color: "from-violet-500 to-indigo-600",
  },
  {
    icon: TrendingUp,
    title: "Track Your Progress",
    titleAr: "تابع تقدمك",
    description: "Daily streaks, XP, weak-word decks, and clear path from A1 to C1 mastery.",
    descriptionAr: "سلاسل يومية، نقاط خبرة، كلمات الضعف، ومسار واضح من A1 إلى الإتقان C1.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: ClipboardCheck,
    title: "Built for Real Exams",
    titleAr: "مصمم للامتحانات الحقيقية",
    description: "Mock tests, exam-style questions, and grading that mirror the real IELTS.",
    descriptionAr: "اختبارات تجريبية وأسئلة على نمط الامتحان وتصحيح مطابق للأيلتس الحقيقي.",
    color: "from-amber-500 to-orange-600",
  },
];

type CourseHighlight = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  text: string;
};

const englishHighlights: CourseHighlight[] = [
  { icon: BookOpen, text: "2,988 Oxford 3000 words" },
  { icon: Volume2, text: "Native British audio" },
  { icon: Mic, text: "AI Speaking practice" },
  { icon: Trophy, text: "From A1 to C1" },
];

const ieltsHighlights: CourseHighlight[] = [
  { icon: Brain, text: "Churchill AI Speaking coach" },
  { icon: PenLine, text: "Orwell AI essay checker" },
  { icon: Headphones, text: "Listening + Reading tests" },
  { icon: ClipboardCheck, text: "Full IELTS Mock Tests" },
];

export default function PlatformLanding() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-50 dark:opacity-30">
          <div className="absolute -top-32 -left-20 w-[520px] h-[520px] bg-indigo-300 dark:bg-indigo-700 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-[520px] h-[520px] bg-blue-300 dark:bg-blue-700 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] bg-purple-200 dark:bg-purple-800 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 sm:pb-12 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} />
            Powered by AI
          </span>

          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            <span className="text-slate-900 dark:text-white">Two powerful courses.</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              One smart platform.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Whether you're starting your journey from your first English words or aiming for an IELTS band 8 — Abu Omar EduLexo gives you AI-powered practice, native audio, bilingual support, and a real teacher beside you.
          </p>

          <p
            dir="rtl"
            lang="ar"
            style={{ fontFamily: arabicFont }}
            className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-loose"
          >
            سواء كنت تبدأ من أولى كلماتك في الإنجليزية أو تسعى لدرجة 8 في الأيلتس — منصة أبو عمر إيدوليكسو توفر لك تدريباً بالذكاء الاصطناعي، وصوتاً أصلياً، ودعماً ثنائي اللغة، ومعلماً حقيقياً بجانبك.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white font-bold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-95 transition"
            >
              Explore Courses
              <ArrowRight size={18} />
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:scale-[1.03] active:scale-95 transition shadow-sm"
            >
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* PRODUCTS — TWO COURSE CARDS */}
      <section id="products" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 scroll-mt-20">
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            Our Courses
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Choose the right path for you
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Two complete courses, both built with the same AI-powered platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* LEXO FOR ENGLISH CARD */}
          <div className="group relative rounded-3xl overflow-hidden border-2 border-violet-200/60 dark:border-violet-800/60 bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950/40 dark:via-slate-900 dark:to-purple-950/40 shadow-md hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500" />
            <div className="p-7 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                    Course One
                  </p>
                  <h4 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    LEXO for English
                  </h4>
                  <p
                    dir="rtl"
                    lang="ar"
                    style={{ fontFamily: arabicFont }}
                    className="text-sm text-slate-500 dark:text-slate-400 mt-1"
                  >
                    ليكسو لتعلّم الإنجليزية
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shrink-0">
                  <BookOpen size={28} />
                </div>
              </div>

              <p className="mt-5 text-slate-700 dark:text-slate-300 leading-relaxed">
                Master everyday English from the ground up — built on the Oxford 3000 wordlist with native British audio, bilingual translations, and progressive packages from A1 to C1.
              </p>
              <p
                dir="rtl"
                lang="ar"
                style={{ fontFamily: arabicFont }}
                className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-loose"
              >
                أتقن الإنجليزية اليومية من الصفر — مبني على قائمة أكسفورد 3000 بصوت بريطاني أصلي وترجمات ثنائية اللغة وباقات متدرجة من A1 إلى C1.
              </p>

              <ul className="mt-5 space-y-2.5">
                {englishHighlights.map((h) => (
                  <li key={h.text} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                      <h.icon size={15} />
                    </span>
                    <span className="font-medium">{h.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/english"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-semibold shadow hover:shadow-lg hover:scale-[1.03] active:scale-95 transition"
                >
                  View Details
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/english"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/40 hover:scale-[1.03] active:scale-95 transition"
                >
                  Enroll Now
                </Link>
              </div>
            </div>
          </div>

          {/* LEXO FOR IELTS CARD */}
          <div className="group relative rounded-3xl overflow-hidden border-2 border-emerald-200/60 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/40 shadow-md hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600" />
            <div className="absolute top-5 right-5 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                <Star size={10} />
                Most Advanced
              </span>
            </div>
            <div className="p-7 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Course Two
                  </p>
                  <h4 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    LEXO for IELTS
                  </h4>
                  <p
                    dir="rtl"
                    lang="ar"
                    style={{ fontFamily: arabicFont }}
                    className="text-sm text-slate-500 dark:text-slate-400 mt-1"
                  >
                    ليكسو للأيلتس
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shrink-0">
                  <Trophy size={28} />
                </div>
              </div>

              <p className="mt-5 text-slate-700 dark:text-slate-300 leading-relaxed">
                Your AI-powered companion for IELTS success. Master vocabulary, ace your speaking and writing with Churchill & Orwell AI, and prepare with full mock tests for Listening and Reading.
              </p>
              <p
                dir="rtl"
                lang="ar"
                style={{ fontFamily: arabicFont }}
                className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-loose"
              >
                رفيقك الذكي للنجاح في الأيلتس. أتقن المفردات، طوّر مهارات المحادثة والكتابة مع تشرشل وأورويل AI، واستعد باختبارات تجريبية كاملة للاستماع والقراءة.
              </p>

              <ul className="mt-5 space-y-2.5">
                {ieltsHighlights.map((h) => (
                  <li key={h.text} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <h.icon size={15} />
                    </span>
                    <span className="font-medium">{h.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/ielts"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold shadow hover:shadow-lg hover:scale-[1.03] active:scale-95 transition"
                >
                  View Details
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/ielts"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:scale-[1.03] active:scale-95 transition"
                >
                  Enroll Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 scroll-mt-20">
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
            Why EduLexo
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            What makes our platform different
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Real AI tools, real native audio, real bilingual support — all wrapped in a clear path from beginner to fluent.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {platformFeatures.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform mb-4`}>
                <f.icon size={22} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                {f.title}
              </h4>
              <p
                dir="rtl"
                lang="ar"
                style={{ fontFamily: arabicFont }}
                className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5"
              >
                {f.titleAr}
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.description}
              </p>
              <p
                dir="rtl"
                lang="ar"
                style={{ fontFamily: arabicFont }}
                className="mt-2 text-xs text-slate-500 dark:text-slate-500 leading-loose"
              >
                {f.descriptionAr}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-blue-700 p-8 sm:p-12 text-center shadow-2xl">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to start your journey?
            </h3>
            <p className="mt-3 text-white/90 max-w-xl mx-auto">
              Pick the course that fits your goals. Both come with the full power of EduLexo.
            </p>
            <p
              dir="rtl"
              lang="ar"
              style={{ fontFamily: arabicFont }}
              className="mt-1 text-white/80 max-w-xl mx-auto text-sm"
            >
              اختر الدورة التي تناسب أهدافك. كلتاهما بكامل قدرات منصة إيدوليكسو.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/english"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-indigo-700 font-bold shadow-xl hover:scale-105 active:scale-95 transition"
              >
                <BookOpen size={18} />
                LEXO for English
              </Link>
              <Link
                href="/ielts"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-emerald-700 font-bold shadow-xl hover:scale-105 active:scale-95 transition"
              >
                <Trophy size={18} />
                LEXO for IELTS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-gray-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={edulexoLogo} alt="Abu Omar EduLexo" className="w-9 h-9 object-contain" />
            <div className="leading-tight">
              <p className="text-sm font-bold">
                <span className="text-slate-900 dark:text-white">Abu Omar </span>
                <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                  EduLexo
                </span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-blue-600 dark:text-blue-400">
                Learn · Practice · Achieve
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
            © {new Date().getFullYear()} Abu Omar EduLexo · Powered by AI
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Terms</a>
            <span>·</span>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
