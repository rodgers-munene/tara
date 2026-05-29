"use client";

import { useState, useEffect } from "react";
import {
  Loader2, Plus, Store, X, ChevronDown, ChevronUp,
  Users, LogOut, Trash2, CheckCircle, XCircle, UserPlus,
} from "lucide-react";
import { useOwnerAuth } from "../../components/OwnerAuthProvider";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function ownerRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
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

interface Shop {
  id: number;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  staff_count: number;
  manager_id?: number;
  created_at: string;
}

interface StaffMember {
  id: number;
  name: string;
  role: string;
}

interface OwnerStats {
  total_shops: number;
  active_shops: number;
  total_staff: number;
  total_sales: number;
}

// ── Create shop modal ─────────────────────────────────────────────────────────

function CreateShopModal({
  token,
  onCreated,
  onClose,
}: {
  token: string;
  onCreated: (shop: Shop) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", plan: "free", owner_name: "", owner_pin: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.owner_name.trim() || form.owner_pin.length < 4) {
      setError("Shop name, manager name, and 4-digit PIN are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const shop = await ownerRequest<Shop>("/owner/shops/", token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          plan: form.plan,
          owner_name: form.owner_name.trim(),
          owner_pin: form.owner_pin,
        }),
      });
      onCreated(shop);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to create shop");
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
        className="w-full max-w-md rounded-3xl p-6 flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>New shop</h2>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
            Shop details
          </p>

          {[
            { label: "Shop name *", key: "name", placeholder: "Mama Grace Shop", type: "text" },
            { label: "Email", key: "email", placeholder: "grace@example.com", type: "email" },
            { label: "Phone", key: "phone", placeholder: "+254 700 000 000", type: "tel" },
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
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>Plan</label>
            <select
              value={form.plan}
              onChange={(e) => set("plan", e.target.value)}
              className="w-full rounded-xl border px-3 text-sm outline-none"
              style={inputStyle}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide mt-1" style={{ color: "var(--text-3)" }}>
            Shop manager (POS login)
          </p>

          {[
            { label: "Manager name *", key: "owner_name", placeholder: "Grace Wanjiku", type: "text" },
            { label: "Manager PIN * (4 digits)", key: "owner_pin", placeholder: "••••", type: "password" },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => {
                  const val = key === "owner_pin"
                    ? e.target.value.replace(/\D/g, "").slice(0, 4)
                    : e.target.value;
                  set(key as keyof typeof form, val);
                }}
                placeholder={placeholder}
                inputMode={key === "owner_pin" ? "numeric" : undefined}
                className="w-full rounded-xl border px-3 text-sm outline-none"
                style={inputStyle}
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
            disabled={saving}
            className="w-full rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
            style={{ background: "var(--brand)", height: 48 }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Create shop
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Staff panel ───────────────────────────────────────────────────────────────

function StaffPanel({
  shop,
  token,
  onClose,
}: {
  shop: Shop;
  token: string;
  onClose: () => void;
}) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", pin: "", role: "cashier" });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadStaff() {
    try {
      const data = await ownerRequest<StaffMember[]>(`/owner/shops/${shop.id}/staff`, token);
      setStaff(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStaff(); }, []);

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.pin.length < 4) {
      setError("Name and 4-digit PIN required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const s = await ownerRequest<StaffMember>(`/owner/shops/${shop.id}/staff`, token, {
        method: "POST",
        body: JSON.stringify({ name: form.name.trim(), pin: form.pin, role: form.role }),
      });
      setStaff((prev) => [...prev, s]);
      setForm({ name: "", pin: "", role: "cashier" });
      setShowAdd(false);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to add staff");
    } finally {
      setSaving(false);
    }
  }

  async function removeStaff(id: number) {
    setRemoving(id);
    try {
      await ownerRequest(`/owner/shops/${shop.id}/staff/${id}`, token, { method: "DELETE" });
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setRemoving(null);
    }
  }

  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    height: 44,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl flex flex-col"
        style={{
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          maxHeight: "85svh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="font-bold" style={{ color: "var(--text)" }}>{shop.name}</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Staff management</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><X size={20} /></button>
        </div>

        {/* Staff list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--brand)" }} />
            </div>
          ) : staff.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-3)" }}>
              No staff yet
            </p>
          ) : (
            staff.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-2xl p-3"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{s.name}</p>
                  <p className="text-xs capitalize" style={{ color: "var(--text-3)" }}>
                    {s.role} · ID: <span className="font-mono font-bold">{s.id}</span>
                  </p>
                </div>
                {removing === s.id ? (
                  <Loader2 size={15} className="animate-spin shrink-0" style={{ color: "var(--text-3)" }} />
                ) : (
                  <button
                    onClick={() => removeStaff(s.id)}
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                    style={{ color: "var(--text-3)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add staff */}
        <div className="px-6 pb-6 pt-2 shrink-0 border-t" style={{ borderColor: "var(--border)" }}>
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
              style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
            >
              <UserPlus size={15} /> Add staff member
            </button>
          ) : (
            <form onSubmit={addStaff} className="flex flex-col gap-2.5 pt-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Name"
                    className="w-full rounded-xl border px-3 text-sm outline-none"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
                <div style={{ width: 90 }}>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={form.pin}
                    onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    placeholder="PIN"
                    className="w-full rounded-xl border px-3 text-sm outline-none text-center tracking-widest font-bold"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              </div>

              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-xl border px-3 text-sm outline-none"
                style={inputStyle}
              >
                <option value="cashier">Cashier</option>
                <option value="owner">Manager</option>
              </select>

              {error && (
                <p className="text-xs rounded-xl px-3 py-2"
                  style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setError(""); }}
                  className="flex-1 rounded-xl text-sm font-medium py-2.5"
                  style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
                  style={{ background: "var(--brand)" }}
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  Add
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shop card ─────────────────────────────────────────────────────────────────

function ShopCard({
  shop,
  token,
  onToggleActive,
  onManageStaff,
  toggling,
}: {
  shop: Shop;
  token: string;
  onToggleActive: (shop: Shop) => void;
  onManageStaff: (shop: Shop) => void;
  toggling: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--border)",
        opacity: shop.active ? 1 : 0.6,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
          style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
        >
          {shop.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold" style={{ color: "var(--text)" }}>{shop.name}</p>
          <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-3)" }}>{shop.slug}</p>
        </div>
        <span
          className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{
            background: shop.plan === "pro" ? "var(--brand-light)" : "var(--surface-2)",
            color: shop.plan === "pro" ? "var(--brand-dark)" : "var(--text-3)",
          }}
        >
          {shop.plan}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Users size={13} style={{ color: "var(--text-3)" }} />
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            {shop.staff_count} staff
          </span>
        </div>
        <button
          onClick={() => onToggleActive(shop)}
          disabled={toggling}
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: shop.active ? "var(--brand)" : "var(--text-3)" }}
        >
          {toggling ? (
            <Loader2 size={12} className="animate-spin" />
          ) : shop.active ? (
            <CheckCircle size={13} />
          ) : (
            <XCircle size={13} />
          )}
          {shop.active ? "Active" : "Inactive"}
        </button>
      </div>

      <button
        onClick={() => onManageStaff(shop)}
        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold w-full"
        style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
      >
        <Users size={14} /> Manage staff
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const { owner, token, logout } = useOwnerAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [staffShop, setStaffShop] = useState<Shop | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  async function load() {
    if (!token) return;
    try {
      const [s, st] = await Promise.all([
        ownerRequest<Shop[]>("/owner/shops/", token),
        ownerRequest<OwnerStats>("/owner/stats", token),
      ]);
      setShops(s);
      setStats(st);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function toggleActive(shop: Shop) {
    if (!token) return;
    setToggling(shop.id);
    try {
      await ownerRequest(`/owner/shops/${shop.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ active: !shop.active }),
      });
      setShops((prev) => prev.map((s) => s.id === shop.id ? { ...s, active: !s.active } : s));
    } finally {
      setToggling(null);
    }
  }

  if (!owner) return null;

  return (
    <div className="min-h-svh" style={{ background: "var(--bg)" }}>
      {/* Header */}
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
          My Shops
        </span>
        <span className="text-xs mr-2 hidden sm:block" style={{ color: "var(--text-3)" }}>
          {owner.name}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
        >
          <LogOut size={13} /> Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Shops", value: stats.total_shops },
              { label: "Active", value: stats.active_shops },
              { label: "Staff", value: stats.total_staff },
              { label: "Total sales", value: stats.total_sales.toLocaleString() },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl p-4 flex flex-col gap-1"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                  {label}
                </p>
                <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Shops */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Your shops</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl text-white"
              style={{ background: "var(--brand)" }}
            >
              <Plus size={15} /> New shop
            </button>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
            </div>
          ) : shops.length === 0 ? (
            <div
              className="rounded-2xl p-10 flex flex-col items-center gap-4"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
            >
              <Store size={40} strokeWidth={1} style={{ color: "var(--text-3)" }} />
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No shops yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                  Create your first shop to get started
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--brand)" }}
              >
                <Plus size={15} /> Create first shop
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {shops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  token={token!}
                  onToggleActive={toggleActive}
                  onManageStaff={setStaffShop}
                  toggling={toggling === shop.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreate && token && (
        <CreateShopModal
          token={token}
          onCreated={(shop) => {
            setShops((prev) => [shop, ...prev]);
            setStats((prev) => prev
              ? { ...prev, total_shops: prev.total_shops + 1, active_shops: prev.active_shops + 1, total_staff: prev.total_staff + 1 }
              : prev
            );
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {staffShop && token && (
        <StaffPanel
          shop={staffShop}
          token={token}
          onClose={() => setStaffShop(null)}
        />
      )}
    </div>
  );
}
