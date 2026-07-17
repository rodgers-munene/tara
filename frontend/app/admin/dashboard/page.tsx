"use client";

import { useRef, useState } from "react";
import { Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useAdminAuth } from "../../components/AdminAuthProvider";
import { useAdminApi, PlatformStats, StatCard } from "../shared";

const CHART_W = 700;
const CHART_H = 180;
const PAD_X = 6;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

// ── Card shell ────────────────────────────────────────────────────────────────
function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
    >
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Trend chart (single series, area + line, crosshair tooltip) ───────────────
function TrendChart({
  points,
  color,
  formatValue,
}: {
  points: { day: string; value: number }[];
  color: string;
  formatValue: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const n = points.length;
  const plotW = CHART_W - PAD_X * 2;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const baselineY = PAD_TOP + plotH;
  const maxVal = Math.max(...points.map((p) => p.value), 1) * 1.15;

  const x = (i: number) => PAD_X + (n === 1 ? 0 : (i * plotW) / (n - 1));
  const y = (v: number) => PAD_TOP + (1 - v / maxVal) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const areaPath = `${linePath} L ${x(n - 1)} ${baselineY} L ${x(0)} ${baselineY} Z`;

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (e.clientX - rect.left) / rect.width;
    const i = Math.round(fraction * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  const last = points[n - 1];
  const tooltipPoint = hover !== null ? points[hover] : null;
  const tooltipPct = hover !== null ? (x(hover) / CHART_W) * 100 : 0;
  const tooltipAlign = tooltipPct < 12 ? "left" : tooltipPct > 88 ? "right" : "center";

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ height: 140 }} preserveAspectRatio="none">
        <line x1={PAD_X} y1={baselineY} x2={CHART_W - PAD_X} y2={baselineY} stroke="var(--border)" strokeWidth={1} />
        <path d={areaPath} fill={color} opacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <line
            x1={x(hover)}
            y1={PAD_TOP}
            x2={x(hover)}
            y2={baselineY}
            stroke="var(--border-strong)"
            strokeWidth={1}
          />
        )}
        <circle cx={x(n - 1)} cy={y(last.value)} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
        {hover !== null && hover !== n - 1 && (
          <circle cx={x(hover)} cy={y(points[hover].value)} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
        )}
        {points.map((p, i) =>
          i % 3 === 0 || i === n - 1 ? (
            <text
              key={p.day + i}
              x={x(i)}
              y={CHART_H - 4}
              fontSize={10}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fill="var(--text-3)"
            >
              {p.day}
            </text>
          ) : null,
        )}
      </svg>
      <div
        className="absolute text-xs font-semibold px-1 py-0.5 rounded"
        style={{ top: 2, right: 0, color: "var(--text-2)" }}
      >
        {formatValue(last.value)}
      </div>
      {tooltipPoint && (
        <div
          className="absolute pointer-events-none rounded-lg px-2.5 py-1.5 text-xs"
          style={{
            left: `${tooltipPct}%`,
            top: 4,
            transform: tooltipAlign === "center" ? "translateX(-50%)" : tooltipAlign === "right" ? "translateX(-100%)" : "none",
            background: "var(--text)",
            color: "var(--surface)",
            whiteSpace: "nowrap",
          }}
        >
          <div className="opacity-70">{tooltipPoint.day}</div>
          <div className="font-semibold">{formatValue(tooltipPoint.value)}</div>
        </div>
      )}
    </div>
  );
}

// ── Breakdown bars (ordinal / status, direct-labeled, few categories) ─────────
function BreakdownBars({
  rows,
}: {
  rows: { label: string; count: number; color: string; icon?: React.ComponentType<{ size?: number }> }[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => {
        const Icon = r.icon;
        const pct = Math.max(2, (r.count / max) * 100);
        return (
          <div
            key={r.label}
            className="flex items-center gap-3"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            tabIndex={0}
            onFocus={() => setHoverIdx(i)}
            onBlur={() => setHoverIdx(null)}
          >
            <div className="flex items-center gap-1.5 w-28 shrink-0">
              {Icon && <Icon size={13} />}
              <span className="text-xs font-medium truncate" style={{ color: "var(--text-2)" }}>{r.label}</span>
            </div>
            <div className="flex-1 rounded-full" style={{ height: 20, background: "var(--surface-2)" }}>
              <div
                className="rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  height: 20,
                  background: r.color,
                  opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.55,
                }}
              />
            </div>
            <span className="text-xs font-semibold w-8 text-right tabular-nums" style={{ color: "var(--text)" }}>
              {r.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { admin, token } = useAdminAuth();
  const { data: stats, isLoading: loading } = useAdminApi<PlatformStats>("/admin/stats", token);

  if (!admin) return null;

  const planColors: Record<string, string> = { free: "#5abb7f", small: "var(--brand)", medium: "var(--brand-dark)" };
  const statusMeta: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number }> }> = {
    trialing: { label: "Trialing", color: "var(--warning)", icon: Clock },
    active: { label: "Active", color: "var(--brand)", icon: CheckCircle2 },
    expired: { label: "Expired", color: "var(--danger)", icon: XCircle },
  };

  return (
    <main className="w-full max-w-400 px-4 py-6 lg:px-8 lg:py-10 flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
          Platform-wide numbers across every owner and shop on Tara.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Owners" value={stats.total_owners} />
            <StatCard label="Active owners" value={stats.active_owners} />
            <StatCard label="Total shops" value={stats.total_shops} />
            <StatCard label="Total sales" value={stats.total_sales.toLocaleString()} />
            <StatCard
              label="Platform revenue"
              value={`KES ${stats.total_revenue.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <ChartCard title="New owner signups" sub="Last 14 days">
              <TrendChart
                points={stats.signups_chart.map((d) => ({ day: d.day, value: d.count }))}
                color="var(--brand)"
                formatValue={(v) => `${v}`}
              />
            </ChartCard>

            <ChartCard title="Sales revenue" sub="Last 14 days, KES">
              <TrendChart
                points={stats.revenue_chart.map((d) => ({ day: d.day, value: d.total }))}
                color="var(--sidebar-active)"
                formatValue={(v) => v.toLocaleString("en-KE", { maximumFractionDigits: 0 })}
              />
            </ChartCard>

            <ChartCard title="Shops by plan" sub="Every owner's current tier">
              <BreakdownBars
                rows={stats.plan_breakdown.map((p) => ({
                  label: p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
                  count: p.count,
                  color: planColors[p.plan] ?? "var(--brand)",
                }))}
              />
            </ChartCard>

            <ChartCard title="Subscription status" sub="Where every owner stands">
              <BreakdownBars
                rows={stats.status_breakdown.map((s) => ({
                  label: statusMeta[s.status]?.label ?? s.status,
                  count: s.count,
                  color: statusMeta[s.status]?.color ?? "var(--text-3)",
                  icon: statusMeta[s.status]?.icon,
                }))}
              />
            </ChartCard>
          </div>
        </>
      ) : null}
    </main>
  );
}
