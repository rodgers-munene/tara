"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Users, Zap, CheckCircle, XCircle, Store,
  TrendingUp, Receipt, Calendar, Mail, Phone, Wallet, Smartphone,
  Award, PackageX, RotateCcw, BarChart3,
} from "lucide-react";
import { useOwnerAuth } from "../../../components/OwnerAuthProvider";
import {
  ownerRequest, useOwnerApi, ShopDetail, ShopAnalytics, daysLeft, subscriptionLabel,
  UpgradeModal, StaffPanel, BarChart,
} from "../../shared";

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 min-w-0"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: "var(--brand-light)" }}
      >
        <Icon size={18} style={{ color: "var(--brand-dark)" }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest truncate" style={{ color: "var(--text-3)" }}>
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5 truncate" style={{ color: "var(--text)" }} title={String(value)}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

export default function ShopDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useOwnerAuth();
  const {
    data: shop, isLoading: shopLoading, error: shopError, mutate: mutateShop,
  } = useOwnerApi<ShopDetail>(`/owner/shops/${params.id}`, token);
  const { data: analytics, isLoading: analyticsLoading, mutate: mutateAnalytics } =
    useOwnerApi<ShopAnalytics>(`/owner/shops/${params.id}/analytics`, token);
  const loading = shopLoading || analyticsLoading;
  const error = shopError ? ((shopError as Error).message ?? "Failed to load shop") : "";
  const [toggling, setToggling] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  function load() {
    return Promise.all([mutateShop(), mutateAnalytics()]);
  }

  async function toggleActive() {
    if (!token || !shop) return;
    setToggling(true);
    try {
      await ownerRequest(`/owner/shops/${shop.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ active: !shop.active }),
      });
      mutateShop((prev) => (prev ? { ...prev, active: !prev.active } : prev), { revalidate: false });
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <main className="w-full px-4 py-6 lg:px-10 lg:py-10 flex h-[60svh] items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
      </main>
    );
  }

  if (error || !shop) {
    return (
      <main className="w-full px-4 py-6 lg:px-10 lg:py-10 flex flex-col gap-4">
        <button
          onClick={() => router.push("/owner/dashboard")}
          className="flex items-center gap-1.5 text-sm font-medium w-fit"
          style={{ color: "var(--text-3)" }}
        >
          <ArrowLeft size={15} /> Back to dashboard
        </button>
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-2 text-center"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
            {error || "Shop not found"}
          </p>
        </div>
      </main>
    );
  }

  const subStatus = subscriptionLabel(shop);
  const needsAttention = shop.subscription_status !== "active" || (daysLeft(shop.subscription_ends_at) ?? 1) < 0;

  return (
    <>
      <main className="w-full px-4 py-6 lg:px-10 lg:py-10 flex flex-col gap-6 pb-10">
        <button
          onClick={() => router.push("/owner/dashboard")}
          className="flex items-center gap-1.5 text-sm font-medium w-fit"
          style={{ color: "var(--text-3)" }}
        >
          <ArrowLeft size={15} /> Back to dashboard
        </button>

        {/* Header */}
        <div
          className="rounded-2xl p-5 lg:p-6 flex flex-col gap-4"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
        >
          <div className="flex items-start gap-4 flex-wrap">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold"
              style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
            >
              {shop.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-xl leading-tight truncate" style={{ color: "var(--text)" }} title={shop.name}>
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

            <button
              onClick={toggleActive}
              disabled={toggling}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl shrink-0 disabled:opacity-60"
              style={{
                background: shop.active ? "var(--danger-light)" : "var(--brand-light)",
                color: shop.active ? "var(--danger)" : "var(--brand-dark)",
              }}
            >
              {toggling ? (
                <Loader2 size={13} className="animate-spin" />
              ) : shop.active ? (
                <XCircle size={13} />
              ) : (
                <CheckCircle size={13} />
              )}
              {shop.active ? "Disable shop" : "Enable shop"}
            </button>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            {shop.email && (
              <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: "var(--text-3)" }}>
                <Mail size={13} className="shrink-0" /> <span className="truncate">{shop.email}</span>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: "var(--text-3)" }}>
                <Phone size={13} className="shrink-0" /> <span className="truncate">{shop.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: "var(--text-3)" }}>
              <Calendar size={13} className="shrink-0" />
              Created {new Date(shop.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowStaff(true)}
              className="flex items-center gap-2 rounded-xl py-2.5 px-5 text-sm font-semibold text-white"
              style={{ background: "var(--brand)" }}
            >
              <Users size={14} /> Manage staff
            </button>
            <button
              onClick={() => setShowUpgrade(true)}
              className="flex items-center gap-1.5 rounded-xl py-2.5 px-5 text-sm font-semibold"
              style={{
                background: needsAttention ? "var(--danger-light)" : "var(--surface-2)",
                color: needsAttention ? "var(--danger)" : "var(--text-2)",
              }}
            >
              <Zap size={14} /> {needsAttention ? "Renew" : "Upgrade"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Sales summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile
              label="Today"
              value={shop.today_sales}
              sub={`KES ${shop.today_revenue.toLocaleString()}`}
              icon={Receipt}
            />
            <StatTile
              label="This week"
              value={shop.week_sales}
              sub={`KES ${shop.week_revenue.toLocaleString()}`}
              icon={TrendingUp}
            />
            <StatTile
              label="This month"
              value={shop.month_sales}
              sub={`KES ${shop.month_revenue.toLocaleString()}`}
              icon={Store}
            />
            <StatTile
              label="All time"
              value={shop.total_sales}
              sub={`KES ${shop.total_revenue.toLocaleString()}`}
              icon={TrendingUp}
            />
            <StatTile
              label="Avg sale (30d)"
              value={analytics ? `KES ${analytics.avg_sale_value.toLocaleString()}` : "—"}
              icon={Wallet}
            />
            <StatTile
              label="Returns (30d)"
              value={analytics ? analytics.returns_count : "—"}
              icon={RotateCcw}
            />
          </div>
        </div>

        {analytics && (
          <>
            {/* Revenue trend */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} style={{ color: "var(--text-3)" }} />
                <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Revenue trend (14 days)</h2>
              </div>
              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              >
                <BarChart
                  data={analytics.daily_chart.map((d) => ({ label: d.day, value: d.total }))}
                  valueFormatter={(v) => `KES ${v.toLocaleString()}`}
                />
              </div>
            </div>

            {/* Profit + payment split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              >
                <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Profit</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Today</p>
                    <p className="text-lg font-bold mt-0.5 truncate" style={{ color: "var(--text)" }}>
                      KES {analytics.today_profit.toLocaleString()}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>This week</p>
                    <p className="text-lg font-bold mt-0.5 truncate" style={{ color: "var(--text)" }}>
                      KES {analytics.week_profit.toLocaleString()}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>This month</p>
                    <p className="text-lg font-bold mt-0.5 truncate" style={{ color: "var(--text)" }}>
                      KES {analytics.month_profit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              >
                <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Payment methods (30d)</h3>
                {analytics.payment_breakdown.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>No sales yet</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {analytics.payment_breakdown.map((p) => {
                      const grandTotal = analytics.payment_breakdown.reduce((sum, x) => sum + x.total, 0) || 1;
                      const pct = Math.round((p.total / grandTotal) * 100);
                      const Icon = p.method === "mpesa" ? Smartphone : Wallet;
                      return (
                        <div key={p.method} className="flex items-center gap-3 min-w-0">
                          <Icon size={15} className="shrink-0" style={{ color: "var(--brand-dark)" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 text-xs mb-1">
                              <span className="capitalize font-medium truncate" style={{ color: "var(--text)" }}>{p.method}</span>
                              <span className="shrink-0" style={{ color: "var(--text-3)" }}>
                                KES {p.total.toLocaleString()} ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--brand)" }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Top products + staff performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              >
                <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>Top products (30d)</h3>
                {analytics.top_products.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>No sales yet</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {analytics.top_products.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold w-4 shrink-0" style={{ color: "var(--text-3)" }}>{i + 1}</span>
                        <p className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: "var(--text)" }} title={p.name}>
                          {p.name}
                        </p>
                        <span className="text-xs shrink-0" style={{ color: "var(--text-3)" }}>{p.qty} sold</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Award size={15} style={{ color: "var(--text-3)" }} />
                  <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Staff performance (30d)</h3>
                </div>
                {analytics.staff_performance.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>No sales yet</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {analytics.staff_performance.map((s) => (
                      <div key={s.name} className="flex items-center justify-between gap-3 min-w-0">
                        <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }} title={s.name}>
                          {s.name}
                        </span>
                        <span className="text-xs shrink-0" style={{ color: "var(--text-3)" }}>
                          KES {s.revenue.toLocaleString()} · {s.sales_count} sales
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Low stock alert */}
            {analytics.low_stock_count > 0 && (
              <div
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: "var(--danger-light)", border: "1.5px solid var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <PackageX size={16} style={{ color: "var(--danger)" }} />
                  <h3 className="text-sm font-bold" style={{ color: "var(--danger)" }}>
                    {analytics.low_stock_count} product{analytics.low_stock_count !== 1 ? "s" : ""} running low
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analytics.low_stock_items.map((p) => (
                    <span
                      key={p.id}
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: "var(--surface)", color: "var(--danger)" }}
                    >
                      {p.name} ({p.stock} left)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Staff */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              Staff ({shop.staff.length})
            </h2>
            <button
              onClick={() => setShowStaff(true)}
              className="text-sm font-semibold"
              style={{ color: "var(--brand)" }}
            >
              Manage
            </button>
          </div>

          {shop.staff.length === 0 ? (
            <div
              className="rounded-2xl p-8 flex flex-col items-center gap-2 text-center"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
            >
              <Users size={28} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />
              <p className="text-sm" style={{ color: "var(--text-3)" }}>No staff added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shop.staff.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl p-3 min-w-0"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
                  >
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{s.name}</p>
                    <p className="text-xs capitalize" style={{ color: "var(--text-3)" }}>{s.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showStaff && token && (
        <StaffPanel
          shop={shop}
          token={token}
          onClose={() => { setShowStaff(false); load(); }}
        />
      )}

      {showUpgrade && token && (
        <UpgradeModal shop={shop} token={token} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
