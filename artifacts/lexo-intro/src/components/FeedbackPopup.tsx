import { useState } from "react";
import { X, Send, Loader2, CheckCircle, MessageSquareHeart } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#6B2FE6";
const NAVY = "#1E2155";

interface Props {
  tool: "speaking" | "writing";
  onClose: () => void;
}

export default function FeedbackPopup({ tool, onClose }: Props) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch(`${BASE_URL}/api-intro/auth/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tool, message: message.trim() }),
      });
      setSent(true);
      setTimeout(onClose, 1500);
    } catch {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 relative"
        style={{ background: NAVY, border: "1px solid rgba(107,47,230,0.25)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors">
          <X className="w-5 h-5" />
        </button>

        {sent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="w-12 h-12 mx-auto" style={{ color: "#1DB954" }} />
            <p className="text-white font-bold text-lg">Thank you!</p>
            <p className="text-white/50 text-sm">Your feedback helps us improve.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgba(107,47,230,0.15)` }}>
                <MessageSquareHeart className="w-5 h-5" style={{ color: TEAL }} />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">How was your session?</h3>
                <p className="text-white/40 text-xs">Help us improve {tool === "speaking" ? "Churchill" : "Orwell"} AI</p>
              </div>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your experience, suggestions, or any issues you faced..."
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", focusRingColor: TEAL } as any}
            />

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50 transition-colors hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || sending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
