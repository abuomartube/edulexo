import { useState, useEffect, useCallback } from "react";
import { LogOut, CalendarClock, Star, Send, Loader2, CheckCircle, MessageSquare, Sparkles } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#6B2FE6";
const GREEN = "#1DB954";
const SOFT_GREEN = "#6EE7B7";
const YELLOW = "#F5C518";
const VIOLET = "#A78BFA";
const NAVY = "#1E2155";

interface Props {
  onChurchill: () => void;
  onOrwell: () => void;
  onAttenborough: () => void;
  onHemingway: () => void;
  onLogout?: () => void;
  expiresAt: string | null;
}

interface Comment {
  id: number;
  name: string;
  text: string;
  rating: number;
  created_at: string;
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          className={onChange ? "hover:scale-110 transition-transform" : ""}
        >
          <Star
            className="w-4 h-4"
            fill={star <= value ? "#F5C518" : "transparent"}
            stroke={star <= value ? "#F5C518" : "rgba(255,255,255,0.2)"}
          />
        </button>
      ))}
    </div>
  );
}

export default function ToolChoice({ onChurchill, onOrwell, onAttenborough, onHemingway, onLogout, expiresAt }: Props) {
  const handleLogout = async () => {
    await fetch(`${BASE_URL}/api-intro/auth/logout`, { method: "POST", credentials: "include" });
    onLogout?.();
  };

  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api-intro/auth/comments/approved`, { credentials: "include" });
      const data = await res.json();
      if (data.comments) setComments(data.comments);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const submitReview = async () => {
    if (!reviewText.trim()) return;
    setSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/auth/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: reviewText.trim(), rating: reviewRating, name: reviewName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Failed to submit");
        return;
      }
      setSubmitted(true);
      setReviewText("");
    } catch {
      setReviewError("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid rgba(107,47,230,0.15)" }}
      >
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="LEXO Intro" className="w-10 h-10 object-contain" />
          <div>
            <div className="font-black text-white text-base tracking-tight leading-none">LEXO Intro</div>
            <div className="text-xs font-semibold" style={{ color: TEAL }}>AI Tools</div>
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

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8 gap-6">
        {isExpired && (
          <div
            className="w-full max-w-2xl rounded-2xl p-4 flex items-center gap-3 text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <CalendarClock className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <span className="text-red-300 font-bold">Your account has expired.</span>
              <span className="text-red-300/70 ml-1">Contact your instructor to renew access.</span>
            </div>
          </div>
        )}

        <div className="text-center space-y-3 pt-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase"
            style={{
              background: `linear-gradient(135deg, rgba(107,47,230,0.15), rgba(245,197,24,0.15))`,
              border: `1px solid rgba(107,47,230,0.35)`,
              color: TEAL,
            }}
          >
            <span>LEXO Intro</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>·</span>
            <span style={{ color: YELLOW }}>by Abu Omar EduLexo</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.05]">
            Your Personal <span style={{ color: TEAL }}>IELTS</span> Practice
          </h1>
          <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto font-medium">
            Four AI tools. One goal —{" "}
            <span className="font-bold" style={{ color: YELLOW }}>your target band score.</span>
          </p>
          <div className="flex items-center justify-center gap-3 pt-1 text-xs text-white/50 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL }} />
              <span className="font-bold text-white">Churchill</span>
              <span className="uppercase tracking-wider" style={{ color: TEAL }}>Speaking</span>
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: YELLOW }} />
              <span className="font-bold text-white">Orwell</span>
              <span className="uppercase tracking-wider" style={{ color: YELLOW }}>Writing</span>
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: SOFT_GREEN }} />
              <span className="font-bold text-white">Attenborough</span>
              <span className="uppercase tracking-wider" style={{ color: SOFT_GREEN }}>Listening</span>
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: VIOLET }} />
              <span className="font-bold text-white">Hemingway</span>
              <span className="uppercase tracking-wider" style={{ color: VIOLET }}>Reading</span>
            </span>
          </div>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl ${isExpired ? "opacity-50 pointer-events-none" : ""}`}>
          <button
            onClick={onChurchill}
            disabled={isExpired}
            className="group flex flex-col items-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
          >
            <div className="relative mb-[-40px] z-10">
              <div
                className="absolute inset-[-20px] rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)` }}
              />
              <img
                src={`${import.meta.env.BASE_URL}churchill.png`}
                alt="Churchill"
                className="relative w-48 h-60 object-cover object-top rounded-2xl drop-shadow-2xl"
                style={{ border: "2px solid rgba(107,47,230,0.3)" }}
              />
            </div>

            <div
              className="relative w-full rounded-2xl pt-14 pb-5 px-5 text-center overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(107,47,230,0.25)",
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(180deg, rgba(107,47,230,0.1) 0%, rgba(107,47,230,0.02) 100%)` }}
              />
              <div className="relative space-y-3">
                <div>
                  <div
                    className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase mb-1"
                    style={{ background: "rgba(107,47,230,0.15)", color: TEAL }}
                  >
                    Speaking
                  </div>
                  <h2 className="text-2xl font-black text-white leading-tight">Churchill</h2>
                  <p className="text-[11px] font-semibold text-white/50">AI IELTS Examiner</p>
                </div>
                <ul className="text-xs text-white/75 leading-relaxed space-y-1.5 text-left">
                  <li className="flex items-start gap-2"><span className="shrink-0">🎙️</span><span>Real-time voice conversations</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🎧</span><span>All 3 IELTS Speaking parts</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">📊</span><span>Instant band score &amp; feedback</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">📝</span><span>Grammar &amp; vocabulary upgrades</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🎓</span><span>Trained on Cambridge examiner data</span></li>
                </ul>
                <div
                  className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: TEAL }}
                >
                  Start Speaking <span>→</span>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={onOrwell}
            disabled={isExpired}
            className="group flex flex-col items-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
          >
            <div className="relative mb-[-40px] z-10">
              <div
                className="absolute inset-[-20px] rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${YELLOW} 0%, transparent 70%)` }}
              />
              <img
                src={`${import.meta.env.BASE_URL}orwell.png`}
                alt="Orwell AI"
                className="relative w-48 h-60 object-cover object-top rounded-2xl drop-shadow-2xl"
                style={{ border: `2px solid rgba(245,197,24,0.3)` }}
              />
            </div>

            <div
              className="relative w-full rounded-2xl pt-14 pb-5 px-5 text-center overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid rgba(245,197,24,0.25)`,
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(180deg, rgba(245,197,24,0.1) 0%, rgba(245,197,24,0.02) 100%)` }}
              />
              <div className="relative space-y-3">
                <div>
                  <div
                    className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase mb-1"
                    style={{ background: "rgba(245,197,24,0.15)", color: YELLOW }}
                  >
                    Writing
                  </div>
                  <h2 className="text-2xl font-black text-white leading-tight">Orwell AI</h2>
                  <p className="text-[11px] font-semibold text-white/50">AI Writing Analyst</p>
                </div>
                <ul className="text-xs text-white/75 leading-relaxed space-y-1.5 text-left">
                  <li className="flex items-start gap-2"><span className="shrink-0">✍️</span><span>Task 1, Task 2 &amp; Paragraph tasks</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">📚</span><span>45 real IELTS-style prompts</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🎯</span><span>Band 0–9 score on all 4 criteria</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🔧</span><span>Grammar fixes &amp; sample answers</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">📖</span><span>Calibrated with Cambridge materials</span></li>
                </ul>
                <div
                  className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: YELLOW }}
                >
                  Start Writing <span>→</span>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={onAttenborough}
            disabled={isExpired}
            className="group flex flex-col items-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
          >
            <div className="relative mb-[-40px] z-10">
              <div
                className="absolute inset-[-20px] rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${SOFT_GREEN} 0%, transparent 70%)` }}
              />
              <img
                src={`${import.meta.env.BASE_URL}attenborough.png`}
                alt="Attenborough AI"
                className="relative w-48 h-60 object-cover object-center rounded-2xl drop-shadow-2xl"
                style={{ border: `2px solid rgba(110,231,183,0.4)` }}
              />
              <span
                className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 z-10"
                style={{ background: `rgba(110,231,183,0.2)`, color: SOFT_GREEN, border: `1px solid rgba(110,231,183,0.45)` }}
              >
                <Sparkles className="w-2.5 h-2.5" /> New
              </span>
            </div>

            <div
              className="relative w-full rounded-2xl pt-14 pb-5 px-5 text-center overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid rgba(110,231,183,0.28)`,
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(180deg, rgba(110,231,183,0.10) 0%, rgba(110,231,183,0.02) 100%)` }}
              />
              <div className="relative space-y-3">
                <div>
                  <div
                    className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase mb-1"
                    style={{ background: `rgba(110,231,183,0.18)`, color: SOFT_GREEN }}
                  >
                    Listening
                  </div>
                  <h2 className="text-2xl font-black text-white leading-tight">Attenborough AI</h2>
                  <p className="text-[11px] font-semibold text-white/50">A2 Listening Coach</p>
                </div>
                <ul className="text-xs text-white/75 leading-relaxed space-y-1.5 text-left">
                  <li className="flex items-start gap-2"><span className="shrink-0">🎧</span><span>20 short A2-level listening tests</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🗂️</span><span>4 sections × 5 tests</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🧠</span><span>MCQ, matching, completion &amp; more</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🎯</span><span>Instant scoring &amp; review</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🤖</span><span>Friendly AI feedback after each test</span></li>
                </ul>
                <div
                  className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: SOFT_GREEN }}
                >
                  Start Listening <span>→</span>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={onHemingway}
            disabled={isExpired}
            className="group flex flex-col items-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
          >
            <div className="relative mb-[-40px] z-10">
              <div
                className="absolute inset-[-20px] rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${VIOLET} 0%, transparent 70%)` }}
              />
              <img
                src={`${import.meta.env.BASE_URL}hemingway.png`}
                alt="Hemingway AI"
                className="relative w-48 h-60 object-cover object-top rounded-2xl drop-shadow-2xl"
                style={{ border: `2px solid rgba(167,139,250,0.4)` }}
              />
              <span
                className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 z-10"
                style={{ background: `rgba(167,139,250,0.2)`, color: VIOLET, border: `1px solid rgba(167,139,250,0.45)` }}
              >
                <Sparkles className="w-2.5 h-2.5" /> New
              </span>
            </div>

            <div
              className="relative w-full rounded-2xl pt-14 pb-5 px-5 text-center overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid rgba(167,139,250,0.28)`,
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(180deg, rgba(167,139,250,0.10) 0%, rgba(167,139,250,0.02) 100%)` }}
              />
              <div className="relative space-y-3">
                <div>
                  <div
                    className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase mb-1"
                    style={{ background: `rgba(167,139,250,0.18)`, color: VIOLET }}
                  >
                    Reading
                  </div>
                  <h2 className="text-2xl font-black text-white leading-tight">Hemingway AI</h2>
                  <p className="text-[11px] font-semibold text-white/50">A2 &amp; B1 Reading Coach</p>
                </div>
                <ul className="text-xs text-white/75 leading-relaxed space-y-1.5 text-left">
                  <li className="flex items-start gap-2"><span className="shrink-0">📖</span><span>100 reading passages, A2 &amp; B1</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🗂️</span><span>10 IELTS question types per level</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">✅</span><span>True/False, matching, completion &amp; more</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🎯</span><span>Per-question feedback &amp; explanations</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🏆</span><span>Bucket score after every 5 passages</span></li>
                </ul>
                <div
                  className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: VIOLET }}
                >
                  Start Reading <span>→</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="w-full max-w-2xl space-y-4">
          <div className="flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: TEAL }} />
            <h2 className="text-sm font-bold text-white">Student Reviews</h2>
          </div>

          {!submitted ? (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Share your experience</span>
                <StarRating value={reviewRating} onChange={setReviewRating} />
              </div>
              <input
                type="text"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                placeholder="Your name (e.g. Ahmed)"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="How has LEXO Intro helped you?"
                rows={2}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 resize-none outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              {reviewError && <p className="text-xs text-red-400">{reviewError}</p>}
              <button
                onClick={submitReview}
                disabled={!reviewText.trim() || submitting}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          ) : (
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.3)" }}
            >
              <CheckCircle className="w-5 h-5 shrink-0" style={{ color: GREEN }} />
              <p className="text-sm text-white/70">Thank you for your review! It will appear after admin approval.</p>
            </div>
          )}

          {comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl px-4 py-3 space-y-1"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/50">{c.name || "Student"}</span>
                    <StarRating value={c.rating} />
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-white/30">
          Powered by GPT-4o & Claude AI · by Abu Omar EduLexo
        </p>
      </main>
    </div>
  );
}
