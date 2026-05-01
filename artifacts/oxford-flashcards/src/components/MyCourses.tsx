import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Sparkles, Crown, ExternalLink, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import {
  fetchMyEnrollments,
  redeemAccessCode,
  launchTier,
  type Enrollment,
  type Tier,
} from "@/lib/platform-api";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";
import tierIntroLogo from "@assets/F404C41A-045C-42E8-B2EF-B75CBD59294E_1777643375926.PNG";
import tierAdvanceLogo from "@assets/29C649F8-7100-4DBE-95BE-491CAAA5B4E8_1777643368790.PNG";
import tierCompleteLogo from "@assets/890CB599-C509-44F9-A6D7-493614DAC2F9_1777643368791.PNG";

const TIER_META: Record<
  Tier,
  { logo: string; gradient: string; icon: React.ReactNode; range: string; nameKey: TranslationKey }
> = {
  intro: {
    logo: tierIntroLogo,
    gradient: "from-blue-600 to-indigo-700",
    icon: <GraduationCap size={20} />,
    range: "A2 → B1",
    nameKey: "courses.tier.intro",
  },
  advance: {
    logo: tierAdvanceLogo,
    gradient: "from-purple-600 to-fuchsia-700",
    icon: <Sparkles size={20} />,
    range: "B1 → C1",
    nameKey: "courses.tier.advance",
  },
  complete: {
    logo: tierCompleteLogo,
    gradient: "from-amber-500 to-orange-600",
    icon: <Crown size={20} />,
    range: "A2 → C1",
    nameKey: "courses.tier.complete",
  },
};

export default function MyCourses() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const enrollmentsQuery = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: fetchMyEnrollments,
  });

  const redeemMutation = useMutation({
    mutationFn: redeemAccessCode,
    onSuccess: (e) => {
      setRedeemMsg({
        kind: "ok",
        text: t("courses.redeem.success").replace("{tier}", t(TIER_META[e.tier].nameKey)),
      });
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
    onError: (err: Error) => {
      setRedeemMsg({ kind: "err", text: err.message });
    },
  });

  const launchMutation = useMutation({
    mutationFn: launchTier,
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const enrollments: Enrollment[] = enrollmentsQuery.data ?? [];
  const activeEnrollments = enrollments.filter((e) => e.isActive);

  return (
    <section className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">{t("courses.title")}</h2>
        {enrollmentsQuery.isFetching && (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        )}
      </div>

      {enrollmentsQuery.isLoading ? (
        <div className="py-10 text-center text-slate-500 text-sm">
          <Loader2 size={20} className="inline animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : activeEnrollments.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-gray-800 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            {t("courses.empty")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeEnrollments.map((e) => {
            const meta = TIER_META[e.tier];
            const expiresLabel = e.expiresAt
              ? new Date(e.expiresAt).toLocaleDateString(
                  lang === "ar" ? "ar-EG" : "en-US",
                  { day: "numeric", month: "short", year: "numeric" },
                )
              : null;
            return (
              <div
                key={e.id}
                className="rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition"
              >
                <div className={`bg-gradient-to-br ${meta.gradient} p-4 text-white flex items-center gap-3`}>
                  <img
                    src={meta.logo}
                    alt=""
                    className="w-12 h-12 object-contain bg-white/15 rounded-lg p-1.5"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider opacity-80">
                      {meta.range}
                    </p>
                    <h3 className="text-base font-bold leading-tight">
                      {t(meta.nameKey)}
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  {expiresLabel && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      {t("courses.expiresOn")}: <span className="font-medium">{expiresLabel}</span>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => launchMutation.mutate(e.tier)}
                    disabled={launchMutation.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
                  >
                    {launchMutation.isPending && launchMutation.variables === e.tier ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ExternalLink size={15} />
                    )}
                    {t("courses.launch")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Access code redemption */}
      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-800">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
          <KeyRound size={16} />
          {t("courses.redeem.title")}
        </h3>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            setRedeemMsg(null);
            if (code.trim()) redeemMutation.mutate(code.trim());
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={code}
            onChange={(ev) => setCode(ev.target.value.toUpperCase())}
            placeholder="ABCD-EFGH-JKLM"
            className="flex-1 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={redeemMutation.isPending || !code.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
          >
            {redeemMutation.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CheckCircle2 size={15} />
            )}
            {t("courses.redeem.button")}
          </button>
        </form>
        {redeemMsg && (
          <p
            className={`mt-2 text-sm ${redeemMsg.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {redeemMsg.text}
          </p>
        )}
      </div>
    </section>
  );
}
