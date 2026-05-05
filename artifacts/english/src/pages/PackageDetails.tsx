import { useT, useLanguage } from "@/lib/i18n";
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  PenTool,
  Headphones,
  BookOpenCheck,
  BookOpen,
  Sparkles,
  Target,
  Users,
  TrendingUp,
  CheckCircle2,
  GraduationCap,
  Zap,
  Brain,
} from "lucide-react";
import type { TranslationKey } from "@/lib/translations";

type PackageSlug = "a1-b1" | "b1-c1" | "full";

interface SkillDef {
  icon: React.ComponentType<{ className?: string }>;
  nameKey: TranslationKey;
  descKey: TranslationKey;
  gradient: string;
  glow: string;
}

const SKILLS: SkillDef[] = [
  {
    icon: Mic,
    nameKey: "pkg_skill_speaking",
    descKey: "pkg_skill_speaking_desc",
    gradient: "from-sky-500 to-blue-600",
    glow: "rgba(14,165,233,0.4)",
  },
  {
    icon: PenTool,
    nameKey: "pkg_skill_writing",
    descKey: "pkg_skill_writing_desc",
    gradient: "from-amber-500 to-orange-600",
    glow: "rgba(245,158,11,0.4)",
  },
  {
    icon: Headphones,
    nameKey: "pkg_skill_listening",
    descKey: "pkg_skill_listening_desc",
    gradient: "from-pink-500 to-rose-600",
    glow: "rgba(236,72,153,0.4)",
  },
  {
    icon: BookOpenCheck,
    nameKey: "pkg_skill_reading",
    descKey: "pkg_skill_reading_desc",
    gradient: "from-cyan-500 to-teal-600",
    glow: "rgba(6,182,212,0.4)",
  },
  {
    icon: BookOpen,
    nameKey: "pkg_skill_lessons",
    descKey: "pkg_skill_lessons_desc",
    gradient: "from-violet-500 to-indigo-600",
    glow: "rgba(139,92,246,0.4)",
  },
];

interface PackageMeta {
  slug: PackageSlug;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  levelKey: TranslationKey;
  learnKeys: TranslationKey[];
  specialKeys: TranslationKey[];
  audienceKey: TranslationKey;
  iconGradient: string;
  letter: string;
  glow: string;
}

const PACKAGES: Record<PackageSlug, PackageMeta> = {
  "a1-b1": {
    slug: "a1-b1",
    titleKey: "tier_beginner",
    subtitleKey: "pkg_a1b1_subtitle",
    levelKey: "pkg_a1b1_level",
    learnKeys: [
      "pkg_a1b1_learn1",
      "pkg_a1b1_learn2",
      "pkg_a1b1_learn3",
      "pkg_a1b1_learn4",
      "pkg_a1b1_learn5",
    ],
    specialKeys: [
      "pkg_special_ai",
      "pkg_special_structured",
      "pkg_special_improvement",
    ],
    audienceKey: "pkg_a1b1_audience",
    iconGradient: "from-emerald-400 to-teal-500",
    letter: "A1",
    glow: "rgba(16,185,129,0.5)",
  },
  "b1-c1": {
    slug: "b1-c1",
    titleKey: "tier_intermediate",
    subtitleKey: "pkg_b1c1_subtitle",
    levelKey: "pkg_b1c1_level",
    learnKeys: [
      "pkg_b1c1_learn1",
      "pkg_b1c1_learn2",
      "pkg_b1c1_learn3",
      "pkg_b1c1_learn4",
      "pkg_b1c1_learn5",
    ],
    specialKeys: [
      "pkg_special_ai",
      "pkg_special_structured",
      "pkg_special_improvement",
    ],
    audienceKey: "pkg_b1c1_audience",
    iconGradient: "from-cyan-400 to-blue-500",
    letter: "B1+",
    glow: "rgba(56,189,248,0.5)",
  },
  full: {
    slug: "full",
    titleKey: "tier_advanced",
    subtitleKey: "pkg_full_subtitle",
    levelKey: "pkg_full_level",
    learnKeys: [
      "pkg_full_learn1",
      "pkg_full_learn2",
      "pkg_full_learn3",
      "pkg_full_learn4",
      "pkg_full_learn5",
    ],
    specialKeys: [
      "pkg_special_ai",
      "pkg_special_structured",
      "pkg_special_improvement",
    ],
    audienceKey: "pkg_full_audience",
    iconGradient: "from-fuchsia-500 to-purple-600",
    letter: "★",
    glow: "rgba(168,85,247,0.5)",
  },
};

const SPECIAL_ICONS = [Brain, Target, TrendingUp];

export default function PackageDetails({
  slug,
  onBack,
}: {
  slug: PackageSlug;
  onBack: () => void;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const pkg = PACKAGES[slug];

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>Package not found</p>
      </div>
    );
  }

  const joinUrl = `/?next=${encodeURIComponent(window.location.pathname)}`;

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(124,58,237,0.18), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition mb-8"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("pkg_back")}
        </button>

        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] p-8 sm:p-10 mb-8">
          <div
            className="pointer-events-none absolute -top-16 -end-16 w-56 h-56 rounded-full opacity-40 blur-3xl"
            style={{
              background: `radial-gradient(circle, ${pkg.glow}, transparent 70%)`,
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-start gap-6">
            <div
              className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${pkg.iconGradient} text-white font-extrabold text-2xl sm:text-3xl shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/20 shrink-0`}
            >
              {pkg.letter}
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 text-[11px] font-bold uppercase tracking-wider text-purple-200 mb-3">
                <GraduationCap className="h-3.5 w-3.5" />
                {t(pkg.levelKey)}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(168,85,247,0.45)]">
                {t(pkg.titleKey)}
              </h1>
              <p className="mt-3 text-slate-300 text-base sm:text-lg leading-relaxed">
                {t(pkg.subtitleKey)}
              </p>
            </div>
          </div>
        </div>

        {/* What you will learn */}
        <Section title={t("pkg_section_learn")} icon={<Sparkles className="h-5 w-5" />}>
          <div className="space-y-3">
            {pkg.learnKeys.map((key) => (
              <div key={key} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm leading-relaxed">{t(key)}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Skills included */}
        <Section title={t("pkg_section_skills")} icon={<Zap className="h-5 w-5" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SKILLS.map((skill) => {
              const Icon = skill.icon;
              return (
                <div
                  key={skill.nameKey}
                  className="group relative rounded-2xl p-5 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                    boxShadow: `0 8px 32px -8px ${skill.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                  }}
                >
                  <div
                    className="pointer-events-none absolute -top-8 -end-8 w-24 h-24 rounded-full opacity-25 blur-3xl"
                    style={{ background: skill.glow }}
                  />
                  <div className="relative flex items-start gap-4">
                    <div
                      className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${skill.gradient} shadow-lg shrink-0`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white">{t(skill.nameKey)}</h4>
                      <p className="mt-1 text-xs text-white/40 leading-relaxed">
                        {t(skill.descKey)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* What makes this course special */}
        <Section title={t("pkg_section_special")} icon={<Brain className="h-5 w-5" />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {pkg.specialKeys.map((key, i) => {
              const Icon = SPECIAL_ICONS[i];
              return (
                <div
                  key={key}
                  className="rounded-2xl p-5 text-center"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg mb-3">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-white">{t(key)}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Who this course is for */}
        <Section title={t("pkg_section_audience")} icon={<Users className="h-5 w-5" />}>
          <p className="text-slate-300 text-sm leading-relaxed">{t(pkg.audienceKey)}</p>
        </Section>

        {/* CTA */}
        <div className="mt-10 text-center">
          <a
            href={joinUrl}
            className="inline-flex items-center justify-center gap-3 h-14 px-10 rounded-2xl text-white text-lg font-bold shadow-[0_10px_40px_-10px_rgba(124,58,237,0.7),inset_0_1px_0_rgba(255,255,255,0.18)] active:scale-95 transition hover:scale-[1.02]"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)",
            }}
            data-testid="button-join-course"
          >
            {t("pkg_cta_join")}
            <ArrowRight className={`h-5 w-5 ${lang === "ar" ? "rotate-180" : ""}`} />
          </a>
          <p className="mt-3 text-xs text-slate-500">{t("pkg_cta_hint")}</p>
        </div>

        <div className="h-12" />
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.06] ring-1 ring-white/10 text-purple-300">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}
