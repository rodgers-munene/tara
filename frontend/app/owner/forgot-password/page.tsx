"use client";

import { useState } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { api } from "../../../lib/api";
import AuthBackdrop from "../../components/AuthBackdrop";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/owner/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <AuthBackdrop variant="owner" />
      <div
        className="relative z-10 w-full max-w-xs rounded-3xl p-7 flex flex-col items-center"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)", border: "1.5px solid var(--border)" }}
      >
        {sent ? (
          <>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
              style={{ background: "var(--brand-light)" }}
            >
              <CheckCircle2 size={26} style={{ color: "var(--brand)" }} />
            </div>
            <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--text)" }}>
              Check your email
            </h1>
            <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>
              If an account exists for <span style={{ color: "var(--text)" }}>{email}</span>, we&apos;ve sent a link to reset your PIN. It expires in 30 minutes.
            </p>
            <a
              href="/owner/login"
              className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center mt-7"
              style={{ background: "var(--brand)", height: 52 }}
            >
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
              style={{ background: "var(--brand)" }}
            >
              <Mail size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
              Forgot your PIN?
            </h1>
            <p className="text-sm mb-8 text-center" style={{ color: "var(--text-2)" }}>
              Enter your email and we&apos;ll send you a reset link
            </p>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="grace@example.com"
                  autoFocus
                  required
                  className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    height: 52,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              {error && (
                <p className="text-sm rounded-xl px-4 py-2.5"
                  style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "var(--brand)", height: 52 }}
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                Send reset link
              </button>
            </form>

            <p className="text-xs text-center mt-6" style={{ color: "var(--text-3)" }}>
              Remembered it?{" "}
              <a href="/owner/login" style={{ color: "var(--brand)", fontWeight: 500 }}>
                Back to sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
