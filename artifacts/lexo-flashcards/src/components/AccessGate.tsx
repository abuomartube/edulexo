import { useEffect, useState, type ReactNode } from "react";
import { Lock, LogIn, Sparkles } from "lucide-react";

type GateState =
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "signin" }
  | { kind: "no-plan" }
  | { kind: "error"; message: string };

const ENGLISH_HOME = "/lexo/";
const TOOLS_HOME = "/lexo/tools";

export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/levels", { credentials: "same-origin" });
        if (cancelled) return;
        if (res.status === 401) {
          setState({ kind: "signin" });
          return;
        }
        if (res.status === 403) {
          setState({ kind: "no-plan" });
          return;
        }
        if (!res.ok) {
          setState({
            kind: "error",
            message: `Unable to load flashcards (HTTP ${res.status})`,
          });
          return;
        }
        setState({ kind: "ok" });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Network error",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a14] text-white">
        <div className="animate-pulse text-sm text-white/60">Loading…</div>
      </div>
    );
  }

  if (state.kind === "ok") return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a14] via-[#0f0f1f] to-[#0a0a14] text-white p-6">
      <div className="max-w-md w-full bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
        {state.kind === "signin" && (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-violet-500/20 flex items-center justify-center mb-4">
              <LogIn className="w-7 h-7 text-violet-300" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sign in required</h2>
            <p className="text-white/70 text-sm mb-6">
              Please sign in to your LEXO English account to use the flashcards.
            </p>
            <a
              href={ENGLISH_HOME}
              className="inline-block px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-400 hover:to-blue-400 transition font-medium"
            >
              Go to LEXO English
            </a>
          </>
        )}
        {state.kind === "no-plan" && (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-amber-300" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No active plan</h2>
            <p className="text-white/70 text-sm mb-2">
              Flashcards are unlocked by your English course tier:
            </p>
            <ul className="text-left text-sm text-white/80 mb-6 space-y-1.5 bg-black/20 rounded-lg p-4">
              <li>
                <span className="font-medium text-emerald-300">Beginner</span> —
                A1, A2, B1
              </li>
              <li>
                <span className="font-medium text-amber-300">Intermediate</span>{" "}
                — B1, B2, C1
              </li>
              <li>
                <span className="font-medium text-violet-300">
                  Complete (Advanced)
                </span>{" "}
                — All 5 levels (A1–C1)
              </li>
            </ul>
            <a
              href={TOOLS_HOME}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-400 hover:to-blue-400 transition font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Browse English plans
            </a>
          </>
        )}
        {state.kind === "error" && (
          <>
            <h2 className="text-xl font-semibold mb-2">
              Couldn't load flashcards
            </h2>
            <p className="text-white/70 text-sm mb-6">{state.message}</p>
            <button
              onClick={() => location.reload()}
              className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 transition font-medium"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
