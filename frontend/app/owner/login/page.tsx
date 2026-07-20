"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../../../lib/api";
import { useOwnerAuth } from "../../components/OwnerAuthProvider";
import AuthBackdrop from "../../components/AuthBackdrop";

const UNVERIFIED_MESSAGE = "Please verify your email before signing in. Check your inbox for the link.";

export default function OwnerLoginPage() {
  const { login } = useOwnerAuth();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResendState("idle");
    try {
      const res = await api.post<{ access_token: string }>("/owner/login/", {
        email: email.trim().toLowerCase(),
        pin,
      });
      login(res.access_token);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendState("sending");
    try {
      await api.post("/owner/resend-verification", { email: email.trim().toLowerCase() });
    } finally {
      setResendState("sent");
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <AuthBackdrop variant="owner" />
      <div
        className="relative z-10 w-full max-w-xs rounded-3xl p-7 flex flex-col items-center"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)", border: "1.5px solid var(--border)" }}
      >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white text-2xl font-bold mb-6 shadow-md"
        style={{ background: "var(--brand)" }}
      >
        T
      </div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        My Shops
      </h1>
      <p className="text-sm mb-8 text-center" style={{ color: "var(--text-2)" }}>
        Sign in to manage your shops and staff
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium" style={{ color: "var(--text-2)" }}>
              PIN
            </label>
            <a href="/owner/forgot-password" className="text-xs font-medium" style={{ color: "var(--brand)" }}>
              Forgot PIN?
            </a>
          </div>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••"
            required
            className="w-full rounded-xl border px-4 text-xl font-bold outline-none transition-colors tracking-[0.5em]"
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
          <div className="rounded-xl px-4 py-2.5" style={{ background: "var(--danger-light)" }}>
            <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
            {error === UNVERIFIED_MESSAGE && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState !== "idle"}
                className="text-sm font-medium mt-1 disabled:opacity-60"
                style={{ color: "var(--danger)", textDecoration: "underline" }}
              >
                {resendState === "sent" ? "Verification email sent" : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim() || !pin}
          className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--brand)", height: 52 }}
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Sign in
        </button>
      </form>

      <p className="text-xs text-center mt-6" style={{ color: "var(--text-3)" }}>
        Don&apos;t have an account?{" "}
        <a href="/owner/signup" style={{ color: "var(--brand)", fontWeight: 500 }}>
          Create one
        </a>
      </p>

      <p className="text-xs text-center mt-3" style={{ color: "var(--text-3)" }}>
        Staff member?{" "}
        <a href="/login" style={{ color: "var(--brand)", fontWeight: 500 }}>
          Go to staff login
        </a>
      </p>
      </div>
    </div>
  );
}
