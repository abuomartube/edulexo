import { useState, useEffect, useCallback } from "react";
import { LogIn, UserPlus, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff, Star, Quote, ArrowRight, MessageCircle, ArrowLeft, Clock, KeyRound } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#6B2FE6";
const SOFT_GREEN = "#6EE7B7";
const GREEN = "#1DB954";
const YELLOW = "#F5C518";
const NAVY = "#1E2155";
const VIOLET = "#A78BFA";
const WHATSAPP_URL = "https://wa.me/";

interface Props {
  onAuth: (user: { id: number; email: string; status: string }) => void;
  onAdminClick: () => void;
}

interface ReviewData {
  id: number;
  name: string;
  text: string;
  rating: number;
  created_at: string;
}

type View = "hero" | "form";

export default function Login({ onAuth, onAdminClick }: Props) {
  const [view, setView] = useState<View>("hero");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api-intro/auth/comments/approved`);
      const data = await res.json();
      if (data.comments) setReviews(data.comments);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (!isLogin && !accessCode.trim()) {
      setError("An access code is required to register");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint = isLogin ? "login" : "register";
      const body: Record<string, string> = { email: email.trim(), password };
      if (!isLogin) body.accessCode = accessCode.trim();
      const res = await fetch(`${BASE_URL}/api-intro/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      if (!isLogin) {
        // Show pending-approval screen instead of auto-login
        setRegisteredEmail(data.user?.email || email.trim());
        setPassword("");
        setAccessCode("");
        return;
      }
      onAuth(data.user);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;

  if (view === "form") {
    // Pending approval screen — shown right after a successful registration
    if (registeredEmail) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
          style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
        >
          <div className="w-full max-w-sm space-y-6 text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: `${YELLOW}15`, border: `1px solid ${YELLOW}40` }}
            >
              <Clock className="w-7 h-7" style={{ color: YELLOW }} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-2">Awaiting approval</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Thanks for registering! Your account <span className="text-white font-semibold">{registeredEmail}</span> is pending review by an administrator.
                You'll receive a confirmation email once approved, then you can sign in with your email and password.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => { setRegisteredEmail(null); setIsLogin(true); setError(null); }}
                className="w-full py-3 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01]"
                style={{ background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY }}
              >
                Go to Sign In
              </button>
              <button
                onClick={() => { setRegisteredEmail(null); setView("hero"); }}
                className="w-full py-2.5 rounded-2xl font-medium text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                Back to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-screen flex flex-col items-center overflow-y-auto px-4 py-12"
        style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
      >
        <div className="w-full max-w-sm space-y-6">
          <button
            onClick={() => { setView("hero"); setError(null); }}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="text-center">
            <div className="relative mx-auto mb-4 w-40">
              <div
                className="absolute inset-0 blur-3xl opacity-30"
                style={{ background: `radial-gradient(circle, ${TEAL} 0%, ${GREEN} 100%)` }}
              />
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="LEXO Intro"
                className="relative w-full drop-shadow-2xl object-contain"
              />
            </div>
            <h2 className="text-xl font-black text-white mb-1">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-white/50 text-sm">
              {isLogin ? "Sign in with your email and password" : "Register with your access code"}
            </p>
          </div>

          {error && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", "--tw-ring-color": TEAL } as React.CSSProperties}
              />
            </div>
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Access Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX"
                    required
                    autoComplete="off"
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 transition-all font-mono tracking-wider"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", "--tw-ring-color": TEAL } as React.CSSProperties}
                  />
                </div>
                <p className="text-[11px] text-white/35 mt-1.5">One-time access code — used once at registration.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Enter your password" : "Choose a password (min. 6 characters)"}
                  required
                  minLength={isLogin ? undefined : 6}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/30 outline-none focus:ring-2 transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", "--tw-ring-color": TEAL } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                <><LogIn className="w-5 h-5" />Sign In</>
              ) : (
                <><UserPlus className="w-5 h-5" />Register</>
              )}
            </button>
          </form>

          <div className="text-center space-y-3">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-sm font-medium transition-colors hover:text-white"
              style={{ color: TEAL }}
            >
              {isLogin ? "Don't have an account? Register" : "Already registered? Sign In"}
            </button>
            <div>
              <button
                onClick={onAdminClick}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mx-auto"
              >
                <ShieldCheck className="w-3.5 h-3.5" />Admin Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center overflow-y-auto px-4 py-10"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <div className="w-full max-w-3xl space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-28">
            <div
              className="absolute inset-0 blur-3xl opacity-40"
              style={{ background: `radial-gradient(circle, ${TEAL} 0%, ${GREEN} 100%)` }}
            />
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="LEXO Intro" className="relative w-full drop-shadow-2xl object-contain" />
          </div>
        </div>

        {/* Hero title */}
        <div className="text-center space-y-3">
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
              <span className="font-bold text-white">Orwell AI</span>
              <span className="uppercase tracking-wider" style={{ color: YELLOW }}>Writing</span>
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: SOFT_GREEN }} />
              <span className="font-bold text-white">Attenborough AI</span>
              <span className="uppercase tracking-wider" style={{ color: SOFT_GREEN }}>Listening</span>
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: VIOLET }} />
              <span className="font-bold text-white">Hemingway AI</span>
              <span className="uppercase tracking-wider" style={{ color: VIOLET }}>Reading</span>
            </span>
          </div>
        </div>

        {/* Four tool cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Churchill */}
          <div className="flex flex-col items-center">
            <div className="relative mb-[-40px] z-10">
              <div
                className="absolute inset-[-20px] rounded-full blur-2xl opacity-40"
                style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)` }}
              />
              <img
                src={`${import.meta.env.BASE_URL}churchill.png`}
                alt="Churchill"
                className="relative w-40 h-52 object-cover object-top rounded-2xl drop-shadow-2xl"
                style={{ border: "2px solid rgba(107,47,230,0.3)" }}
              />
            </div>
            <div
              className="relative w-full rounded-2xl pt-14 pb-5 px-5 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(107,47,230,0.25)" }}
            >
              <div className="space-y-3">
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
              </div>
            </div>
          </div>

          {/* Orwell */}
          <div className="flex flex-col items-center">
            <div className="relative mb-[-40px] z-10">
              <div
                className="absolute inset-[-20px] rounded-full blur-2xl opacity-40"
                style={{ background: `radial-gradient(circle, ${YELLOW} 0%, transparent 70%)` }}
              />
              <img
                src={`${import.meta.env.BASE_URL}orwell.png`}
                alt="Orwell AI"
                className="relative w-40 h-52 object-cover object-top rounded-2xl drop-shadow-2xl"
                style={{ border: `2px solid rgba(245,197,24,0.3)` }}
              />
            </div>
            <div
              className="relative w-full rounded-2xl pt-14 pb-5 px-5 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(245,197,24,0.25)` }}
            >
              <div className="space-y-3">
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
              </div>
            </div>
          </div>

          {/* Attenborough */}
          <div className="flex flex-col items-center">
            <div className="relative mb-[-40px] z-10">
              <div
                className="absolute inset-[-20px] rounded-full blur-2xl opacity-40"
                style={{ background: `radial-gradient(circle, ${SOFT_GREEN} 0%, transparent 70%)` }}
              />
              <img
                src={`${import.meta.env.BASE_URL}attenborough.png`}
                alt="Attenborough AI"
                className="relative w-40 h-52 object-cover object-top rounded-2xl drop-shadow-2xl"
                style={{ border: `2px solid rgba(110,231,183,0.4)` }}
              />
              <span
                className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider z-10"
                style={{ background: `rgba(110,231,183,0.2)`, color: SOFT_GREEN, border: `1px solid rgba(110,231,183,0.45)` }}
              >
                New
              </span>
            </div>
            <div
              className="relative w-full rounded-2xl pt-14 pb-5 px-5 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(110,231,183,0.28)` }}
            >
              <div className="space-y-3">
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
              </div>
            </div>
          </div>

          {/* Hemingway */}
          <div className="flex flex-col items-center">
            <div className="relative mb-[-40px] z-10">
              <div
                className="absolute inset-[-20px] rounded-full blur-2xl opacity-40"
                style={{ background: `radial-gradient(circle, ${VIOLET} 0%, transparent 70%)` }}
              />
              <img
                src={`${import.meta.env.BASE_URL}hemingway.png`}
                alt="Hemingway AI"
                className="relative w-40 h-52 object-cover object-top rounded-2xl drop-shadow-2xl"
                style={{ border: `2px solid rgba(167,139,250,0.4)` }}
              />
              <span
                className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider z-10"
                style={{ background: `rgba(167,139,250,0.2)`, color: VIOLET, border: `1px solid rgba(167,139,250,0.45)` }}
              >
                New
              </span>
            </div>
            <div
              className="relative w-full rounded-2xl pt-14 pb-5 px-5 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(167,139,250,0.28)` }}
            >
              <div className="space-y-3">
                <div>
                  <div
                    className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase mb-1"
                    style={{ background: `rgba(167,139,250,0.18)`, color: VIOLET }}
                  >
                    Reading
                  </div>
                  <h2 className="text-2xl font-black text-white leading-tight">Hemingway AI</h2>
                  <p className="text-[11px] font-semibold text-white/50">A2 / B1 Reading Coach</p>
                </div>
                <ul className="text-xs text-white/75 leading-relaxed space-y-1.5 text-left">
                  <li className="flex items-start gap-2"><span className="shrink-0">📚</span><span>100 reading practice items</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🎚️</span><span>Two levels: A2 &amp; B1</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">🧩</span><span>10 IELTS reading question types</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">✅</span><span>Instant scoring &amp; explanations</span></li>
                  <li className="flex items-start gap-2"><span className="shrink-0">📈</span><span>Build accuracy and confidence</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="w-full max-w-md mx-auto space-y-3 pt-2">
          <button
            onClick={() => setView("form")}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-full font-black text-lg text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`,
              boxShadow: `0 0 40px rgba(107,47,230,0.35), 0 8px 20px rgba(0,0,0,0.3)`,
            }}
          >
            <ArrowRight className="w-5 h-5" />
            Log In
          </button>
          <p className="text-center text-[11px] text-white/35 -mt-1">
            Already a student? Sign in with your access code.
          </p>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 py-4 rounded-full font-black text-lg text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${GREEN}, #25D366)`,
              boxShadow: `0 0 40px rgba(29,185,84,0.35), 0 8px 20px rgba(0,0,0,0.3)`,
            }}
          >
            <MessageCircle className="w-5 h-5" />
            اشترك الآن · Subscribe
          </a>
          <p className="text-center text-[11px] text-white/35 -mt-1">
            New here? Get your access code via WhatsApp.
          </p>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="w-full max-w-lg mx-auto mt-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-5 h-5" fill={s <= Math.round(Number(avgRating)) ? "#F5C518" : "transparent"} stroke={s <= Math.round(Number(avgRating)) ? "#F5C518" : "rgba(255,255,255,0.15)"} />
                ))}
                {avgRating && <span className="ml-1.5 text-sm font-bold text-white/70">{avgRating}</span>}
              </div>
              <h3 className="text-base font-bold text-white">What Our Students Say</h3>
              <p className="text-xs text-white/30">{reviews.length} review{reviews.length !== 1 ? "s" : ""} from real students</p>
            </div>

            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl px-5 py-4 space-y-2 relative"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Quote className="absolute top-3 right-4 w-5 h-5 text-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/50">{r.name || "Student"}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3 h-3" fill={s <= r.rating ? "#F5C518" : "transparent"} stroke={s <= r.rating ? "#F5C518" : "rgba(255,255,255,0.15)"} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-white/65 leading-relaxed italic">"{r.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center space-y-3 pt-2 pb-4">
          <button
            onClick={onAdminClick}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mx-auto"
          >
            <ShieldCheck className="w-3.5 h-3.5" />Admin Panel
          </button>
          <p className="text-[11px] text-white/20">Powered by GPT-4o &amp; Claude AI · by Abu Omar EduLexo</p>
        </div>
      </div>
    </div>
  );
}
