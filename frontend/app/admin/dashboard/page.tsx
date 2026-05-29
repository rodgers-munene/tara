"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, CheckCircle, XCircle, LogOut, Users } from "lucide-react";
import { useAdminAuth } from "../../components/AdminAuthProvider";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function adminRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface Owner {
  id: number;
  name: string;
  email: string;
  active: boolean;
  shop_count: number;
  created_at: string;
}

interface PlatformStats {
  total_owners: number;
  active_owners: number;
  total_shops: number;
  total_sales: number;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}

function CreateOwnerModal({
  token,
  onCreated,
  onClose,
}: {
  token: string;
  onCreated: (owner: Owner) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", pin: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.pin.length < 4) {
      setError("Name, email, and 4-digit PIN are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const owner = await adminRequest<Owner>("/admin/owners/", token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          pin: form.pin,
        }),
      });
      onCreated(owner);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to create owner");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    height: 48,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>New owner account</h2>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {[
            { label: "Owner name *", key: "name", placeholder: "Grace Wanjiku", type: "text" },
            { label: "Email *", key: "email", placeholder: "grace@example.com", type: "email" },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => set(key as keyof typeof form, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border px-3 text-sm outline-none"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>
              PIN * (4 digits — owner uses this to log in)
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={form.pin}
              onChange={(e) => set("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••"
              className="w-full rounded-xl border px-3 text-sm outline-none tracking-widest font-bold"
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
            disabled={saving}
            className="w-full rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
            style={{ background: "var(--brand)", height: 48 }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { admin, token, logout } = useAdminAuth();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  async function load() {
    if (!token) return;
    try {
      const [o, st] = await Promise.all([
        adminRequest<Owner[]>("/admin/owners/", token),
        adminRequest<PlatformStats>("/admin/stats", token),
      ]);
      setOwners(o);
      setStats(st);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function toggleActive(owner: Owner) {
    if (!token) return;
    setToggling(owner.id);
    try {
      await adminRequest(`/admin/owners/${owner.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ active: !owner.active }),
      });
      setOwners((prev) => prev.map((o) => o.id === owner.id ? { ...o, active: !o.active } : o));
    } finally {
      setToggling(null);
    }
  }

  if (!admin) return null;

  return (
    <div className="min-h-svh" style={{ background: "var(--bg)" }}>
      {/* Topbar */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-5 h-14 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-sm font-bold"
          style={{ background: "var(--brand)" }}
        >
          T
        </div>
        <span className="font-semibold text-sm flex-1" style={{ color: "var(--text)" }}>
          Business Hub
        </span>
        <span className="text-xs mr-2 hidden sm:block" style={{ color: "var(--text-3)" }}>
          {admin.name}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
        >
          <LogOut size={13} /> Sign out
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Owners" value={stats.total_owners} />
            <StatCard label="Active" value={stats.active_owners} />
            <StatCard label="Total shops" value={stats.total_shops} />
            <StatCard label="Total sales" value={stats.total_sales.toLocaleString()} />
          </div>
        )}

        {/* Owners list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Owner accounts</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl text-white"
              style={{ background: "var(--brand)" }}
            >
              <Plus size={15} /> New owner
            </button>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
            </div>
          ) : owners.length === 0 ? (
            <div
              className="rounded-2xl p-8 flex flex-col items-center gap-3"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
            >
              <Users size={36} strokeWidth={1} style={{ color: "var(--text-3)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
                No owner accounts yet — create the first one
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {owners.map((owner) => (
                <div
                  key={owner.id}
                  className="rounded-2xl p-4 flex items-center gap-4"
                  style={{
                    background: "var(--surface)",
                    border: "1.5px solid var(--border)",
                    opacity: owner.active ? 1 : 0.6,
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
                  >
                    {owner.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{owner.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{owner.email}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                      {owner.shop_count} {owner.shop_count === 1 ? "shop" : "shops"}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleActive(owner)}
                    disabled={toggling === owner.id}
                    className="flex items-center gap-1 text-xs font-medium shrink-0"
                    style={{ color: owner.active ? "var(--brand)" : "var(--text-3)" }}
                  >
                    {toggling === owner.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : owner.active ? (
                      <CheckCircle size={13} />
                    ) : (
                      <XCircle size={13} />
                    )}
                    {owner.active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreate && token && (
        <CreateOwnerModal
          token={token}
          onCreated={(owner) => {
            setOwners((prev) => [owner, ...prev]);
            setStats((prev) => prev
              ? { ...prev, total_owners: prev.total_owners + 1, active_owners: prev.active_owners + 1 }
              : prev
            );
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
