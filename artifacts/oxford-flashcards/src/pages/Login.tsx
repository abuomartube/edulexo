import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/lib/auth-context";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      // Redirect handled by isAuthenticated effect above.
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      const data = (err as { data?: { error?: string } } | null)?.data;
      setError(data?.error ?? message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your learning journey."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">
            Create an account
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
            className={inputCls}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
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
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Log in
        </button>
      </form>
    </AuthShell>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition";
