import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Loader2, MailCheck } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/lib/auth-context";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Check your inbox">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <MailCheck size={26} />
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            If <strong>{email}</strong> is registered, we just sent a password-reset link to that address.
            The link expires in 60 minutes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md"
          >
            Back to log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we’ll send you a link to choose a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500"
            placeholder="you@example.com"
          />
        </div>
        {error && (
          <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2 border border-rose-200 dark:border-rose-900/40">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Send reset link
        </button>
      </form>
    </AuthShell>
  );
}
