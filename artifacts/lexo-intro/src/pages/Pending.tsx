import { Clock, LogOut } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#6B2FE6";
const YELLOW = "#F5C518";
const NAVY = "#1E2155";

interface Props {
  email: string;
  onLogout: () => void;
}

export default function Pending({ email, onLogout }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: `linear-gradient(160deg, #071422 0%, ${NAVY} 40%, #0C2040 100%)` }}
    >
      <div className="text-center max-w-sm space-y-6">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"
          style={{ background: `rgba(245,197,24,0.12)`, border: `2px solid rgba(245,197,24,0.25)` }}
        >
          <Clock className="w-10 h-10" style={{ color: YELLOW }} />
        </div>

        <div>
          <h2 className="text-xl font-black text-white mb-2">Waiting for Approval</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-3">
            Your account <span className="font-semibold" style={{ color: TEAL }}>{email}</span> is
            pending approval by the administrator.
          </p>
          <p className="text-sm font-semibold italic" style={{ color: YELLOW }}>
            Be patient, your acceptance is on the way
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={async () => {
              await fetch(`${BASE_URL}/api-intro/auth/logout`, { method: "POST", credentials: "include" });
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white/50 hover:text-white/70 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
