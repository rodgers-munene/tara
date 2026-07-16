"use client";

import { useAdminAuth } from "../../components/AdminAuthProvider";
import { Loader2 } from "lucide-react";
import { useAdminApi, PlatformStats, StatCard } from "../shared";

export default function AdminOverviewPage() {
  const { admin, token } = useAdminAuth();
  const { data: stats, isLoading: loading } = useAdminApi<PlatformStats>("/admin/stats", token);

  if (!admin) return null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-10 flex flex-col gap-6 pb-10">
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
      ) : null}
    </main>
  );
}
