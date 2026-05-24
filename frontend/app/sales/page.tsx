"use client";

import { useState, useEffect } from "react";
import { Receipt, ChevronDown, ChevronUp, Loader2, Search, X } from "lucide-react";
import NavBar from "../components/NavBar";
import { api, fmtKES, type Sale } from "../../lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(sales: Sale[]): Record<string, Sale[]> {
  return sales.reduce<Record<string, Sale[]>>((acc, sale) => {
    const key = formatDate(sale.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(sale);
    return acc;
  }, {});
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonSaleRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="skeleton h-9 w-9 shrink-0 rounded-xl" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="skeleton rounded-md h-3.5 w-32" />
        <div className="skeleton rounded-md h-3 w-48" />
      </div>
      <div className="skeleton rounded-md h-4 w-20" />
    </div>
  );
}

// ── Sale row ──────────────────────────────────────────────────────────────────
function SaleRow({ sale }: { sale: Sale }) {
  const [open, setOpen] = useState(false);
  const isMpesa = sale.payment_method === "mpesa";

  return (
    <div className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: isMpesa ? "var(--mpesa-light)" : "var(--brand-light)",
            color: isMpesa ? "var(--mpesa)" : "var(--brand-dark)",
          }}
        >
          <span className="text-base">{isMpesa ? "📱" : "💵"}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {sale.receipt_number}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
            {formatTime(sale.created_at)} · {sale.items.length}{" "}
            {sale.items.length === 1 ? "item" : "items"}
            {sale.cashier_name && ` · ${sale.cashier_name}`}
          </p>
        </div>

        <div className="text-right shrink-0 flex items-center gap-2">
          {sale.discount > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
            >
              disc
            </span>
          )}
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {fmtKES(sale.total)}
          </p>
          {open ? (
            <ChevronUp size={16} style={{ color: "var(--text-3)" }} />
          ) : (
            <ChevronDown size={16} style={{ color: "var(--text-3)" }} />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ background: "var(--surface-2)" }}>
          <div
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            {sale.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <span style={{ color: "var(--text)" }}>{item.product_name}</span>
                <div className="flex items-center gap-4">
                  <span style={{ color: "var(--text-3)" }}>×{item.quantity}</span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {fmtKES(item.subtotal)}
                  </span>
                </div>
              </div>
            ))}
            <div
              className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <div className="text-xs" style={{ color: "var(--text-2)" }}>
                <span className="font-medium">{isMpesa ? "M-Pesa" : "Cash"}</span>
                {sale.mpesa_ref && (
                  <span className="ml-2 font-mono" style={{ color: "var(--text-3)" }}>
                    {sale.mpesa_ref}
                  </span>
                )}
                {sale.discount > 0 && (
                  <span className="ml-2" style={{ color: "var(--brand-dark)" }}>
                    · Discount: -{fmtKES(sale.discount)}
                  </span>
                )}
                {sale.change_given > 0 && (
                  <span className="ml-2">· Change: {fmtKES(sale.change_given)}</span>
                )}
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                {fmtKES(sale.total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState<"all" | "cash" | "mpesa">("all");

  useEffect(() => {
    api.get<Sale[]>("/sales/").then(setSales).finally(() => setLoading(false));
  }, []);

  const filtered = sales.filter((s) => {
    if (filterMethod !== "all" && s.payment_method !== filterMethod) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.receipt_number.toLowerCase().includes(q) ||
        (s.cashier_name ?? "").toLowerCase().includes(q) ||
        s.items.some((i) => i.product_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const grouped = groupByDate(filtered);
  const dates = Object.keys(grouped);

  const todayStr = formatDate(new Date().toISOString());
  const todayTotal = (grouped[todayStr] ?? []).reduce((s, sale) => s + sale.total, 0);
  const todayCount = (grouped[todayStr] ?? []).length;

  return (
    <div className="flex min-h-svh flex-col lg:pl-56" style={{ background: "var(--bg)" }}>
      <NavBar />

      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 h-14 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span className="font-semibold text-base flex-1" style={{ color: "var(--text)" }}>
          Sales
        </span>
      </header>

      {/* Search + filter */}
      <div
        className="sticky z-10 px-4 py-3 border-b flex flex-col gap-2"
        style={{ top: 56, background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 h-9"
          style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}
        >
          <Search size={15} style={{ color: "var(--text-3)" }} className="shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt, item, cashier…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
            style={{ color: "var(--text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} style={{ color: "var(--text-3)" }} />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {(["all", "cash", "mpesa"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMethod(m)}
              className="shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition-colors"
              style={{
                background: filterMethod === m ? "var(--brand)" : "var(--surface-2)",
                color: filterMethod === m ? "#fff" : "var(--text-2)",
              }}
            >
              {m === "all" ? "All" : m === "cash" ? "💵 Cash" : "📱 M-Pesa"}
            </button>
          ))}
        </div>
      </div>

      {/* Today's summary */}
      {!loading && todayTotal > 0 && (
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: "var(--brand-light)" }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand-dark)" }}>
                Today&apos;s sales
              </p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--brand-dark)" }}>
                {fmtKES(todayTotal)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--brand)" }}>
                {todayCount} transaction{todayCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--brand)", opacity: 0.9 }}
            >
              <Receipt size={22} className="text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Sales list */}
      <main className="flex-1 pb-24 lg:pb-6">
        {loading ? (
          <div style={{ background: "var(--surface)" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonSaleRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Receipt size={40} strokeWidth={1} style={{ color: "var(--text-3)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
              {search || filterMethod !== "all" ? "No sales match your filter" : "No sales recorded yet"}
            </p>
          </div>
        ) : (
          dates.map((date) => (
            <div key={date}>
              <div
                className="px-4 py-2 flex items-center justify-between"
                style={{ background: "var(--bg)" }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                  {date}
                </span>
                <span className="text-xs font-semibold" style={{ color: "var(--brand-dark)" }}>
                  {fmtKES(grouped[date].reduce((s, sale) => s + sale.total, 0))}
                </span>
              </div>
              <div style={{ background: "var(--surface)" }}>
                {grouped[date].map((sale) => (
                  <SaleRow key={sale.id} sale={sale} />
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
