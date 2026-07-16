"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../../lib/api";
import AuthBackdrop from "../../components/AuthBackdrop";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    height: 52,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== confirm) {
      setError("PINs do not match.");
      return;
    }
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/owner/reset-password", { token, pin });
      setDone(true);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
          style={{ background: "var(--danger-light)" }}
        >
          <XCircle size={26} style={{ color: "var(--danger)" }} />
        </div>
        <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--text)" }}>
          Invalid link
        </h1>
        <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>
          This reset link is missing its token. Request a new one below.
        </p>
        <a
          href="/owner/forgot-password"
          className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center mt-7"
          style={{ background: "var(--brand)", height: 52 }}
        >
          Request new link
        </a>
      </>
    );
  }

  if (done) {
    return (
      <>
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
          style={{ background: "var(--brand-light)" }}
        >
          <CheckCircle2 size={26} style={{ color: "var(--brand)" }} />
        </div>
        <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--text)" }}>
          PIN reset
        </h1>
        <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>
          Your PIN has been updated. You can now sign in with it.
        </p>
        <a
          href="/owner/login"
          className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center mt-7"
          style={{ background: "var(--brand)", height: 52 }}
        >
          Sign in
        </a>
      </>
    );
  }

  return (
    <>
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
        style={{ background: "var(--brand)" }}
      >
        <KeyRound size={24} className="text-white" />
      </div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        Set a new PIN
      </h1>
      <p className="text-sm mb-8 text-center" style={{ color: "var(--text-2)" }}>
        Choose a new PIN for your account
      </p>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            New PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••"
            autoFocus
            required
            className="w-full rounded-xl border px-4 text-xl font-bold outline-none transition-colors tracking-[0.5em]"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            Confirm new PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••"
            required
            className="w-full rounded-xl border px-4 text-xl font-bold outline-none transition-colors tracking-[0.5em]"
            style={inputStyle}
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
          disabled={loading || !pin || !confirm}
          className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--brand)", height: 52 }}
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Reset PIN
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <AuthBackdrop variant="owner" />
      <div
        className="relative z-10 w-full max-w-xs rounded-3xl p-7 flex flex-col items-center"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)", border: "1.5px solid var(--border)" }}
      >
        <Suspense fallback={<Loader2 size={24} className="animate-spin my-10" style={{ color: "var(--brand)" }} />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
