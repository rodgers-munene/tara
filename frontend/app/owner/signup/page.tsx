"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "../../../lib/api";
import AuthBackdrop from "../../components/AuthBackdrop";

function SignupForm() {
  const searchParams = useSearchParams();

  const [form, setForm] = useState(() => ({
    name: "",
    email: "",
    pin: "",
    confirm: "",
    referralCode: searchParams.get("ref")?.trim() || "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.pin !== form.confirm) {
      setError("PINs do not match.");
      return;
    }
    if (form.pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/owner/signup/", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        pin: form.pin,
        referral_code: form.referralCode.trim() || null,
      });
      setDone(true);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center px-6 py-12">
        <AuthBackdrop variant="owner" />
        <div
          className="relative z-10 w-full max-w-xs rounded-3xl p-7 flex flex-col items-center text-center"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)", border: "1.5px solid var(--border)" }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
            style={{ background: "var(--brand-light)" }}
          >
            <CheckCircle2 size={26} style={{ color: "var(--brand)" }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
            Check your email
          </h1>
          <p className="text-sm max-w-xs" style={{ color: "var(--text-2)" }}>
            We&apos;ve sent a verification link to {form.email.trim()}. Click it to verify your
            account before signing in.
          </p>
        </div>
      </div>
    );
  }

  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    height: 52,
  };

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
        Create your account
      </h1>
      <p className="text-sm mb-8 text-center" style={{ color: "var(--text-2)" }}>
        Manage all your shops in one place
      </p>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            Your name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Grace Wanjiku"
            autoFocus
            required
            className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="grace@example.com"
            required
            className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={form.pin}
            onChange={(e) => set("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••"
            required
            className="w-full rounded-xl border px-4 text-xl font-bold outline-none transition-colors tracking-[0.5em]"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            Confirm PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••"
            required
            className="w-full rounded-xl border px-4 text-xl font-bold outline-none transition-colors tracking-[0.5em]"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            Referral code <span style={{ color: "var(--text-3)" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={form.referralCode}
            onChange={(e) => set("referralCode", e.target.value)}
            placeholder="e.g. AGENT123"
            className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {error && (
          <p
            className="text-sm rounded-xl px-4 py-2.5"
            style={{ background: "var(--danger-light)", color: "var(--danger)" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !form.name.trim() || !form.email.trim() || !form.pin || !form.confirm}
          className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--brand)", height: 52 }}
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Create account
        </button>
      </form>

      <p className="text-xs text-center mt-8" style={{ color: "var(--text-3)" }}>
        Already have an account?{" "}
        <a href="/owner/login" style={{ color: "var(--brand)", fontWeight: 500 }}>
          Sign in
        </a>
      </p>
      </div>
    </div>
  );
}

export default function OwnerSignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
