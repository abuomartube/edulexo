import { Link } from "wouter";
import { useT, useLanguage } from "@/lib/i18n";
import {
  BookOpen,
  Headphones,
  MessageCircle,
  PenTool,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Crown,
} from "lucide-react";

const PACKAGE_CARDS = [
  {
    titleKey: "tier_beginner",
    descKey: "tier_beginner_desc",
    letter: "A1",
    gradient: "from-emerald-400 to-teal-500",
    glow: "rgba(16,185,129,0.45)",
    path: "/package/a1-b1",
    premium: false,
  },
  {
    titleKey: "tier_intermediate",
    descKey: "tier_intermediate_desc",
    letter: "B1+",
    gradient: "from-cyan-400 to-blue-500",
    glow: "rgba(56,189,248,0.45)",
    path: "/package/b1-c1",
    premium: false,
  },
  {
    titleKey: "tier_advanced",
    descKey: "pkg_complete_title",
    letter: "★",
    gradient: "from-purple-500 via-fuchsia-500 to-amber-400",
    glow: "rgba(168,85,247,0.55)",
    path: "/package/full",
    premium: true,
  },
] as const;

export default function Landing() {
  const t = useT();
  const { lang } = useLanguage();
  const features = [
    { key: "feat_lessons", icon: BookOpen },
    { key: "feat_vocab", icon: Sparkles },
    { key: "feat_speaking", icon: MessageCircle },
    { key: "feat_writing", icon: PenTool },
    { key: "feat_listening", icon: Headphones },
    { key: "feat_assessments", icon: GraduationCap },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <section className="relative overflow-hidden bg-gradient-to-b from-sidebar to-[hsl(232,55%,22%)] text-sidebar-foreground">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              {t("landing_eyebrow")}
            </span>
            <h1
              className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight"
              data-testid="text-landing-title"
            >
              {t("landing_title")}
            </h1>
            <p className="mt-5 text-lg md:text-xl opacity-85">
              {t("landing_subtitle")}
            </p>
          </div>
        </div>
      </section>

      <section
        className="py-16"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {PACKAGE_CARDS.map((pkg) => (
              <Link
                key={pkg.path}
                href={pkg.path}
                className={`group relative overflow-hidden rounded-3xl backdrop-blur-2xl ring-1 transition-all hover:-translate-y-1 ${
                  pkg.premium
                    ? "bg-white/[0.08] ring-amber-400/40 shadow-[0_20px_60px_-15px_rgba(168,85,247,0.5),0_0_30px_-5px_rgba(251,191,36,0.3)] hover:ring-amber-300/60 md:-translate-y-2 md:scale-[1.03]"
                    : "bg-white/[0.05] ring-white/10 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.7)] hover:ring-white/20"
                }`}
                data-testid={`landing-pkg-${pkg.letter}`}
              >
                {pkg.premium && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-3xl"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(251,191,36,0.08) 50%, rgba(168,85,247,0.06) 100%)",
                    }}
                  />
                )}
                <div
                  className="pointer-events-none absolute -top-12 -end-12 w-44 h-44 rounded-full opacity-40 blur-3xl"
                  style={{
                    background: `radial-gradient(circle, ${pkg.glow}, transparent 70%)`,
                  }}
                />
                {pkg.premium && (
                  <div className="absolute top-4 start-4 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg"
                      style={{
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        color: "#451a03",
                        boxShadow: "0 4px 16px -4px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                      }}
                    >
                      <Crown className="h-3 w-3" />
                      {t("pkg_best_value")}
                    </span>
                  </div>
                )}
                <div className={`relative p-6 space-y-4 ${pkg.premium ? "pt-14" : ""}`}>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${pkg.gradient} text-white font-extrabold text-sm shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/20`}
                  >
                    {pkg.letter}
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {t(pkg.titleKey)}
                  </h3>
                  {pkg.premium && (
                    <p className="text-xs text-amber-300/80 font-medium">
                      A1 → B1 + B1+ → C1
                    </p>
                  )}
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {t(pkg.descKey)}
                  </p>
                  {pkg.premium ? (
                    <span
                      className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition group-hover:shadow-lg"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 40%, #f59e0b 100%)",
                        color: "#fff",
                        boxShadow: "0 10px 28px -10px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.18)",
                      }}
                    >
                      {t("pkg_start_course")}
                      <ArrowRight className={`h-4 w-4 ${lang === "ar" ? "rotate-180" : ""}`} />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-purple-300 group-hover:text-purple-200 transition">
                      {t("pkg_view_details")}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex items-start gap-4 rounded-xl border border-card-border bg-card p-5 shadow-xs"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium leading-relaxed pt-2">
                  {t(key)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Abu Omar EduLexo · {t("brand")}
      </footer>
    </div>
  );
}
