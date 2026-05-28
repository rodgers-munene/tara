"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { api } from "../../../lib/api";

export default function AdminSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", pin: "", confirmPin: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.pin.length < 4) {
      setError("All fields are required. PIN must be at least 4 digits.");
      return;
    }
    if (form.pin !== form.confirmPin) {
      setError("PINs don't match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/admin/setup", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        pin: form.pin,
      });
      setDone(true);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-5 px-6"
        style={{ background: "var(--bg)" }}>
        <div className="pop-in flex flex-col items-center gap-4">
          <CheckCircle2 size={64} strokeWidth={1.5} style={{ color: "var(--brand)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>Admin account created!</p>
          <p className="text-sm text-center" style={{ color: "var(--text-3)" }}>
            You can now sign in to the admin console.
          </p>
          <button
            onClick={() => router.push("/admin/login")}
            className="mt-2 rounded-xl font-semibold text-base text-white px-8"
            style={{ background: "var(--brand)", height: 52 }}
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center px-6 py-12"
      style={{ background: "var(--bg)" }}
    >
      <a
        href="/admin/login"
        className="flex items-center gap-1.5 text-sm font-medium mb-8 self-start"
        style={{ color: "var(--text-2)" }}
      >
        <ArrowLeft size={15} /> Back to sign in
      </a>

      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white text-2xl font-bold mb-6 shadow-md"
        style={{ background: "var(--brand)" }}
      >
        T
      </div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        Admin Setup
      </h1>
      <p className="text-sm mb-8 text-center" style={{ color: "var(--text-2)" }}>
        Create the platform administrator account
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
        {[
          { label: "Your name", key: "name", type: "text", placeholder: "Platform Admin" },
          { label: "Email", key: "email", type: "email", placeholder: "admin@tara.app" },
          { label: "PIN (4+ digits)", key: "pin", type: "password", placeholder: "••••" },
          { label: "Confirm PIN", key: "confirmPin", type: "password", placeholder: "••••" },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
              {label}
            </label>
            <input
              type={type}
              value={form[key as keyof typeof form]}
              onChange={(e) => set(
                key as keyof typeof form,
                key === "pin" || key === "confirmPin"
                  ? e.target.value.replace(/\D/g, "").slice(0, 6)
                  : e.target.value
              )}
              placeholder={placeholder}
              inputMode={key === "pin" || key === "confirmPin" ? "numeric" : undefined}
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
        ))}

        {error && (
          <p className="text-sm rounded-xl px-4 py-2.5"
            style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--brand)", height: 52 }}
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Create admin account
        </button>
      </form>
    </div>
  );
}
