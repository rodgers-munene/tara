"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2, Plus, Store, X, Users, LogOut,
  CheckCircle, XCircle, TrendingUp, ShoppingBag, Receipt, Zap, MoreVertical,
} from "lucide-react";
import { useOwnerAuth } from "../../components/OwnerAuthProvider";
import { ownerRequest, useOwnerApi, Shop, daysLeft, subscriptionLabel, UpgradeModal, StaffPanel } from "../shared";

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
    name: "", email: "", phone: "", owner_name: "", owner_pin: "",
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

// ── Shop card ─────────────────────────────────────────────────────────────────

function ShopCard({
  shop,
  onToggleActive,
  onManageStaff,
  onUpgrade,
  toggling,
}: {
  shop: Shop;
  onToggleActive: (shop: Shop) => void;
  onManageStaff: (shop: Shop) => void;
  onUpgrade: (shop: Shop) => void;
  toggling: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const subStatus = subscriptionLabel(shop);
  const needsAttention = shop.subscription_status !== "active" || (daysLeft(shop.subscription_ends_at) ?? 1) < 0;
  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--border)",
        opacity: shop.active ? 1 : 0.65,
      }}
    >
      <div className="p-5 flex flex-col gap-4">
        {/* Top row — avatar + name + badges + menu */}
        <div className="flex items-start gap-3">
          <Link href={`/owner/shops/${shop.id}`} className="flex flex-1 min-w-0 items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold"
              style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
            >
              {shop.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-bold text-base leading-tight truncate" style={{ color: "var(--text)" }} title={shop.name}>
                {shop.name}
              </p>
              <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                {shop.slug}
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: shop.plan !== "free" ? "var(--brand)" : "var(--surface-2)",
                    color: shop.plan !== "free" ? "#fff" : "var(--text-3)",
                  }}
                >
                  {shop.plan}
                </span>
                <span
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: shop.active ? "var(--brand-light)" : "var(--surface-2)",
                    color: shop.active ? "var(--brand-dark)" : "var(--text-3)",
                  }}
                >
                  {shop.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs font-medium mt-2" style={{ color: subStatus.color }}>
                {subStatus.text}
              </p>
            </div>
          </Link>

          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ color: "var(--text-3)" }}
              aria-label="Shop options"
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-9 z-50 rounded-xl shadow-lg border min-w-44 p-1"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <button
                    onClick={() => { setMenuOpen(false); onToggleActive(shop); }}
                    disabled={toggling}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                    style={{ color: shop.active ? "var(--danger)" : "var(--brand-dark)" }}
                  >
                    {toggling ? (
                      <Loader2 size={14} className="animate-spin shrink-0" />
                    ) : shop.active ? (
                      <XCircle size={14} className="shrink-0" />
                    ) : (
                      <CheckCircle size={14} className="shrink-0" />
                    )}
                    {shop.active ? "Disable shop" : "Enable shop"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onManageStaff(shop)}
            className="flex-1 min-w-0 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--brand)" }}
          >
            <Users size={14} className="shrink-0" /> <span className="truncate">Manage staff</span>
          </button>
          <button
            onClick={() => onUpgrade(shop)}
            className="flex-1 min-w-0 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
            style={{
              background: needsAttention ? "var(--danger-light)" : "var(--surface-2)",
              color: needsAttention ? "var(--danger)" : "var(--text-2)",
            }}
          >
            <Zap size={14} className="shrink-0" /> {needsAttention ? "Renew" : "Upgrade"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  accent?: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: accent ? `${accent}18` : "var(--brand-light)" }}
      >
        <Icon size={18} style={{ color: accent ?? "var(--brand-dark)" }} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--text)" }}>{value}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const { owner, token } = useOwnerAuth();
  const { data: shops = [], isLoading: shopsLoading, mutate: mutateShops } = useOwnerApi<Shop[]>("/owner/shops/", token);
  const { data: stats, isLoading: statsLoading, mutate: mutateStats } = useOwnerApi<OwnerStats>("/owner/stats", token);
  const loading = shopsLoading || statsLoading;
  const [showCreate, setShowCreate] = useState(false);
  const [staffShop, setStaffShop] = useState<Shop | null>(null);
  const [upgradeShop, setUpgradeShop] = useState<Shop | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [verifyBanner, setVerifyBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  function load() {
    return Promise.all([mutateShops(), mutateStats()]);
  }

  // Paystack redirects back here with ?reference=... after checkout. Verify
  // immediately for fast UI feedback — the webhook is the real source of truth
  // and may land a moment later (or, for local dev, may never reach us).
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) return;

    (async () => {
      try {
        const result = await ownerRequest<{ verified: boolean }>(
          `/owner/checkout/verify?reference=${encodeURIComponent(reference)}`,
          token,
        );
        if (result.verified) {
          setVerifyBanner({ type: "success", message: "Payment confirmed, subscription activated!" });
          load();
        } else {
          setVerifyBanner({
            type: "error",
            message: "Payment not confirmed yet. If you completed payment, check back in a minute.",
          });
        }
      } catch (err: unknown) {
        setVerifyBanner({ type: "error", message: (err as Error).message ?? "Could not verify payment" });
      } finally {
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();
  }, [token]);

  async function toggleActive(shop: Shop) {
    if (!token) return;
    setToggling(shop.id);
    try {
      await ownerRequest(`/owner/shops/${shop.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ active: !shop.active }),
      });
      mutateShops((prev = []) => prev.map((s) => s.id === shop.id ? { ...s, active: !s.active } : s), { revalidate: false });
    } finally {
      setToggling(null);
    }
  }

  if (!owner) return null;

  return (
    <>
      <div className="min-h-svh" style={{ background: "var(--bg)" }}>
      <main className="w-full px-4 py-6 lg:px-10 lg:py-10 flex flex-col gap-6 pb-10">

        {verifyBanner && (
          <div
            className="rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-between gap-3"
            style={{
              background: verifyBanner.type === "success" ? "var(--brand-light)" : "var(--danger-light)",
              color: verifyBanner.type === "success" ? "var(--brand-dark)" : "var(--danger)",
            }}
          >
            <span>{verifyBanner.message}</span>
            <button onClick={() => setVerifyBanner(null)} style={{ color: "inherit" }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Greeting */}
        <div className="pt-1">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {greeting}, {owner.name.split(" ")[0]}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            {stats
              ? `${stats.total_shops} shop${stats.total_shops !== 1 ? "s" : ""} · ${stats.total_staff} staff · ${stats.total_sales.toLocaleString()} total sales`
              : "Loading your business overview…"}
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total shops" value={stats.total_shops} icon={Store} />
            <StatCard label="Active" value={stats.active_shops} icon={CheckCircle} />
            <StatCard label="Staff" value={stats.total_staff} icon={Users} />
            <StatCard label="Total sales" value={stats.total_sales.toLocaleString()} icon={TrendingUp} />
          </div>
        )}

        {/* Shops */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Your shops</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background: "var(--brand)" }}
            >
              <Plus size={15} /> New shop
            </button>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
            </div>
          ) : shops.length === 0 ? (
            <div
              className="rounded-2xl p-10 flex flex-col items-center gap-4 text-center"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "var(--brand-light)" }}
              >
                <Store size={32} strokeWidth={1.5} style={{ color: "var(--brand-dark)" }} />
              </div>
              <div>
                <p className="font-bold" style={{ color: "var(--text)" }}>No shops yet</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
                  Create your first shop to start selling
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--brand)" }}
              >
                <Plus size={15} /> Create first shop
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] lg:gap-4">
              {shops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  onToggleActive={toggleActive}
                  onManageStaff={setStaffShop}
                  onUpgrade={setUpgradeShop}
                  toggling={toggling === shop.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      </div>

      {showCreate && token && (
        <CreateShopModal
          token={token}
          onCreated={(shop) => {
            mutateShops((prev = []) => [shop, ...prev], { revalidate: false });
            mutateStats((prev) => prev
              ? { ...prev, total_shops: prev.total_shops + 1, active_shops: prev.active_shops + 1, total_staff: prev.total_staff + 1 }
              : prev,
              { revalidate: false }
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

      {upgradeShop && token && (
        <UpgradeModal
          shop={upgradeShop}
          token={token}
          onClose={() => setUpgradeShop(null)}
        />
      )}
    </>
  );
}
