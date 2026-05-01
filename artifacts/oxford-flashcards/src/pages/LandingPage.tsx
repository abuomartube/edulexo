import { Link } from "wouter";
import {
  Moon,
  Sun,
  Sparkles,
  BookOpen,
  Mic,
  PenLine,
  Headphones,
  BookMarked,
  Trophy,
  Video,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Globe2,
  Volume2,
  Layers,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import lexoLogo from "@/assets/lexo-icon.png";

const arabicFont = "'Cairo', 'Amiri', 'Noto Sans Arabic', sans-serif";

type Module = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  gradient: string;
  status: "ready" | "soon";
  href?: string;
};

const modules: Module[] = [
  {
    icon: BookOpen,
    title: "Vocabulary",
    titleAr: "المفردات",
    description: "Oxford 3000 flashcards with native British audio, Arabic translations, and 75 themed Word Families.",
    descriptionAr: "بطاقات أكسفورد 3000 بصوت بريطاني أصلي وترجمات عربية و75 مجموعة كلمات مترابطة.",
    gradient: "from-violet-500 to-purple-700",
    status: "ready",
    href: "/demo",
  },
  {
    icon: Video,
    title: "Lessons",
    titleAr: "الدروس",
    description: "Structured video lessons curated by your teacher, organized by package and level.",
    descriptionAr: "دروس فيديو منظمة من إعداد معلمك، مرتبة حسب الباقة والمستوى.",
    gradient: "from-rose-500 to-pink-600",
    status: "soon",
  },
  {
    icon: Mic,
    title: "Speaking",
    titleAr: "المحادثة",
    description: "Conversation practice with an AI partner — by voice or text. Build fluency at your own pace.",
    descriptionAr: "تدرّب على المحادثة مع مساعد ذكي بالصوت أو بالكتابة، وطوّر طلاقتك بإيقاعك.",
    gradient: "from-amber-400 to-orange-500",
    status: "soon",
  },
  {
    icon: PenLine,
    title: "Writing",
    titleAr: "الكتابة",
    description: "Submit writing homework and receive detailed AI feedback on grammar, structure, and style.",
    descriptionAr: "ارفع واجبات الكتابة واحصل على تقييم تفصيلي للقواعد والبنية والأسلوب.",
    gradient: "from-emerald-500 to-teal-600",
    status: "soon",
  },
  {
    icon: Headphones,
    title: "Listening",
    titleAr: "الاستماع",
    description: "Audio lessons and homework to sharpen your ear for natural English.",
    descriptionAr: "دروس صوتية وواجبات لتطوير الاستماع للإنجليزية الطبيعية.",
    gradient: "from-sky-500 to-blue-600",
    status: "soon",
  },
  {
    icon: BookMarked,
    title: "Reading",
    titleAr: "القراءة",
    description: "Short stories with multiple-choice questions to build comprehension and vocabulary in context.",
    descriptionAr: "قصص قصيرة مع أسئلة اختيار من متعدد لتعزيز الفهم والمفردات في سياقها.",
    gradient: "from-fuchsia-500 to-purple-600",
    status: "soon",
  },
  {
    icon: Trophy,
    title: "Final Test",
    titleAr: "الاختبار النهائي",
    description: "Comprehensive assessment to measure your progress and certify your level.",
    descriptionAr: "تقييم شامل لقياس تقدمك واعتماد مستواك.",
    gradient: "from-yellow-500 to-amber-600",
    status: "soon",
  },
];

const packages = [
  {
    name: "Foundation",
    nameAr: "التأسيس",
    levels: "A1 → B1",
    levelsLabel: "Levels 1 – 3",
    levelsLabelAr: "المستويات 1 - 3",
    description: "From your first words to confident everyday conversation.",
    descriptionAr: "من أولى الكلمات إلى محادثات يومية بثقة.",
    gradient: "from-emerald-400 via-teal-500 to-sky-600",
    icon: GraduationCap,
    badge: null as string | null,
  },
  {
    name: "Mastery",
    nameAr: "الإتقان",
    levels: "A1 → C1",
    levelsLabel: "Levels 1 – 6",
    levelsLabelAr: "المستويات 1 - 6",
    description: "The full journey from first words to confident mastery — every level, every module.",
    descriptionAr: "الرحلة الكاملة من أولى الكلمات إلى الإتقان التام — جميع المستويات وكل الوحدات.",
    gradient: "from-violet-600 via-fuchsia-500 to-orange-500",
    icon: Trophy,
    badge: "BEST VALUE",
  },
  {
    name: "Fluency",
    nameAr: "الطلاقة",
    levels: "B1+ → C1",
    levelsLabel: "Levels 4 – 6",
    levelsLabelAr: "المستويات 4 - 6",
    description: "Polish, precision, and the vocabulary to express any idea.",
    descriptionAr: "إتقان ودقة ومفردات تعبّر بها عن أي فكرة.",
    gradient: "from-violet-500 via-purple-600 to-fuchsia-600",
    icon: Sparkles,
    badge: null as string | null,
  },
];

const highlights = [
  { icon: Volume2,    label: "Native British Audio",   labelAr: "صوت بريطاني أصلي" },
  { icon: Globe2,     label: "Bilingual EN ↔ AR",      labelAr: "ثنائي اللغة" },
  { icon: Layers,     label: "CEFR Aligned",           labelAr: "وفق إطار CEFR" },
  { icon: CheckCircle2, label: "Teacher Approved",     labelAr: "بإشراف معلّم" },
];

export default function LandingPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-orange-50/40 dark:from-gray-950 dark:via-violet-950/40 dark:to-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/70 dark:bg-gray-950/60 border-b border-gray-100/80 dark:border-gray-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src={lexoLogo}
              alt="LEXO"
              className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
            <div className="leading-tight">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                <span className="text-gray-900 dark:text-white">LEXO </span>
                <span className="text-gray-500 dark:text-gray-400 font-semibold">for </span>
                <span className="bg-gradient-to-r from-violet-600 to-purple-700 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">English</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold text-orange-500 dark:text-amber-400 mt-0.5">
                Learn · Practice · Excel
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition"
            >
              <ArrowLeft size={14} />
              Platform
            </Link>
            <Link
              href="/app"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition"
            >
              Log In
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition"
            >
              Enroll Now
            </Link>
            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/60 transition-all hover:scale-110 active:scale-95 shadow-sm"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40 dark:opacity-30">
          <div className="absolute -top-32 -left-20 w-[500px] h-[500px] bg-violet-300 dark:bg-violet-700 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-orange-300 dark:bg-amber-700 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] bg-pink-200 dark:bg-fuchsia-800 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Left column — copy */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={14} />
                EduLexo
              </span>

              <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                <span className="text-gray-900 dark:text-white">Master English</span>
                <br />
                <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-orange-500 dark:from-violet-400 dark:via-purple-400 dark:to-amber-400 bg-clip-text text-transparent">
                  the smart way.
                </span>
              </h2>

              <p className="mt-5 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Your smart journey to learning English — built on the Oxford 3000, with native British audio and AI-powered practice. Video lessons with Abu Omar. Smart interactive exercises. Progress tracking that follows your level. From your first words to complete fluency, all in one place.
              </p>

              <p
                dir="rtl"
                lang="ar"
                style={{ fontFamily: arabicFont }}
                className="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto lg:mr-0 lg:ml-auto leading-loose"
              >
                رحلتك الذكية لتعلّم الإنجليزية — مبنية على مفردات أكسفورد 3000، بصوت بريطاني أصلي، وتدريب بالذكاء الاصطناعي. دروس مرئية مع أبو عمر. تمارين تفاعلية ذكية. متابعة مستوى تقدمك. من أولى الكلمات إلى الطلاقة الكاملة، كل ذلك في مكان واحد.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.03] active:scale-95 transition"
                >
                  Start Learning Free
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:scale-[1.03] active:scale-95 transition shadow-sm"
                >
                  Try the Flashcards
                </Link>
              </div>

              {/* Highlight chips */}
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                {highlights.map((h) => (
                  <span
                    key={h.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    <h.icon size={13} className="text-violet-500 dark:text-violet-400" />
                    {h.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right column — preview card */}
            <div className="lg:col-span-5">
              <div className="relative max-w-md mx-auto">
                <div className="absolute -inset-4 bg-gradient-to-br from-violet-400/30 to-orange-300/30 dark:from-violet-600/30 dark:to-amber-600/30 rounded-3xl blur-2xl" />
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      Today
                    </span>
                  </div>

                  {/* Mock flashcard */}
                  <div className="rounded-2xl bg-gradient-to-br from-violet-100 via-violet-50 to-purple-100 dark:from-violet-900/40 dark:via-violet-900/30 dark:to-purple-900/40 border border-violet-200/70 dark:border-violet-700/40 p-8 text-center shadow-md">
                    <p className="text-4xl font-extrabold tracking-tight text-violet-900 dark:text-violet-100">excellent</p>
                    <p className="mt-2 text-sm italic text-violet-600/80 dark:text-violet-300/80">/ˈek.səl.ənt/</p>
                    <p className="mt-1 text-[11px] uppercase tracking-widest text-violet-500/70 dark:text-violet-300/70">Adjective</p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-violet-800/40 text-violet-700 dark:text-violet-200 text-xs font-semibold border border-violet-200/60 dark:border-violet-700/50">
                      <Volume2 size={12} /> British
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[
                      { label: "A1", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
                      { label: "A2", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
                      { label: "B1", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
                      { label: "B2", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
                    ].map((l) => (
                      <div
                        key={l.label}
                        className={`${l.color} rounded-lg py-2 text-center text-xs font-bold`}
                      >
                        {l.label}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>2,988 Oxford words</span>
                    <span className="font-semibold text-violet-600 dark:text-violet-400">75 families</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-amber-900/30 text-orange-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            Three Programs
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Pick the path for your level
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Three carefully designed packages, one platform.
          </p>
          <p
            dir="rtl"
            lang="ar"
            style={{ fontFamily: arabicFont }}
            className="mt-1 text-sm text-gray-400 dark:text-gray-500"
          >
            ثلاث باقات مصمّمة بعناية على منصة واحدة.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const featured = pkg.badge !== null;
            return (
              <div
                key={pkg.name}
                className={`group relative rounded-3xl overflow-hidden border bg-white dark:bg-gray-900/60 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 ${
                  featured
                    ? "border-violet-300 dark:border-violet-600 md:scale-[1.04] shadow-lg ring-2 ring-violet-200/60 dark:ring-violet-700/40"
                    : "border-gray-100 dark:border-gray-800"
                }`}
              >
                <div className={`h-2 bg-gradient-to-r ${pkg.gradient}`} />
                {featured && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                      <Sparkles size={10} />
                      {pkg.badge}
                    </span>
                  </div>
                )}
                <div className="p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        {pkg.levelsLabel}
                      </p>
                      <h4 className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-white">
                        {pkg.name} Package
                      </h4>
                      <p
                        dir="rtl"
                        lang="ar"
                        style={{ fontFamily: arabicFont }}
                        className="text-sm text-gray-500 dark:text-gray-400 mt-0.5"
                      >
                        باقة {pkg.nameAr}
                      </p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pkg.gradient} flex items-center justify-center text-white shadow-lg shrink-0`}>
                      <pkg.icon size={26} />
                    </div>
                  </div>

                  <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200">
                    CEFR {pkg.levels}
                  </div>

                  <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {pkg.description}
                  </p>
                  <p
                    dir="rtl"
                    lang="ar"
                    style={{ fontFamily: arabicFont }}
                    className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-loose"
                  >
                    {pkg.descriptionAr}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MODULES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-wider">
            What's Inside
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Everything you need, in one place
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Vocabulary, lessons, speaking, writing, listening, reading & assessment.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => {
            const card = (
              <div className="group relative h-full rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <m.icon size={22} />
                  </div>
                  {m.status === "ready" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 size={10} /> Live
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  {m.title}
                </h4>
                <p
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: arabicFont }}
                  className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5"
                >
                  {m.titleAr}
                </p>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {m.description}
                </p>
                <p
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: arabicFont }}
                  className="mt-2 text-xs text-gray-500 dark:text-gray-500 leading-loose"
                >
                  {m.descriptionAr}
                </p>
                {m.status === "ready" && (
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-400 group-hover:gap-2 transition-all">
                    Open <ArrowRight size={14} />
                  </div>
                )}
              </div>
            );
            return m.status === "ready" && m.href ? (
              <Link key={m.title} href={m.href}>{card}</Link>
            ) : (
              <div key={m.title}>{card}</div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-700 to-orange-500 p-8 sm:p-12 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
          <div className="relative">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to start your journey?
            </h3>
            <p className="mt-3 text-white/90 max-w-xl mx-auto">
              Try the Vocabulary module right now — no signup required.
            </p>
            <p
              dir="rtl"
              lang="ar"
              style={{ fontFamily: arabicFont }}
              className="mt-1 text-white/80 max-w-xl mx-auto text-sm"
            >
              جرّب وحدة المفردات الآن دون تسجيل.
            </p>
            <Link
              href="/demo"
              className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-violet-700 font-bold shadow-xl hover:scale-105 active:scale-95 transition"
            >
              Try the Demo
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-gray-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={lexoLogo} alt="LEXO" className="w-7 h-7 object-contain" />
            <span className="text-sm font-bold">
              <span className="text-gray-900 dark:text-white">LEXO </span>
              <span className="bg-gradient-to-r from-violet-600 to-purple-700 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">for English</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
            © {new Date().getFullYear()} LEXO for English · Oxford 3000™ · Native British Audio
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <a href="#" className="hover:text-violet-600 dark:hover:text-violet-400 transition">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:text-violet-600 dark:hover:text-violet-400 transition">Terms</a>
            <span>·</span>
            <a href="#" className="hover:text-violet-600 dark:hover:text-violet-400 transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
