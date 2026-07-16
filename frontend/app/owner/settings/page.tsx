"use client";

import { useEffect, useState } from "react";
import { Loader2, User, Lock, CheckCircle } from "lucide-react";
import { useOwnerAuth } from "../../components/OwnerAuthProvider";
import { ownerRequest, useOwnerApi } from "../shared";

interface MeResponse {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

const inputStyle = {
  borderColor: "var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  height: 46,
};

export default function OwnerSettingsPage() {
  const { token, login } = useOwnerAuth();
  const { data: me, isLoading: loading, mutate: mutateMe } = useOwnerApi<MeResponse>("/owner/me", token);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinSaved, setPinSaved] = useState(false);

  useEffect(() => {
    if (me) {
      setName(me.name);
      setEmail(me.email);
    }
  }, [me]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    setProfileError("");
    setProfileSaved(false);
    try {
      const res = await ownerRequest<{ access_token: string; name: string; email: string }>(
        "/owner/me", token, { method: "PATCH", body: JSON.stringify({ name, email }) },
      );
      login(res.access_token);
      mutateMe((prev) => prev ? { ...prev, name: res.name, email: res.email } : prev, { revalidate: false });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: unknown) {
      setProfileError((err as Error).message ?? "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("PINs don't match");
      return;
    }
    setSavingPin(true);
    setPinError("");
    setPinSaved(false);
    try {
      const res = await ownerRequest<{ access_token: string }>(
        "/owner/me", token, { method: "PATCH", body: JSON.stringify({ pin }) },
      );
      login(res.access_token);
      setPin("");
      setConfirmPin("");
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 2500);
    } catch (err: unknown) {
      setPinError((err as Error).message ?? "Could not update PIN");
    } finally {
      setSavingPin(false);
    }
  }

  if (loading || !me) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
      </div>
    );
  }

  return (
    <main className="w-full px-4 py-6 lg:px-10 lg:py-10 flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
          Manage your account details and login PIN.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* Profile */}
      <form
        onSubmit={saveProfile}
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
          >
            <User size={16} />
          </div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Profile</h2>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border px-3 text-sm outline-none"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border px-3 text-sm outline-none"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {profileError && (
          <p className="text-sm rounded-xl px-4 py-2.5" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            {profileError}
          </p>
        )}

        <button
          type="submit"
          disabled={savingProfile || !name.trim() || !email.trim()}
          className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: profileSaved ? "var(--brand-dark)" : "var(--brand)" }}
        >
          {savingProfile && <Loader2 size={15} className="animate-spin" />}
          {profileSaved && <CheckCircle size={15} />}
          {profileSaved ? "Saved" : "Save changes"}
        </button>
      </form>

      {/* PIN */}
      <form
        onSubmit={savePin}
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
          >
            <Lock size={16} />
          </div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Login PIN</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••"
              className="w-full rounded-xl border px-3 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••"
              className="w-full rounded-xl border px-3 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        </div>

        {pinError && (
          <p className="text-sm rounded-xl px-4 py-2.5" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            {pinError}
          </p>
        )}

        <button
          type="submit"
          disabled={savingPin || !pin || !confirmPin}
          className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: pinSaved ? "var(--brand-dark)" : "var(--brand)" }}
        >
          {savingPin && <Loader2 size={15} className="animate-spin" />}
          {pinSaved && <CheckCircle size={15} />}
          {pinSaved ? "Saved" : "Update PIN"}
        </button>
      </form>

      </div>
    </main>
  );
}
