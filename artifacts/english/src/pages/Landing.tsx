import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { TierCard } from "@/components/TierCard";
import { ArrowRight, BookOpen, Headphones, MessageCircle, PenTool, GraduationCap, Sparkles } from "lucide-react";
import { ENGLISH_TIERS } from "@/lib/api";

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  const t = useT();
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onSignIn}
                className="gap-2"
                data-testid="button-cta-enroll"
              >
                {t("landing_cta_enroll")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={onSignIn}
                data-testid="button-cta-signin"
              >
                {t("landing_cta_signin")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {ENGLISH_TIERS.map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              unlocked={false}
              current={false}
              onOpen={onSignIn}
            />
          ))}
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
