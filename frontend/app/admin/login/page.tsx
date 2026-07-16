"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../../../lib/api";
import { useAdminAuth } from "../../components/AdminAuthProvider";
import AuthBackdrop from "../../components/AuthBackdrop";

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ access_token: string }>("/admin/login/", {
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

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <AuthBackdrop variant="admin" />
      <div
        className="relative z-10 w-full max-w-xs rounded-3xl p-7 flex flex-col items-center"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)", border: "1.5px solid var(--border)" }}
      >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white text-2xl font-bold mb-6 shadow-md"
        style={{ background: "var(--admin-ink)" }}
      >
        T
      </div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        Business Hub
      </h1>
      <p className="text-sm mb-8 text-center" style={{ color: "var(--text-2)" }}>
        Tara POS platform management
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
            placeholder="admin@example.com"
            autoFocus
            required
            className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              height: 52,
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--admin-ink)")}
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
            onFocus={(e) => (e.target.style.borderColor = "var(--admin-ink)")}
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
          disabled={loading || !email.trim() || !pin}
          className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--admin-ink)", height: 52 }}
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Sign in
        </button>
      </form>

      <div className="w-full mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-3)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>
        <a
          href="/admin/setup"
          className="w-full rounded-xl font-semibold text-sm flex items-center justify-center border-2 transition-colors"
          style={{
            height: 52,
            borderColor: "var(--admin-ink)",
            color: "var(--admin-ink)",
            background: "transparent",
          }}
        >
          Create admin account
        </a>
      </div>

      <p className="text-xs text-center mt-6" style={{ color: "var(--text-3)" }}>
        Staff member?{" "}
        <a href="/login" style={{ color: "var(--brand)", fontWeight: 500 }}>
          Go to staff login
        </a>
      </p>
      </div>
    </div>
  );
}
