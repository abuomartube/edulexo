import { Link } from "wouter";
import { BookOpen, GraduationCap, Sparkles, Mail, Phone, ShieldCheck, Clock } from "lucide-react";
import Header from "@/components/Header";
import MyCourses from "@/components/MyCourses";
import UnverifiedEmailBanner from "@/components/UnverifiedEmailBanner";
import { useAuth } from "@/lib/auth-context";
import { useT, useLanguage } from "@/lib/i18n";

export default function Dashboard() {
  const { user } = useAuth();
  const t = useT();
  const { lang } = useLanguage();
  if (!user) return null;

  const created = new Date(user.createdAt);
  const memberSince = created.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome */}
        <section className="bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-600 text-white rounded-3xl p-7 sm:p-10 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100/90">
            {t("dashboard.eyebrow")}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("dashboard.welcome")} {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-xl">
            {t("dashboard.subtitle")}
          </p>
        </section>

        <UnverifiedEmailBanner />

        {/* Quick actions */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            href="/ielts"
            icon={<GraduationCap size={22} />}
            title={t("dashboard.action.ielts.title")}
            description={t("dashboard.action.ielts.desc")}
            tone="from-purple-600 to-indigo-700"
          />
          <ActionCard
            href="/english"
            icon={<BookOpen size={22} />}
            title={t("dashboard.action.english.title")}
            description={t("dashboard.action.english.desc")}
            tone="from-blue-600 to-indigo-600"
          />
          <ActionCard
            href="/assessment"
            icon={<Sparkles size={22} />}
            title={t("dashboard.action.assessment.title")}
            description={t("dashboard.action.assessment.desc")}
            tone="from-emerald-600 to-teal-600"
          />
        </section>

        {/* My Courses (real enrollments) + Profile */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MyCourses />
          </div>

          <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
            <h2 className="text-lg font-bold mb-4">{t("dashboard.profile.title")}</h2>
            <ul className="space-y-3 text-sm">
              <ProfileRow icon={<Mail size={15} />} label={t("dashboard.profile.email")} value={user.email} ltr />
              {user.phone && (
                <ProfileRow icon={<Phone size={15} />} label={t("dashboard.profile.phone")} value={user.phone} ltr />
              )}
              <ProfileRow
                icon={<ShieldCheck size={15} />}
                label={t("dashboard.profile.accountType")}
                value={user.role === "admin" ? t("dashboard.profile.admin") : t("dashboard.profile.student")}
              />
              <ProfileRow icon={<Clock size={15} />} label={t("dashboard.profile.memberSince")} value={memberSince} />
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="group block bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow hover:shadow-lg transition"
    >
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition`}>
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
    </Link>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  ltr = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p
          className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words"
          {...(ltr ? { dir: "ltr" } : {})}
        >
          {value}
        </p>
      </div>
    </li>
  );
}
