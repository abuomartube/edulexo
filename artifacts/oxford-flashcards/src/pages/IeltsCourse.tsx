import { Link } from "wouter";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Mic,
  PenLine,
  Headphones,
  BookMarked,
  Trophy,
  Brain,
  ClipboardCheck,
  Flame,
  FileText,
  Repeat,
  Target,
  Globe2,
  Layers,
} from "lucide-react";
import edulexoLogo from "@/assets/edulexo-logo.png";
import lexoIeltsLogo from "@/assets/lexo-ielts.png";
import Header from "@/components/Header";

const arabicFont = "'Cairo', 'Amiri', 'Noto Sans Arabic', sans-serif";

type IeltsModule = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  gradient: string;
};

const ieltsModules: IeltsModule[] = [
  {
    icon: BookOpen,
    title: "Vocabulary",
    titleAr: "المفردات",
    description: "2,198 CEFR-corrected IELTS-tuned flashcards with Arabic translations and bilingual examples.",
    descriptionAr: "2,198 بطاقة مفردات مضبوطة على إطار CEFR ومخصصة للأيلتس مع ترجمات عربية وأمثلة ثنائية اللغة.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Mic,
    title: "Churchill AI · Speaking",
    titleAr: "تشرشل AI · المحادثة",
    description: "AI speaking coach with topic banks for IELTS Parts 1, 2 & 3. Practice anytime, get instant feedback.",
    descriptionAr: "مدرّب محادثة بالذكاء الاصطناعي مع بنوك أسئلة لأجزاء الأيلتس 1 و2 و3. تدرّب في أي وقت واحصل على ملاحظات فورية.",
    gradient: "from-rose-500 to-red-600",
  },
  {
    icon: PenLine,
    title: "Orwell AI · Writing",
    titleAr: "أورويل AI · الكتابة",
    description: "Submit IELTS Task 1 & 2 essays — get a detailed band-score evaluation and improvement plan.",
    descriptionAr: "أرسل مقالات الأيلتس Task 1 و2 — واحصل على تقييم تفصيلي لدرجة Band مع خطة تحسين.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: Headphones,
    title: "Listening Test",
    titleAr: "اختبار الاستماع",
    description: "Full IELTS-format listening sections with native audio and auto-grading.",
    descriptionAr: "أقسام استماع كاملة بصيغة الأيلتس بصوت أصلي وتصحيح تلقائي.",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    icon: BookMarked,
    title: "Reading Test",
    titleAr: "اختبار القراءة",
    description: "Authentic-style reading passages with timed practice and detailed answer explanations.",
    descriptionAr: "نصوص قراءة بنمط الامتحان مع تدريب مؤقت وشرح تفصيلي للإجابات.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: Trophy,
    title: "Full Mock Tests",
    titleAr: "اختبارات تجريبية كاملة",
    description: "Sit complete IELTS mock tests under exam conditions, with band-level grading.",
    descriptionAr: "اجلس لاختبارات أيلتس تجريبية كاملة بظروف الامتحان مع تصحيح بمستوى Band.",
    gradient: "from-yellow-500 to-amber-600",
  },
  {
    icon: Brain,
    title: "LEXO AI Chat",
    titleAr: "محادثة LEXO AI",
    description: "Ask anything IELTS-related: grammar, strategy, exam tips. Powered by Claude Sonnet.",
    descriptionAr: "اسأل أي شيء عن الأيلتس: قواعد، استراتيجية، نصائح للامتحان. مدعوم بـ Claude Sonnet.",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    icon: FileText,
    title: "Stories & Exercises",
    titleAr: "قصص وتمارين",
    description: "Reading-comprehension stories with AI-generated exercises to reinforce vocabulary in context.",
    descriptionAr: "قصص للفهم القرائي مع تمارين مولّدة بالذكاء الاصطناعي لتعزيز المفردات في سياقها.",
    gradient: "from-fuchsia-500 to-pink-600",
  },
  {
    icon: Target,
    title: "Spell It Game",
    titleAr: "لعبة التهجئة",
    description: "Timed spelling challenges with text-to-speech to lock in spelling and pronunciation.",
    descriptionAr: "تحديات تهجئة مؤقتة مع تحويل النص إلى كلام لتثبيت التهجئة والنطق.",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    icon: Repeat,
    title: "Spaced Repetition",
    titleAr: "التكرار المتباعد",
    description: "SM-2 algorithm schedules reviews exactly when you're about to forget — proven memory science.",
    descriptionAr: "خوارزمية SM-2 تجدول المراجعة في الوقت الذي توشك فيه على النسيان — علم ذاكرة مُثبت.",
    gradient: "from-teal-500 to-emerald-600",
  },
  {
    icon: Layers,
    title: "Grammar & Phrasal Verbs",
    titleAr: "القواعد والأفعال المركبة",
    description: "Topic-based grammar lessons, synonyms, antonyms, and a deep phrasal-verbs library.",
    descriptionAr: "دروس قواعد منظمة بالمواضيع، مرادفات، أضداد، ومكتبة عميقة للأفعال المركبة.",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    icon: Flame,
    title: "Daily Streaks & Plans",
    titleAr: "السلاسل اليومية والخطط",
    description: "Daily learning plans, XP, streak tracking, and a downloadable bilingual study plan PDF.",
    descriptionAr: "خطط تعلم يومية ونقاط خبرة وسلاسل وملف PDF ثنائي اللغة قابل للتحميل.",
    gradient: "from-orange-500 to-red-600",
  },
];

const valueProps = [
  { icon: ClipboardCheck, label: "2,198 IELTS-tuned words", labelAr: "2,198 كلمة مخصصة للأيلتس" },
  { icon: Brain, label: "AI Speaking + Writing coaches", labelAr: "مدرّبون بالذكاء الاصطناعي" },
  { icon: Trophy, label: "Full Listening + Reading mock tests", labelAr: "اختبارات تجريبية كاملة" },
  { icon: Globe2, label: "Bilingual EN ↔ AR", labelAr: "ثنائي اللغة" },
];

export default function IeltsCourse() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50/40 dark:from-gray-950 dark:via-emerald-950/30 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40 dark:opacity-25">
          <div className="absolute -top-32 -left-20 w-[520px] h-[520px] bg-emerald-300 dark:bg-emerald-700 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-[520px] h-[520px] bg-teal-300 dark:bg-teal-700 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] bg-cyan-200 dark:bg-cyan-800 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 sm:pb-12">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={14} />
                Powered by AI
              </span>

              <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                <span className="text-slate-900 dark:text-white">Your AI companion</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  for IELTS success.
                </span>
              </h2>

              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Master IELTS vocabulary, practice speaking with Churchill AI, get your essays graded by Orwell AI, and sit full mock tests for Listening and Reading — all in one platform.
              </p>

              <p
                dir="rtl"
                lang="ar"
                style={{ fontFamily: arabicFont }}
                className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto lg:mr-0 lg:ml-auto leading-loose"
              >
                أتقن مفردات الأيلتس، تدرّب على المحادثة مع تشرشل AI، احصل على تقييم مقالاتك من أورويل AI، واجلس لاختبارات تجريبية كاملة للاستماع والقراءة — كل ذلك في منصة واحدة.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <a
                  href="#enroll"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.03] active:scale-95 transition"
                >
                  Enroll Now
                  <ArrowRight size={18} />
                </a>
                <a
                  href="#modules"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:scale-[1.03] active:scale-95 transition shadow-sm"
                >
                  See What's Inside
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                {valueProps.map((v) => (
                  <span
                    key={v.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    <v.icon size={13} className="text-emerald-500 dark:text-emerald-400" />
                    {v.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right column — video / preview */}
            <div className="lg:col-span-5">
              <div className="relative max-w-md mx-auto">
                <div className="absolute -inset-4 bg-gradient-to-br from-emerald-400/30 to-teal-300/30 dark:from-emerald-600/30 dark:to-teal-600/30 rounded-3xl blur-2xl" />
                <div className="relative bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-3xl p-3 shadow-xl overflow-hidden">
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a1f1d] via-[#0d2a26] to-[#0a1f1d] border border-emerald-500/20 aspect-square sm:aspect-[4/3] flex items-center justify-center p-5 sm:p-6">
                    <div className="absolute inset-0 opacity-30 pointer-events-none">
                      <div className="absolute -top-16 -left-16 w-56 h-56 bg-emerald-500 rounded-full blur-3xl" />
                      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-teal-500 rounded-full blur-3xl" />
                    </div>
                    <img
                      src={lexoIeltsLogo}
                      alt="LEXO for IELTS — AI-powered IELTS preparation"
                      className="relative w-full h-full object-contain select-none drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                      draggable={false}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">Vocab</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">2,198</p>
                    </div>
                    <div className="rounded-lg bg-teal-50 dark:bg-teal-900/30 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">Tests</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">L · R · M</p>
                    </div>
                    <div className="rounded-lg bg-cyan-50 dark:bg-cyan-900/30 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">AI</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">2 Coaches</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES — WHAT'S INSIDE */}
      <section id="modules" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 scroll-mt-20">
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider">
            What's Inside
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Everything you need to ace IELTS
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Twelve integrated tools, two AI coaches, and full mock-test simulation.
          </p>
          <p
            dir="rtl"
            lang="ar"
            style={{ fontFamily: arabicFont }}
            className="mt-1 text-sm text-slate-400 dark:text-slate-500"
          >
            اثنتا عشرة أداة متكاملة، ومدرّبان بالذكاء الاصطناعي، ومحاكاة كاملة للاختبار التجريبي.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ieltsModules.map((m) => (
            <div
              key={m.title}
              className="group relative rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                  <m.icon size={22} />
                </div>
                <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  Included
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                {m.title}
              </h4>
              <p
                dir="rtl"
                lang="ar"
                style={{ fontFamily: arabicFont }}
                className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5"
              >
                {m.titleAr}
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {m.description}
              </p>
              <p
                dir="rtl"
                lang="ar"
                style={{ fontFamily: arabicFont }}
                className="mt-2 text-xs text-slate-500 dark:text-slate-500 leading-loose"
              >
                {m.descriptionAr}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ENROLL CTA */}
      <section id="enroll" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20 scroll-mt-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 p-8 sm:p-12 text-center shadow-2xl">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider">
              <Trophy size={14} />
              Enroll in LEXO for IELTS
            </span>
            <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Start your path to your target band
            </h3>
            <p className="mt-3 text-white/90 max-w-xl mx-auto">
              Sign up, choose your payment plan, and get instant access to the full IELTS course.
            </p>
            <p
              dir="rtl"
              lang="ar"
              style={{ fontFamily: arabicFont }}
              className="mt-1 text-white/80 max-w-xl mx-auto text-sm"
            >
              سجّل، اختر طريقة الدفع المناسبة، واحصل على وصول فوري لكامل دورة الأيلتس.
            </p>

            {/* Payment options preview */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {["Tabby", "Tamara", "Visa / Stripe", "Bank Transfer"].map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm"
                >
                  <CheckCircle2 size={12} />
                  {p}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup?course=ielts"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-emerald-700 font-bold shadow-xl hover:scale-105 active:scale-95 transition"
              >
                <Sparkles size={18} />
                Enroll Now
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white/10 text-white font-semibold border border-white/30 hover:bg-white/20 hover:scale-105 active:scale-95 transition"
              >
                <ArrowLeft size={16} />
                Back to Platform
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/70">
              Payment processing launches soon — sign up now to be the first to enroll.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-gray-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <img src={edulexoLogo} alt="Abu Omar EduLexo" className="w-9 h-9 object-contain" />
            <div className="leading-tight">
              <p className="text-sm font-bold">
                <span className="text-slate-900 dark:text-white">Abu Omar </span>
                <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                  EduLexo
                </span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-emerald-600 dark:text-emerald-400">
                LEXO for IELTS
              </p>
            </div>
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
            © {new Date().getFullYear()} Abu Omar EduLexo · Powered by AI
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Terms</a>
            <span>·</span>
            <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
