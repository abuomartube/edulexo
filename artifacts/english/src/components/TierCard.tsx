import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { Lock, Sparkles } from "lucide-react";
import type { EnglishTier } from "@/lib/api";

const ICON_BG: Record<EnglishTier, string> = {
  beginner: "bg-[hsl(160,60%,45%)]",
  intermediate: "bg-[hsl(222,100%,65%)]",
  advanced: "bg-[hsl(263,78%,55%)]",
};

const TIER_KEY = {
  beginner: { title: "tier_beginner", desc: "tier_beginner_desc" },
  intermediate: { title: "tier_intermediate", desc: "tier_intermediate_desc" },
  advanced: { title: "tier_advanced", desc: "tier_advanced_desc" },
} as const;

export function TierCard({
  tier,
  unlocked,
  current,
  onOpen,
}: {
  tier: EnglishTier;
  unlocked: boolean;
  current: boolean;
  onOpen?: () => void;
}) {
  const t = useT();
  const meta = TIER_KEY[tier];
  return (
    <Card
      className={`relative overflow-hidden transition-shadow ${
        current ? "ring-2 ring-primary shadow-lg" : ""
      }`}
      data-testid={`card-tier-${tier}`}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold ${ICON_BG[tier]}`}
            aria-hidden
          >
            {tier[0]!.toUpperCase()}
          </div>
          {unlocked ? (
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("dash_unlocked")}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              {t("dash_locked")}
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl" data-testid={`text-tier-title-${tier}`}>
          {t(meta.title)}
        </CardTitle>
        <CardDescription>{t(meta.desc)}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          variant={unlocked ? "default" : "outline"}
          disabled={!unlocked}
          onClick={onOpen}
          data-testid={`button-open-${tier}`}
        >
          {unlocked ? t("dash_explore") : t("dash_locked")}
        </Button>
        {unlocked && (
          <p className="mt-3 text-xs text-center text-muted-foreground">
            {t("dash_comingSoon")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
