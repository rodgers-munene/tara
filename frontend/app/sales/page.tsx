"use client";

import { useState } from "react";
import { Receipt, ChevronDown, ChevronUp, Loader2, Search, X, RotateCcw, AlertTriangle, Share2 } from "lucide-react";
import NavBar from "../components/NavBar";
import { useAuth } from "../components/AuthProvider";
import { api, useApi, fmtKES, type Sale, type SaleReturn } from "../../lib/api";
import { shareReceipt } from "../../lib/receipt";

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

// ── Return confirmation sheet ─────────────────────────────────────────────────
function ReturnSheet({
  sale,
  onClose,
  onConfirmed,
}: {
  sale: Sale;
  onClose: () => void;
  onConfirmed: (updated: Sale) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      await api.post<SaleReturn>("/returns/", { sale_id: sale.id, reason: reason.trim() || undefined });
      onConfirmed({ ...sale, is_returned: true });
    } catch (err: unknown) {
      setError((err as Error).message ?? "Return failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: "85svh" }}>
        <div
          className="mx-auto mb-4 h-1 w-10 rounded-full"
          style={{ background: "var(--border-strong)" }}
        />

        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--danger-light)", color: "var(--danger)" }}
          >
            <RotateCcw size={18} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              Process Return
            </p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              {sale.receipt_number}
            </p>
          </div>
        </div>

        {/* Items being returned */}
        <div
          className="rounded-xl border overflow-hidden mb-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {sale.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <span style={{ color: "var(--text)" }}>{item.product_name}</span>
              <div className="flex items-center gap-3">
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
            <span className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>
              Total refund
            </span>
            <span className="text-base font-bold" style={{ color: "var(--danger)" }}>
              {fmtKES(sale.total)}
            </span>
          </div>
        </div>

        {/* Warning */}
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-4 text-xs leading-relaxed"
          style={{ background: "var(--warning-light, #fef3c7)", color: "var(--warning)" }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            Stock will be restored for all items. This cannot be undone.
          </span>
        </div>

        {/* Reason */}
        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
            Reason <span style={{ color: "var(--text-3)" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Wrong item, customer changed mind…"
            className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              height: 48,
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--danger)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {error && (
          <p className="text-sm rounded-xl px-4 py-2.5 mb-4"
            style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl font-semibold text-sm border"
            style={{ height: 52, borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ height: 52, background: "var(--danger)" }}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Confirm Return
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sale row ──────────────────────────────────────────────────────────────────
function SaleRow({
  sale: initialSale,
}: {
  sale: Sale;
}) {
  const { shop } = useAuth();
  const [open, setOpen] = useState(false);
  const [sale, setSale] = useState(initialSale);
  const [showReturnSheet, setShowReturnSheet] = useState(false);
  const isMpesa = sale.payment_method === "mpesa";
  const isSplit = sale.payment_method === "split";

  return (
    <>
      <div className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: sale.is_returned
                ? "var(--surface-2)"
                : isMpesa ? "var(--mpesa-light)" : "var(--brand-light)",
              color: sale.is_returned
                ? "var(--text-3)"
                : isMpesa ? "var(--mpesa)" : "var(--brand-dark)",
            }}
          >
            {sale.is_returned ? (
              <RotateCcw size={16} />
            ) : isSplit ? (
              <span className="text-sm">➗</span>
            ) : (
              <img
                src={isMpesa ? "/mpesa.png" : "/cash.png"}
                alt=""
                className="h-4.5 w-4.5 object-contain"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p
                className="text-sm font-semibold"
                style={{ color: sale.is_returned ? "var(--text-3)" : "var(--text)" }}
              >
                {sale.receipt_number}
              </p>
              {sale.is_returned && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: "var(--danger-light)", color: "var(--danger)" }}
                >
                  RETURNED
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              {formatTime(sale.created_at)} · {sale.items.length}{" "}
              {sale.items.length === 1 ? "item" : "items"}
              {sale.cashier_name && ` · ${sale.cashier_name}`}
            </p>
          </div>

          <div className="text-right shrink-0 flex items-center gap-2">
            {sale.discount > 0 && !sale.is_returned && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
              >
                disc
              </span>
            )}
            <p
              className="text-sm font-bold"
              style={{ color: sale.is_returned ? "var(--text-3)" : "var(--text)" }}
            >
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
          <div className="px-4 py-4" style={{ background: "var(--surface-2)" }}>
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
                  <span className="font-medium">
                    {isSplit
                      ? `Cash ${fmtKES(sale.cash_amount ?? 0)} + M-Pesa ${fmtKES(sale.mpesa_amount ?? 0)}`
                      : isMpesa ? "M-Pesa" : "Cash"}
                  </span>
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

            <button
              onClick={() => shareReceipt(sale, shop)}
              className="mt-3 w-full rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2"
              style={{
                height: 44,
                borderColor: "#25D366",
                color: "#25D366",
                background: "transparent",
              }}
            >
              <Share2 size={15} />
              Share receipt
            </button>

            {!sale.is_returned && (
              <button
                onClick={() => setShowReturnSheet(true)}
                className="mt-2 w-full rounded-xl border font-semibold text-sm flex items-center justify-center gap-2"
                style={{
                  height: 44,
                  borderColor: "var(--danger)",
                  color: "var(--danger)",
                  background: "var(--danger-light)",
                }}
              >
                <RotateCcw size={15} />
                Process Return
              </button>
            )}

            {sale.is_returned && (
              <div
                className="mt-3 rounded-xl px-4 py-3 flex items-center gap-2 text-sm"
                style={{ background: "var(--danger-light)", color: "var(--danger)" }}
              >
                <RotateCcw size={15} />
                <span className="font-medium">This sale has been fully returned</span>
              </div>
            )}
          </div>
        )}
      </div>

      {showReturnSheet && (
        <ReturnSheet
          sale={sale}
          onClose={() => setShowReturnSheet(false)}
          onConfirmed={(updated) => {
            setSale(updated);
            setShowReturnSheet(false);
          }}
        />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const { data: sales = [], isLoading: loading } = useApi<Sale[]>("/sales/");
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState<"all" | "cash" | "mpesa" | "split">("all");

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
  const todayTotal = (grouped[todayStr] ?? [])
    .filter((s) => !s.is_returned)
    .reduce((s, sale) => s + sale.total, 0);
  const todayCount = (grouped[todayStr] ?? []).filter((s) => !s.is_returned).length;

  return (
    <div className="flex min-h-svh flex-col lg:pl-56 pt-12 lg:pt-0" style={{ background: "var(--bg)" }}>
      <NavBar />

      
      {/* Search + filter */}
      <div
        className="sticky z-10 px-4 py-3 border-b flex flex-col gap-2"
        style={{ top: 0, background: "var(--surface)", borderColor: "var(--border)" }}
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
          {(["all", "cash", "mpesa", "split"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMethod(m)}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-colors"
              style={{
                background: filterMethod === m ? "var(--brand)" : "var(--surface-2)",
                color: filterMethod === m ? "#fff" : "var(--text-2)",
              }}
            >
              {m !== "all" && m !== "split" && (
                <img
                  src={m === "cash" ? "/cash.png" : "/mpesa.png"}
                  alt=""
                  className="h-3.5 w-3.5 object-contain"
                />
              )}
              {m === "all" ? "All" : m === "cash" ? "Cash" : m === "mpesa" ? "M-Pesa" : "Split"}
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
                  {fmtKES(grouped[date].filter((s) => !s.is_returned).reduce((s, sale) => s + sale.total, 0))}
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
