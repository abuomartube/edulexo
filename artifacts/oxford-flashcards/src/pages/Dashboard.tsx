import { Link } from "wouter";
import { BookOpen, GraduationCap, Sparkles, Mail, Phone, ShieldCheck, Clock } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const created = new Date(user.createdAt);
  const memberSince = created.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome */}
        <section className="bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-600 text-white rounded-3xl p-7 sm:p-10 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100/90">My Dashboard</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-xl">
            Pick up where you left off, browse free lessons, or take the level assessment to find your starting point.
          </p>
        </section>

        {/* Quick actions */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            href="/ielts"
            icon={<GraduationCap size={22} />}
            title="LEXO for IELTS"
            description="Band 7+ in 12 weeks with AI-powered practice."
            tone="from-purple-600 to-indigo-700"
          />
          <ActionCard
            href="/english"
            icon={<BookOpen size={22} />}
            title="LEXO for English"
            description="Master Oxford 3000 and build everyday fluency."
            tone="from-blue-600 to-indigo-600"
          />
          <ActionCard
            href="/assessment"
            icon={<Sparkles size={22} />}
            title="Level Assessment"
            description="Find out exactly where to begin — A1 to C2."
            tone="from-emerald-600 to-teal-600"
          />
        </section>

        {/* Profile + Enrollments placeholder */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
            <h2 className="text-lg font-bold mb-4">My enrollments</h2>
            <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-gray-800 p-8 text-center">
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                You haven’t enrolled in a course yet.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  href="/ielts"
                  className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow"
                >
                  Browse LEXO for IELTS
                </Link>
                <Link
                  href="/english"
                  className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                >
                  Browse LEXO for English
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
            <h2 className="text-lg font-bold mb-4">My profile</h2>
            <ul className="space-y-3 text-sm">
              <ProfileRow icon={<Mail size={15} />} label="Email" value={user.email} />
              {user.phone && <ProfileRow icon={<Phone size={15} />} label="Phone" value={user.phone} />}
              <ProfileRow
                icon={<ShieldCheck size={15} />}
                label="Account type"
                value={user.role === "admin" ? "Administrator" : "Student"}
              />
              <ProfileRow icon={<Clock size={15} />} label="Member since" value={memberSince} />
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

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words">{value}</p>
      </div>
    </li>
  );
}
