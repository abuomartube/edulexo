import { useState } from "react";
import { useT, useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierCard } from "@/components/TierCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import {
  ENGLISH_TIERS,
  bestTier,
  isTierUnlocked,
  redeemEnglishCode,
  type EnglishEnrollment,
  type PublicUser,
} from "@/lib/api";

export default function Dashboard({
  user,
  enrollments,
  onChanged,
}: {
  user: PublicUser;
  enrollments: EnglishEnrollment[];
  onChanged: () => void;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const top = bestTier(enrollments);
  const tierLabel = top
    ? t(
        top === "beginner"
          ? "tier_beginner"
          : top === "intermediate"
            ? "tier_intermediate"
            : "tier_advanced",
      )
    : null;

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setMsg(null);
    const res = await redeemEnglishCode(code.trim());
    setSubmitting(false);
    if (res.ok) {
      setCode("");
      setMsg({ kind: "ok", text: t("redeemSuccess") });
      onChanged();
    } else {
      setMsg({ kind: "err", text: res.error || t("error") });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-welcome">
          {t("dash_welcome")}, {user.name || user.email}
        </h1>
        {tierLabel ? (
          <p className="mt-2 text-muted-foreground">
            {t("dash_currentTier")}:{" "}
            <span className="font-semibold text-primary">{tierLabel}</span>
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">{t("dash_noEnrollment")}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("nav_redeem")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("dash_redeemPrompt")}
          </p>
          <form onSubmit={onRedeem} className="flex flex-col sm:flex-row gap-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("dash_redeemPlaceholder")}
              dir="ltr"
              className={lang === "ar" ? "text-right" : ""}
              data-testid="input-code"
              disabled={submitting}
            />
            <Button
              type="submit"
              disabled={submitting || !code.trim()}
              data-testid="button-redeem"
              className="gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("dash_redeemBtn")}
            </Button>
          </form>
          {msg && (
            <Alert
              className="mt-4"
              variant={msg.kind === "ok" ? "default" : "destructive"}
              data-testid={`alert-${msg.kind}`}
            >
              <AlertDescription>{msg.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {ENGLISH_TIERS.map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            unlocked={isTierUnlocked(enrollments, tier)}
            current={top === tier}
          />
        ))}
      </div>
    </div>
  );
}
