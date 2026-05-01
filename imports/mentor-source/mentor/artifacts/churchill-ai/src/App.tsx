import { useState, useEffect, useCallback } from "react";
import Landing from "./pages/Landing";
import Speaking from "./pages/Speaking";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Pending from "./pages/Pending";
import ToolChoice from "./pages/ToolChoice";
import Writing from "./pages/Writing";
import ChurchillModeChoice from "./pages/ChurchillModeChoice";
import FreeConversation from "./pages/FreeConversation";
import ListeningSectionPicker from "./pages/ListeningSectionPicker";
import ListeningTestList from "./pages/ListeningTestList";
import ListeningPlayer from "./pages/ListeningPlayer";
import ListeningResult, { type Attempt, type TestPayload } from "./pages/ListeningResult";
import ListeningHistory from "./pages/ListeningHistory";
import ReadingLevelPicker from "./pages/ReadingLevelPicker";
import ReadingTypePicker, { type ReadingType } from "./pages/ReadingTypePicker";
import ReadingPlayer from "./pages/ReadingPlayer";
import ReadingSummary from "./pages/ReadingSummary";
import { Star, X, Send, Loader2 } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#00B4C8";
const NAVY = "#0A1A30";

export type AppScreen =
  | "loading"
  | "login"
  | "pending"
  | "toolchoice"
  | "churchill-mode"
  | "landing"
  | "speaking"
  | "freechat"
  | "writing"
  | "listening-sections"
  | "listening-tests"
  | "listening-history"
  | "listening-player"
  | "listening-result"
  | "reading-levels"
  | "reading-types"
  | "reading-player"
  | "reading-summary"
  | "admin";

interface User {
  id: number;
  email: string;
  status: string;
  expiresAt: string | null;
}

function LeaveCommentModal({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!text.trim()) { onDone(); return; }
    setSubmitting(true);
    try {
      await fetch(`${BASE_URL}/api/churchill/auth/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() || "Anonymous", text: text.trim(), rating }),
      });
    } catch { /* ignore */ }
    setDone(true);
    setTimeout(onDone, 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,15,30,0.82)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4"
        style={{ background: `linear-gradient(160deg, #0d2035 0%, ${NAVY} 100%)`, border: "1px solid rgba(0,180,200,0.25)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
      >
        <button
          onClick={onDone}
          className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${TEAL}20` }}>
              <Send className="w-5 h-5" style={{ color: TEAL }} />
            </div>
            <p className="text-white font-semibold">Thanks for your feedback!</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Before you go...</h2>
              <p className="text-white/40 text-sm mt-1">How was your practice session? Leave a quick note.</p>
            </div>

            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className="w-7 h-7"
                    fill={(hovered || rating) >= s ? "#F5C518" : "transparent"}
                    stroke={(hovered || rating) >= s ? "#F5C518" : "rgba(255,255,255,0.2)"}
                  />
                </button>
              ))}
            </div>

            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-1 transition"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", focusRingColor: TEAL }}
            />

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Share your thoughts... (optional)"
              rows={3}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none resize-none focus:ring-1 transition"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />

            <div className="flex gap-2">
              <button
                onClick={onDone}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-white/70 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Skip
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${TEAL}, #0096a8)` }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" />Send</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [listeningSection, setListeningSection] = useState<number>(1);
  const [listeningTestId, setListeningTestId] = useState<string | null>(null);
  const [listeningPrefetched, setListeningPrefetched] = useState<{ attempt: Attempt; test: TestPayload } | null>(null);
  const [listeningResultBack, setListeningResultBack] = useState<"listening-tests" | "listening-history">("listening-tests");
  const [readingLevel, setReadingLevel] = useState<"a2" | "b1">("a2");
  const [readingType, setReadingType] = useState<ReadingType>("mcq");
  const [readingItemSlug, setReadingItemSlug] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/churchill/auth/me`, { credentials: "include" });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setScreen(data.user.status === "approved" ? "toolchoice" : "pending");
      } else {
        setUser(null);
        setScreen("login");
      }
    } catch {
      setScreen("login");
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleAuth = (u: User) => {
    setUser(u);
    setScreen(u.status === "approved" ? "toolchoice" : "pending");
  };

  const handleLogout = () => {
    setUser(null);
    setScreen("login");
  };

  const handleBack = () => {
    setShowLeaveModal(true);
  };

  const handleLeaveModalDone = () => {
    setShowLeaveModal(false);
    setScreen("toolchoice");
  };

  const handleFreeBack = () => {
    setScreen("churchill-mode");
  };

  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A1A30" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#00B4C8", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (screen === "admin") {
    return <Admin onBack={() => setScreen("login")} />;
  }

  if (screen === "login") {
    return <Login onAuth={handleAuth} onAdminClick={() => setScreen("admin")} />;
  }

  if (screen === "pending" && user) {
    return <Pending email={user.email} onLogout={handleLogout} />;
  }

  if (screen === "toolchoice") {
    return (
      <ToolChoice
        onChurchill={() => setScreen("churchill-mode")}
        onOrwell={() => setScreen("writing")}
        onAttenborough={() => setScreen("listening-sections")}
        onHemingway={() => setScreen("reading-levels")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
      />
    );
  }

  if (screen === "reading-levels") {
    return (
      <ReadingLevelPicker
        onBack={() => setScreen("toolchoice")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
        onChooseLevel={(lv) => {
          setReadingLevel(lv);
          setScreen("reading-types");
        }}
      />
    );
  }

  if (screen === "reading-types") {
    return (
      <ReadingTypePicker
        level={readingLevel}
        onBack={() => setScreen("reading-levels")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
        onChooseType={(t) => {
          setReadingType(t);
          setReadingItemSlug(null);
          setScreen("reading-player");
        }}
        onSeeSummary={(t) => {
          setReadingType(t);
          setScreen("reading-summary");
        }}
      />
    );
  }

  if (screen === "reading-player") {
    return (
      <ReadingPlayer
        level={readingLevel}
        type={readingType}
        slug={readingItemSlug}
        onBack={() => setScreen("reading-types")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
        onAllDone={() => setScreen("reading-summary")}
      />
    );
  }

  if (screen === "reading-summary") {
    return (
      <ReadingSummary
        level={readingLevel}
        type={readingType}
        onBack={() => setScreen("reading-types")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
        onChooseAnotherType={() => setScreen("reading-types")}
      />
    );
  }

  if (screen === "listening-sections") {
    return (
      <ListeningSectionPicker
        onBack={() => setScreen("toolchoice")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
        onChooseSection={(s) => { setListeningSection(s); setScreen("listening-tests"); }}
        onOpenHistory={() => setScreen("listening-history")}
      />
    );
  }

  if (screen === "listening-history") {
    return (
      <ListeningHistory
        onBack={() => setScreen("listening-sections")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
        onOpenAttempt={(id) => {
          setListeningTestId(id);
          setListeningPrefetched(null);
          setListeningResultBack("listening-history");
          setScreen("listening-result");
        }}
      />
    );
  }

  if (screen === "listening-tests") {
    return (
      <ListeningTestList
        sectionId={listeningSection}
        onBack={() => setScreen("listening-sections")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
        onChooseTest={(id, mode) => {
          setListeningTestId(id);
          setListeningPrefetched(null);
          setListeningResultBack("listening-tests");
          setScreen(mode === "review" ? "listening-result" : "listening-player");
        }}
      />
    );
  }

  if (screen === "listening-player" && listeningTestId) {
    return (
      <ListeningPlayer
        testId={listeningTestId}
        onBack={() => setScreen("listening-tests")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
        onSubmitted={(attempt, test) => {
          setListeningPrefetched({ attempt, test });
          setScreen("listening-result");
        }}
      />
    );
  }

  if (screen === "listening-result" && listeningTestId) {
    return (
      <ListeningResult
        testId={listeningTestId}
        prefetched={listeningPrefetched}
        onBack={() => setScreen(listeningResultBack)}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
        onChooseAnotherTest={() => {
          setListeningPrefetched(null);
          setListeningTestId(null);
          setScreen(listeningResultBack);
        }}
      />
    );
  }

  if (screen === "churchill-mode") {
    return (
      <ChurchillModeChoice
        onIelts={() => setScreen("landing")}
        onFree={() => setScreen("freechat")}
        onBack={() => setScreen("toolchoice")}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
      />
    );
  }

  if (screen === "freechat") {
    return (
      <FreeConversation
        onBack={handleFreeBack}
        onLogout={handleLogout}
        expiresAt={user?.expiresAt ?? null}
      />
    );
  }

  if (screen === "speaking") {
    return (
      <>
        <Speaking onBack={handleBack} expiresAt={user?.expiresAt ?? null} />
        {showLeaveModal && <LeaveCommentModal onDone={handleLeaveModalDone} />}
      </>
    );
  }

  if (screen === "writing") {
    return (
      <>
        <Writing onBack={handleBack} expiresAt={user?.expiresAt ?? null} />
        {showLeaveModal && <LeaveCommentModal onDone={handleLeaveModalDone} />}
      </>
    );
  }

  return <Landing onStart={() => setScreen("speaking")} onLogout={handleLogout} expiresAt={user?.expiresAt ?? null} />;
}
