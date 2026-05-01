import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LogOut, ChevronRight, History, Eye, Inbox } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const NAVY = "#1E2155";
const GREEN = "#6EE7B7";

interface Section {
  id: number;
  title: string;
  description: string;
}

interface AttemptSummary {
  id: number;
  testId: string;
  sectionId: number;
  title: string;
  description: string;
  score: number;
  total: number;
  percent: number;
  createdAt: string;
}

interface Props {
  onBack: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
  onOpenAttempt: (testId: string) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ListeningHistory({ onBack, onLogout, expiresAt, onOpenAttempt }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api-intro/auth/logout`, { method: "POST", credentials: "include" });
    onLogout?.();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api-intro/listening/attempts`, { credentials: "include" });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setSections(data.sections || []);
          setAttempts(data.attempts || []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCompleted = attempts.length;
  const overallPercent = useMemo(() => {
    if (attempts.length === 0) return 0;
    const score = attempts.reduce((a, t) => a + t.score, 0);
    const total = attempts.reduce((a, t) => a + t.total, 0);
    return total > 0 ? Math.round((score / total) * 100) : 0;
  }, [attempts]);

  const groups = useMemo(() => {
    return sections
      .map((s) => ({
        section: s,
        items: attempts
          .filter((a) => a.sectionId === s.id)
          .sort((a, b) => {
            const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return db - da;
          }),
      }))
      .filter((g) => g.items.length > 0);
  }, [sections, attempts]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid rgba(110,231,183,0.18)` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-white/40 hover:text-white/70 transition-colors p-1 -ml-1"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src="/logo.png" alt="LEXO Intro" className="w-10 h-10 object-contain" />
          <div>
            <div className="font-black text-white text-base tracking-tight leading-none">My Listening History</div>
            <div className="text-xs font-semibold" style={{ color: GREEN }}>Attenborough AI</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DaysLeftBadge expiresAt={expiresAt} />
          {onLogout && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-3 py-2 rounded-full transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: "transparent" }} />
          </div>
        ) : (
          <>
            <div
              className="rounded-3xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-5"
              style={{
                background: `linear-gradient(160deg, rgba(110,231,183,0.16), rgba(110,231,183,0.04))`,
                border: `1px solid rgba(110,231,183,0.35)`,
              }}
            >
              <div
                className="flex flex-col items-center justify-center w-24 h-24 rounded-3xl shrink-0"
                style={{
                  background: `radial-gradient(circle, rgba(110,231,183,0.25), rgba(110,231,183,0.05))`,
                  border: `2px solid ${GREEN}`,
                }}
              >
                <div className="text-2xl font-black" style={{ color: GREEN }}>{totalCompleted}</div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5">done</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: GREEN }} />
                  <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: GREEN }}>
                    Your progress
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-1">
                  {totalCompleted === 0 ? "No tests yet" : `${overallPercent}% average`}
                </h1>
                <p className="text-white/65 text-sm mt-2 leading-relaxed">
                  {totalCompleted === 0
                    ? "When you finish a listening test, it will appear here so you can review your answers."
                    : `You have completed ${totalCompleted} listening test${totalCompleted === 1 ? "" : "s"}. Tap any entry to review your answers and feedback.`}
                </p>
              </div>
            </div>

            {groups.length === 0 ? (
              <div
                className="rounded-2xl p-8 flex flex-col items-center text-center gap-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `rgba(110,231,183,0.15)`, border: `1px solid rgba(110,231,183,0.35)` }}
                >
                  <Inbox className="w-6 h-6" style={{ color: GREEN }} />
                </div>
                <div className="text-white font-bold">Nothing here yet</div>
                <p className="text-white/50 text-sm max-w-sm">
                  Pick a section and finish a test. Your score, answers, and AI feedback will be saved here for review.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map(({ section, items }) => (
                  <section key={section.id}>
                    <div className="flex items-baseline justify-between mb-2 px-1">
                      <h2 className="text-sm font-black text-white uppercase tracking-wider">
                        {section.title}
                      </h2>
                      <span className="text-[11px] font-bold" style={{ color: GREEN }}>
                        {items.length} done
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => onOpenAttempt(a.testId)}
                          className="group w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.005] active:scale-[0.995]"
                          style={{
                            background: `linear-gradient(160deg, rgba(110,231,183,0.10), rgba(110,231,183,0.03))`,
                            border: `1px solid rgba(110,231,183,0.28)`,
                          }}
                        >
                          <div
                            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                            style={{
                              background: `rgba(110,231,183,0.18)`,
                              border: `1px solid rgba(110,231,183,0.40)`,
                            }}
                          >
                            <div className="text-base font-black leading-none" style={{ color: GREEN }}>
                              {a.score}/{a.total}
                            </div>
                            <div className="text-[10px] text-white/60 mt-0.5">{a.percent}%</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-white truncate">{a.title}</h3>
                            {a.description && (
                              <p className="text-xs text-white/50 mt-0.5 truncate">{a.description}</p>
                            )}
                            {a.createdAt && (
                              <p className="text-[11px] text-white/40 mt-1">
                                Completed {formatDate(a.createdAt)}
                              </p>
                            )}
                          </div>
                          <div
                            className="shrink-0 flex items-center gap-1 text-xs font-bold"
                            style={{ color: GREEN }}
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Review</span>
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
