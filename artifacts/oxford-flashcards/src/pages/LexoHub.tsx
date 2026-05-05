import { Link } from "wouter";
import { ArrowLeft, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";

// Mentor 6-tool grid (Speaking / Writing / Listening / Reading / Lessons /
// Flashcards) intentionally hidden from the UI per phase-2 L6. The Mentor
// backend (api-server routes /api/english-mentor/*, /api/english/*, embed
// pages at /lexo/tools/*?embed=1) and the per-tool iframe page at
// /dashboard/english/:tool remain reachable for internal use, but no UI
// surface in this app links to them. To re-enable, restore the prior
// version of this file from git history (last seen at commit 9c25ef45).

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
            EduLexo · Lexo for English
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isAr ? "لوحة ليكسو للإنجليزي" : "Lexo English Dashboard"}
          </h1>
          <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-xl">
            {isAr
              ? "مساحتك المخصّصة لتعلّم الإنجليزي داخل منصّة EduLexo."
              : "Your dedicated English-learning space inside EduLexo."}
          </p>
        </section>

        <section
          className="mt-8 bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-8 sm:p-10 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow-lg text-center"
          data-testid="section-english-dashboard-placeholder"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Sparkles size={26} />
          </div>
          <h2 className="mt-5 text-xl sm:text-2xl font-extrabold tracking-tight">
            {isAr
              ? "لوحتك للإنجليزي قيد التحضير"
              : "Your English dashboard is being prepared"}
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
            {isAr
              ? "نعمل على تجهيز التجربة الجديدة لطلاب كورس Lexo for English. ستجد هنا قريباً تقدّمك ومهامك اليومية والمزيد."
              : "We're getting your new Lexo for English experience ready. You'll find your progress, daily tasks, and more here soon."}
          </p>
        </section>
      </main>
    </div>
  );
}
