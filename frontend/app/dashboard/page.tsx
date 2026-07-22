"use client";

import Link from "next/link";
import {
  TrendingUp, ShoppingCart, Banknote, Smartphone,
  AlertTriangle, Package, ChevronRight, Loader2, Receipt, RotateCcw,
} from "lucide-react";
import NavBar from "../components/NavBar";
import { useAuth } from "../components/AuthProvider";
import { useApi, fmtKES, type DashboardStats } from "../../lib/api";

// ── Week bar chart ────────────────────────────────────────────────────────────
function WeekChart({ data }: { data: DashboardStats["week_chart"] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="w-full pt-2">
      <div className="flex items-end gap-1.5" style={{ height: 80 }}>
        {data.map((d) => {
          const pct = d.total === 0 ? 2 : Math.max(4, (d.total / max) * 100);
          const isToday = d.date === today;
          return (
            <div key={d.date} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${pct}%`,
                  background: isToday ? "var(--brand)" : "var(--brand-mid)",
                  minHeight: 3,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((d) => {
          const isToday = d.date === new Date().toISOString().split("T")[0];
          return (
            <div key={d.date} className="flex-1 text-center">
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isToday ? "var(--brand-dark)" : "var(--text-3)",
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  accent?: string;
}) {
  return (
    <div
      className="flex-1 rounded-2xl p-4 flex flex-col gap-3 min-w-0"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: accent ? `${accent}18` : "var(--brand-light)" }}
      >
        <Icon size={18} style={{ color: accent ?? "var(--brand-dark)" }} />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
          {label}
        </p>
        <p className="text-xl font-bold mt-0.5 leading-tight" style={{ color: "var(--text)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4 pb-28 lg:pb-8">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="flex gap-3">
        <div className="flex-1 skeleton h-28 rounded-2xl" />
        <div className="flex-1 skeleton h-28 rounded-2xl" />
      </div>
      <div className="skeleton h-40 rounded-2xl" />
      <div className="skeleton h-36 rounded-2xl" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: loading } = useApi<DashboardStats>("/dashboard/");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const dateStr = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex min-h-svh flex-col lg:pl-56 pt-12 lg:pt-0" style={{ background: "var(--bg)" }}>
      <NavBar />

      {/* Header */}
      <header
        className="sticky top-12 lg:top-0 z-20 flex items-center justify-between px-4 h-14 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
          Dashboard
        </span>
        <Link
          href="/sell"
          className="flex items-center gap-1.5 text-sm font-semibold px-3 h-8 rounded-lg text-white"
          style={{ background: "var(--brand)" }}
        >
          <ShoppingCart size={14} />
          Sell
        </Link>
      </header>

      <main className="flex-1 pb-24 lg:pb-8">
        {loading ? (
          <DashboardSkeleton />
        ) : !stats ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              Failed to load dashboard
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-4">
            {/* Greeting */}
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--text)" }}>
                {greeting}{user ? `, ${user.name.split(" ")[0]}` : ""}
              </p>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                {dateStr}
              </p>
            </div>

            {/* Today's stats — 2 cards */}
            <div className="flex gap-3">
              <StatCard
                label="Today's Revenue"
                value={fmtKES(stats.today_total)}
                sub={`${stats.today_count} sale${stats.today_count !== 1 ? "s" : ""}`}
                icon={TrendingUp}
              />
              <StatCard
                label="Today's Profit"
                value={fmtKES(stats.today_profit)}
                sub={stats.today_total > 0 ? `${Math.round((stats.today_profit / stats.today_total) * 100)}% margin` : "No sales yet"}
                icon={Banknote}
              />
            </div>

            {/* Total products */}
            <Link
              href="/inventory"
              className="flex items-center justify-between rounded-2xl px-4 py-3.5"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: "var(--brand-light)" }}
                >
                  <Package size={18} style={{ color: "var(--brand-dark)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {stats.total_products} product{stats.total_products !== 1 ? "s" : ""} in stock
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    View &amp; manage inventory
                  </p>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: "var(--text-3)" }} />
            </Link>

            {/* Payment split */}
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--mpesa-light)" }}>
                <Smartphone size={18} style={{ color: "var(--mpesa)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-3)" }}>Payment split</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-2)" }}>
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                    Cash {fmtKES(stats.today_cash)}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-2)" }}>
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "var(--mpesa)" }} />
                    M-Pesa {fmtKES(stats.today_mpesa)}
                  </span>
                </div>
              </div>
            </div>

            {/* Week chart */}
            <div
              className="rounded-2xl p-4"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  This week
                </p>
                <span className="text-xs font-semibold" style={{ color: "var(--brand-dark)" }}>
                  {fmtKES(stats.week_total)}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-3)" }}>
                {stats.week_count} sales · {fmtKES(stats.week_profit)} profit
              </p>
              <WeekChart data={stats.week_chart} />
            </div>

            {/* Top sellers */}
            {stats.top_products.length > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              >
                <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                  <Banknote size={16} style={{ color: "var(--brand-dark)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Top sellers · last 30 days
                  </p>
                </div>
                {stats.top_products.map((p, i) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{ background: i === 0 ? "var(--brand)" : "var(--surface-2)", color: i === 0 ? "#fff" : "var(--text-3)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                      {p.name}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>
                      ×{p.qty}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--brand-dark)" }}>
                      {fmtKES(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent transactions */}
            {stats.recent_transactions.length > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              >
                <div className="px-4 py-3 border-b flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <Receipt size={16} style={{ color: "var(--brand-dark)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      Recent transactions
                    </p>
                  </div>
                  <Link href="/sales" className="text-xs font-semibold" style={{ color: "var(--brand-dark)" }}>
                    View all
                  </Link>
                </div>
                {stats.recent_transactions.map((t) => (
                  <Link
                    key={t.id}
                    href="/sales"
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: t.payment_method === "mpesa" ? "var(--mpesa-light)" : "var(--brand-light)" }}
                    >
                      {t.payment_method === "split" ? (
                        <span className="text-xs">➗</span>
                      ) : t.payment_method === "mpesa" ? (
                        <Smartphone size={14} style={{ color: "var(--mpesa)" }} />
                      ) : (
                        <Banknote size={14} style={{ color: "var(--brand-dark)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                        {t.receipt_number}
                        {t.is_returned && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold" style={{ color: "var(--danger)" }}>
                            <RotateCcw size={10} /> Returned
                          </span>
                        )}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>
                        {t.item_count} item{t.item_count !== 1 ? "s" : ""}
                        {t.cashier_name ? ` · ${t.cashier_name}` : ""}
                        {" · "}
                        {new Date(t.created_at).toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <span
                      className="text-sm font-semibold flex-shrink-0"
                      style={{ color: t.is_returned ? "var(--text-3)" : "var(--text)" }}
                    >
                      {fmtKES(t.total)}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Low stock alert */}
            {stats.low_stock_count > 0 && (
              <Link
                href="/inventory"
                className="rounded-2xl overflow-hidden block"
                style={{ border: "1.5px solid #fcd34d", background: "var(--warning-light)" }}
              >
                <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "#fcd34d" }}>
                  <AlertTriangle size={16} style={{ color: "var(--warning)" }} />
                  <p className="text-sm font-semibold flex-1" style={{ color: "var(--warning)" }}>
                    {stats.low_stock_count} item{stats.low_stock_count !== 1 ? "s" : ""} low on stock
                  </p>
                  <ChevronRight size={16} style={{ color: "var(--warning)" }} />
                </div>
                {stats.low_stock_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-2.5 border-b last:border-0"
                    style={{ borderColor: "#fcd34d" }}
                  >
                    <div className="flex items-center gap-2">
                      <Package size={13} style={{ color: "var(--warning)" }} />
                      <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {item.name}
                      </span>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: item.stock === 0 ? "var(--danger)" : "var(--warning)",
                        color: "#fff",
                      }}
                    >
                      {item.stock === 0 ? "Out" : `${item.stock} left`}
                    </span>
                  </div>
                ))}
              </Link>
            )}

            {/* Close day link */}
            <Link
              href="/close"
              className="flex items-center justify-between rounded-2xl px-4 py-3.5"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: "var(--surface-2)" }}
                >
                  <Loader2 size={18} style={{ color: "var(--text-2)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Close Day
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    Cash reconciliation &amp; end-of-day report
                  </p>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: "var(--text-3)" }} />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
