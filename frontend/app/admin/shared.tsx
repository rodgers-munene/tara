"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, X } from "lucide-react";

export const BASE = "/api";

export async function adminRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
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

// Cached GET for admin pages, gated on the auth token being ready.
export function useAdminApi<T>(path: string | null, token: string | null) {
  return useSWR<T>(
    token && path ? path : null,
    () => adminRequest<T>(path as string, token as string),
  );
}

export interface Owner {
  id: number;
  name: string;
  email: string;
  active: boolean;
  shop_count: number;
  plan: string;
  billing_cycle: string | null;
  trial_ends_at: string | null;
  subscription_status: string;
  subscription_ends_at: string | null;
  created_at: string;
}

export interface PlatformStats {
  total_owners: number;
  active_owners: number;
  total_shops: number;
  total_sales: number;
  total_revenue: number;
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
  owner_id: number | null;
  created_at: string;
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

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        {value}
      </p>
    </div>
  );
}

export function CreateOwnerModal({
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
              PIN * (4 digits, owner uses this to log in)
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
            <p className="text-sm rounded-xl px-4 py-2.5" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
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

export function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface SubscriptionLike {
  subscription_status: string;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
}

// Works for both Shop and Owner — subscription lives on the owner account, but
// every shop under that owner carries the same fields merged onto it.
export function shopStatusLabel(entity: SubscriptionLike): { text: string; color: string } {
  if (entity.subscription_status === "active") {
    const left = daysLeft(entity.subscription_ends_at);
    if (left !== null) {
      return left >= 0
        ? { text: `Active, ${left}d left`, color: "var(--brand)" }
        : { text: "Active, renewal overdue", color: "var(--danger)" };
    }
    return { text: "Active subscription", color: "var(--brand)" };
  }
  if (entity.subscription_status === "trialing") {
    const left = daysLeft(entity.trial_ends_at);
    if (left !== null && left < 0) return { text: "Trial expired", color: "var(--danger)" };
    return { text: `Trial, ${left ?? "?"}d left`, color: "var(--text-3)" };
  }
  return { text: "Expired", color: "var(--danger)" };
}

export function ShopRow({
  shop,
  updating,
  onActivate,
  onSuspend,
}: {
  shop: Shop;
  updating: boolean;
  onActivate: (tier: string, cycle: string) => void;
  onSuspend: () => void;
}) {
  const [tier, setTier] = useState<"small" | "medium">("small");
  const [cycle, setCycle] = useState("monthly");
  const status = shopStatusLabel(shop);
  const cycleOptions = TIER_OPTIONS[tier];
  const selectStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
  };

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{shop.name}</p>
          <p className="text-xs mt-0.5" style={{ color: status.color }}>{status.text}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
            Plan: {shop.plan}
            {shop.billing_cycle ? ` (${shop.billing_cycle})` : ""}
          </p>
        </div>
        {shop.subscription_status === "active" && (
          <button
            onClick={onSuspend}
            disabled={updating}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-60"
            style={{ color: "var(--text-3)" }}
          >
            {updating && <Loader2 size={12} className="animate-spin" />}
            Suspend
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={tier}
          onChange={(e) => {
            const next = e.target.value as "small" | "medium";
            setTier(next);
            setCycle(TIER_OPTIONS[next][0].cycle);
          }}
          className="text-xs rounded-lg border px-2 py-1.5 outline-none min-w-0"
          style={selectStyle}
        >
          <option value="small">Small Enterprise</option>
          <option value="medium">Medium Enterprise</option>
        </select>
        <select
          value={cycle}
          onChange={(e) => setCycle(e.target.value)}
          className="text-xs rounded-lg border px-2 py-1.5 flex-1 outline-none min-w-0"
          style={selectStyle}
        >
          {cycleOptions.map((opt) => (
            <option key={opt.cycle} value={opt.cycle}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={() => onActivate(tier, cycle)}
          disabled={updating}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0 disabled:opacity-60"
          style={{ background: "var(--brand)" }}
        >
          {updating && <Loader2 size={12} className="animate-spin" />}
          Activate
        </button>
      </div>
    </div>
  );
}
