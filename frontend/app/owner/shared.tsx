"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Loader2, X, Trash2, UserPlus, KeyRound } from "lucide-react";

export const BASE = "/api";

export async function ownerRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
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

// Cached GET for owner pages, gated on the auth token being ready. Shares the
// SWR cache across owner pages so revisiting a shop/dashboard is instant.
export function useOwnerApi<T>(path: string | null, token: string | null) {
  return useSWR<T>(
    token && path ? path : null,
    () => ownerRequest<T>(path as string, token as string),
  );
}

export function invalidateOwnerApi(prefix: string) {
  return globalMutate((key) => typeof key === "string" && key.startsWith(prefix));
}

// Switches this device into the shop's till as its manager, then hard-navigates
// to /sell — a full navigation is required because AuthProvider only reads
// tara_token from localStorage in a mount-time effect.
export async function jumpToSell(shopId: number, token: string) {
  const { access_token } = await ownerRequest<{ access_token: string }>(
    `/owner/shops/${shopId}/sell-token`,
    token,
    { method: "POST" },
  );
  localStorage.setItem("tara_token", access_token);
  window.location.href = "/sell";
}

export interface Shop {
  id: number;
  name: string;
  slug: string;
  plan: string;
  billing_cycle: string | null;
  active: boolean;
  trial_ends_at: string | null;
  subscription_status: string;
  subscription_ends_at: string | null;
  staff_count: number;
  total_staff_count: number;
  max_staff: number;
  today_sales: number;
  today_revenue: number;
  week_revenue: number;
  total_sales: number;
  manager_id?: number;
  created_at: string;
}

export interface StaffMember {
  id: number;
  name: string;
  role: string;
}

export interface ShopDetail extends Shop {
  email: string | null;
  phone: string | null;
  staff: StaffMember[];
  week_sales: number;
  month_sales: number;
  month_revenue: number;
  total_revenue: number;
}

export interface DailyPoint {
  date: string;
  day: string;
  total: number;
  count: number;
}

export interface PaymentSplit {
  method: string;
  total: number;
  count: number;
}

export interface ProductStat {
  name: string;
  qty: number;
  revenue: number;
}

export interface StaffStat {
  name: string;
  sales_count: number;
  revenue: number;
}

export interface LowStockItem {
  id: number;
  name: string;
  stock: number;
}

export interface ShopAnalytics {
  daily_chart: DailyPoint[];
  payment_breakdown: PaymentSplit[];
  today_profit: number;
  week_profit: number;
  month_profit: number;
  avg_sale_value: number;
  returns_count: number;
  top_products: ProductStat[];
  staff_performance: StaffStat[];
  kpi_locked: boolean;
  low_stock_count: number;
  low_stock_items: LowStockItem[];
}

export const TIER_OPTIONS: Record<string, { cycle: string; label: string }[]> = {
  small: [
    { cycle: "weekly", label: "Weekly (KES 104)" },
    { cycle: "monthly", label: "Monthly (KES 416)" },
    { cycle: "yearly", label: "Yearly (KES 4,992)" },
  ],
  medium: [
    { cycle: "monthly", label: "Monthly (KES 5,625)" },
    { cycle: "yearly", label: "Yearly (KES 67,500)" },
  ],
};

export function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function subscriptionLabel(shop: Shop): { text: string; color: string } {
  const plan = capitalize(shop.plan);
  if (shop.subscription_status === "active") {
    const left = daysLeft(shop.subscription_ends_at);
    if (left !== null) {
      return left >= 0
        ? { text: `${plan} plan, ${left}d left`, color: "var(--brand-dark)" }
        : { text: "Subscription ended, renew now", color: "var(--danger)" };
    }
    return { text: `${plan} plan, active`, color: "var(--brand-dark)" };
  }
  if (shop.subscription_status === "trialing") {
    const left = daysLeft(shop.trial_ends_at);
    if (left !== null && left < 0) return { text: "Trial ended, upgrade now", color: "var(--danger)" };
    return { text: `Free trial, ${left ?? "?"}d left`, color: "var(--text-3)" };
  }
  return { text: "Subscription expired, upgrade now", color: "var(--danger)" };
}

// ── Upgrade / renew modal ────────────────────────────────────────────────────

export function UpgradeModal({
  shop,
  token,
  onClose,
}: {
  shop: Shop;
  token: string;
  onClose: () => void;
}) {
  const [tier, setTier] = useState<"small" | "medium">(
    shop.plan === "medium" ? "medium" : "small",
  );
  const [cycle, setCycle] = useState(shop.billing_cycle || TIER_OPTIONS[tier][0].cycle);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const cycleOptions = TIER_OPTIONS[tier];
  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    height: 48,
  };

  async function startCheckout() {
    setStarting(true);
    setError("");
    try {
      const res = await ownerRequest<{ authorization_url: string }>(
        `/owner/checkout`,
        token,
        { method: "POST", body: JSON.stringify({ tier, cycle }) },
      );
      window.location.href = res.authorization_url;
    } catch (err: unknown) {
      setError((err as Error).message ?? "Could not start checkout");
      setStarting(false);
    }
  }

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
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Upgrade your plan</h2>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><X size={20} /></button>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>Plan</label>
          <select
            value={tier}
            onChange={(e) => {
              const next = e.target.value as "small" | "medium";
              setTier(next);
              setCycle(TIER_OPTIONS[next][0].cycle);
            }}
            className="w-full rounded-xl border px-3 text-sm outline-none"
            style={inputStyle}
          >
            <option value="small">Small Enterprise</option>
            <option value="medium">Medium Enterprise</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>Billing cycle</label>
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value)}
            className="w-full rounded-xl border px-3 text-sm outline-none"
            style={inputStyle}
          >
            {cycleOptions.map((opt) => (
              <option key={opt.cycle} value={opt.cycle}>{opt.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm rounded-xl px-4 py-2.5"
            style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <button
          onClick={startCheckout}
          disabled={starting}
          className="w-full rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--brand)", height: 48 }}
        >
          {starting && <Loader2 size={16} className="animate-spin" />}
          Pay with mpesa
        </button>
      </div>
    </div>
  );
}

// ── Staff panel ───────────────────────────────────────────────────────────────

export function StaffPanel({
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
  const [resetTarget, setResetTarget] = useState<number | null>(null);
  const [resetPinValue, setResetPinValue] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState("");

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

  async function resetPin(id: number) {
    if (resetPinValue.length < 4) {
      setResetError("PIN must be at least 4 digits");
      return;
    }
    setResetSaving(true);
    setResetError("");
    try {
      await ownerRequest(`/owner/shops/${shop.id}/staff/${id}/pin`, token, {
        method: "PATCH",
        body: JSON.stringify({ pin: resetPinValue }),
      });
      setResetTarget(null);
      setResetPinValue("");
    } catch (err: unknown) {
      setResetError((err as Error).message ?? "Failed to reset PIN");
    } finally {
      setResetSaving(false);
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
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="font-bold" style={{ color: "var(--text)" }}>{shop.name}</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              Staff management
              {shop.max_staff ? ` · ${shop.total_staff_count}/${shop.max_staff} slots used` : ""}
            </p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--brand)" }} />
            </div>
          ) : staff.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-3)" }}>No staff yet</p>
          ) : (
            staff.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl p-3 flex flex-col gap-2"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
                  >
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{s.name}</p>
                    <p className="text-xs capitalize" style={{ color: "var(--text-3)" }}>
                      {s.role} · Login ID: <span className="font-mono font-bold">{s.id}</span>
                    </p>
                  </div>
                  {removing === s.id ? (
                    <Loader2 size={15} className="animate-spin shrink-0" style={{ color: "var(--text-3)" }} />
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          const opening = resetTarget !== s.id;
                          setResetTarget(opening ? s.id : null);
                          setResetPinValue("");
                          setResetError("");
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                        style={{ color: resetTarget === s.id ? "var(--brand)" : "var(--text-3)" }}
                        title="Reset PIN"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        onClick={() => removeStaff(s.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                        style={{ color: "var(--text-3)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {resetTarget === s.id && (
                  <div className="flex flex-col gap-1.5 pl-12">
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        value={resetPinValue}
                        onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="New 4-digit PIN"
                        autoFocus
                        className="flex-1 rounded-xl border px-3 text-sm outline-none text-center tracking-widest font-bold"
                        style={{ ...inputStyle, height: 36 }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                      />
                      <button
                        onClick={() => resetPin(s.id)}
                        disabled={resetSaving}
                        className="rounded-xl px-3 text-sm font-semibold text-white flex items-center justify-center gap-1 disabled:opacity-60 shrink-0"
                        style={{ background: "var(--brand)", height: 36 }}
                      >
                        {resetSaving && <Loader2 size={12} className="animate-spin" />}
                        Save
                      </button>
                    </div>
                    {resetError && (
                      <p className="text-xs" style={{ color: "var(--danger)" }}>{resetError}</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 pb-6 pt-2 shrink-0 border-t" style={{ borderColor: "var(--border)" }}>
          {!showAdd ? (
            shop.max_staff && shop.total_staff_count >= shop.max_staff ? (
              <p className="text-xs text-center rounded-2xl py-3 px-3"
                style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                You've used all {shop.max_staff} staff slots on your {shop.plan} plan. Upgrade to add more.
              </p>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
                style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
              >
                <UserPlus size={15} /> Add staff member
              </button>
            )
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

// ── Bar chart ─────────────────────────────────────────────────────────────────

export function BarChart({
  data,
  valueFormatter,
}: {
  data: { label: string; value: number }[];
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const format = valueFormatter ?? ((v: number) => v.toLocaleString());
  return (
    <div className="flex items-end gap-1.5 sm:gap-2 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full">
          <div className="w-full flex-1 flex items-end justify-center">
            <div
              className="w-full max-w-8 rounded-t-md"
              style={{
                height: `${Math.max((d.value / max) * 100, 3)}%`,
                background: d.value > 0 ? "var(--brand)" : "var(--surface-2)",
              }}
              title={`${d.label}: ${format(d.value)}`}
            />
          </div>
          <span className="text-[10px] font-medium truncate w-full text-center" style={{ color: "var(--text-3)" }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
