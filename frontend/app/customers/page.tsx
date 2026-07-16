"use client";

import { useState } from "react";
import {
  Plus, Search, X, ChevronRight, Loader2, Users,
  ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import NavBar from "../components/NavBar";
import { api, useApi, fmtKES, type Customer, type CreditEntry } from "../../lib/api";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

// ── Balance badge ─────────────────────────────────────────────────────────────
function BalanceBadge({ balance }: { balance: number }) {
  if (balance === 0)
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}>
        Settled
      </span>
    );
  if (balance > 0)
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
        {fmtKES(balance)} owed
      </span>
    );
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
      {fmtKES(Math.abs(balance))} credit
    </span>
  );
}

// ── Customer detail content (shared between sheet and panel) ──────────────────
function CustomerDetailContent({
  customer,
  onClose,
  onRefresh,
}: {
  customer: Customer;
  onClose: () => void;
  onRefresh: (updated: Customer) => void;
}) {
  const { data: entries = [], isLoading: loadingEntries, mutate: mutateEntries } =
    useApi<CreditEntry[]>(`/customers/${customer.id}/entries`);
  const [mode, setMode] = useState<null | "debt" | "payment">(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const balance = entries.reduce((s, e) => s + e.amount, 0);

  async function handleSubmit() {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      const signedAmount = mode === "payment" ? -val : val;
      const entry = await api.post<CreditEntry>(`/customers/${customer.id}/entries`, {
        amount: signedAmount,
        note: note.trim() || (mode === "payment" ? "Payment received" : undefined),
      });
      const newEntries = [entry, ...entries];
      mutateEntries(newEntries, { revalidate: false });
      const newBalance = newEntries.reduce((s, e) => s + e.amount, 0);
      onRefresh({ ...customer, balance: newBalance });
      setMode(null);
      setAmount("");
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="min-w-0">
          <p className="font-semibold text-base truncate" style={{ color: "var(--text)" }}>
            {customer.name}
          </p>
          {customer.phone && (
            <p className="text-xs" style={{ color: "var(--text-3)" }}>{customer.phone}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ml-3"
          style={{ background: "var(--surface-2)" }}
        >
          <X size={16} style={{ color: "var(--text-2)" }} />
        </button>
      </div>

      {/* Balance + actions */}
      <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
            Current balance
          </span>
          <BalanceBadge balance={balance} />
        </div>

        {mode === null ? (
          <div className="flex gap-2">
            <button
              onClick={() => setMode("debt")}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold border-2 transition-all"
              style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--danger-light)" }}
            >
              <ArrowUpRight size={15} /> Add Debt
            </button>
            <button
              onClick={() => setMode("payment")}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold border-2 transition-all"
              style={{ borderColor: "var(--brand)", color: "var(--brand-dark)", background: "var(--brand-light)" }}
            >
              <ArrowDownLeft size={15} /> Record Payment
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: mode === "debt" ? "var(--danger)" : "var(--brand-dark)" }}>
                {mode === "debt" ? "Add Debt" : "Record Payment"}
              </span>
              <button onClick={() => { setMode(null); setAmount(""); setNote(""); }} className="text-xs" style={{ color: "var(--text-3)" }}>
                Cancel
              </button>
            </div>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (KES)"
              autoFocus
              className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)", height: 48 }}
              onFocus={(e) => (e.target.style.borderColor = mode === "debt" ? "var(--danger)" : "var(--brand)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === "debt" ? "What for? (e.g. Unga + Sugar)" : "Note (optional)"}
              className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)", height: 48 }}
              onFocus={(e) => (e.target.style.borderColor = "var(--border-strong)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              onClick={handleSubmit}
              disabled={!amount || parseFloat(amount) <= 0 || saving}
              className="w-full rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: mode === "debt" ? "var(--danger)" : "var(--brand)", height: 48 }}
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {mode === "debt" ? "Add Debt" : "Record Payment"}
            </button>
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="flex-1 overflow-y-auto">
        <p className="px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
          History
        </p>
        {loadingEntries ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--brand)" }} />
          </div>
        ) : entries.length === 0 ? (
          <p className="px-5 py-4 text-sm text-center" style={{ color: "var(--text-3)" }}>
            No transactions yet
          </p>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-5 py-3 border-b last:border-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: e.amount > 0 ? "var(--danger-light)" : "var(--brand-light)" }}
              >
                {e.amount > 0
                  ? <ArrowUpRight size={14} style={{ color: "var(--danger)" }} />
                  : <ArrowDownLeft size={14} style={{ color: "var(--brand-dark)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                  {e.note ?? (e.amount > 0 ? "Debt added" : "Payment received")}
                </p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>{fmtDate(e.created_at)}</p>
              </div>
              <span
                className="text-sm font-bold shrink-0"
                style={{ color: e.amount > 0 ? "var(--danger)" : "var(--brand-dark)" }}
              >
                {e.amount > 0 ? "+" : ""}{fmtKES(Math.abs(e.amount))}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ── Mobile: customer detail sheet ─────────────────────────────────────────────
function CustomerSheet(props: React.ComponentProps<typeof CustomerDetailContent>) {
  return (
    <>
      <div className="sheet-backdrop" onClick={props.onClose} />
      <div className="sheet">
        <CustomerDetailContent {...props} />
      </div>
    </>
  );
}

// ── Add customer content (shared between sheet and panel) ─────────────────────
function AddCustomerContent({
  onSave,
  onClose,
}: {
  onSave: (c: Customer) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const c = await api.post<Customer>("/customers/", { name: name.trim(), phone: phone.trim() || null });
      onSave(c);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="font-semibold text-base" style={{ color: "var(--text)" }}>New customer</span>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "var(--surface-2)" }}
        >
          <X size={16} style={{ color: "var(--text-2)" }} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-5 py-5 flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoFocus
          className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)", height: 48 }}
          onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number (optional)"
          className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)", height: 48 }}
          onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        {error && (
          <p className="text-sm px-4 py-2.5 rounded-xl" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--brand)", height: 48 }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Add customer
        </button>
      </form>
    </>
  );
}

// ── Mobile: add customer sheet ────────────────────────────────────────────────
function AddCustomerSheet(props: React.ComponentProps<typeof AddCustomerContent>) {
  return (
    <>
      <div className="sheet-backdrop" onClick={props.onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
        style={{ background: "var(--surface)" }}
      >
        <AddCustomerContent {...props} />
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const { data: customers = [], isLoading: loading, mutate: mutateCustomers } = useApi<Customer[]>("/customers/");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const panelOpen = !!selected || showAdd;

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

  const totalOwed = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);

  function closePanel() {
    setSelected(null);
    setShowAdd(false);
  }

  return (
    <div className="flex min-h-svh flex-col lg:pl-56 pt-12 lg:pt-0" style={{ background: "var(--bg)" }}>
      <NavBar />

      <header
        className="sticky top-12 lg:top-0 z-20 flex items-center gap-3 px-4 h-14 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span className="font-semibold text-base flex-1" style={{ color: "var(--text)" }}>
          Customers
        </span>
        <button
          onClick={() => { setSelected(null); setShowAdd(true); }}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 h-8 rounded-lg text-white"
          style={{ background: "var(--brand)" }}
        >
          <Plus size={15} /> Add
        </button>
      </header>

      {/* Summary bar */}
      {!loading && customers.length > 0 && totalOwed > 0 && (
        <div
          className="px-4 py-2.5 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
            {customers.filter((c) => c.balance > 0).length} customers owe
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--danger)" }}>
            {fmtKES(totalOwed)} total
          </span>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div
          className="flex items-center gap-2 rounded-xl px-3 h-9"
          style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}
        >
          <Search size={15} style={{ color: "var(--text-3)" }} className="shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--text-3)]"
            style={{ color: "var(--text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} style={{ color: "var(--text-3)" }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Content: list + optional desktop side panel ── */}
      <div className="flex flex-1 overflow-hidden pb-24 lg:pb-8">

        {/* Customer list */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Users size={40} strokeWidth={1} style={{ color: "var(--text-3)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
                {search ? `No customers matching "${search}"` : "No customers yet"}
              </p>
              {!search && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
                  style={{ background: "var(--brand)" }}
                >
                  Add first customer
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: "var(--surface)" }}>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setShowAdd(false); setSelected(c); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b text-left transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background: selected?.id === c.id ? "var(--brand-light)" : undefined,
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                      {c.name}
                    </p>
                    {c.phone && (
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>{c.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <BalanceBadge balance={c.balance} />
                    <ChevronRight size={15} style={{ color: "var(--text-3)" }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        {/* Desktop: inline right panel */}
        {panelOpen && (
          <aside
            className="hidden lg:flex flex-col w-80 shrink-0 border-l overflow-y-auto"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {showAdd ? (
              <AddCustomerContent
                onSave={(c) => {
                  mutateCustomers((prev = []) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)), { revalidate: false });
                  setShowAdd(false);
                }}
                onClose={closePanel}
              />
            ) : selected ? (
              <CustomerDetailContent
                key={selected.id}
                customer={selected}
                onClose={closePanel}
                onRefresh={(updated) => {
                  mutateCustomers((prev = []) => prev.map((c) => (c.id === updated.id ? updated : c)), { revalidate: false });
                  setSelected(updated);
                }}
              />
            ) : null}
          </aside>
        )}
      </div>

      {/* Mobile: bottom sheets only */}
      {selected && (
        <div className="lg:hidden">
          <CustomerSheet
            key={selected.id}
            customer={selected}
            onClose={() => setSelected(null)}
            onRefresh={(updated) => {
              mutateCustomers((prev = []) => prev.map((c) => (c.id === updated.id ? updated : c)), { revalidate: false });
              setSelected(updated);
            }}
          />
        </div>
      )}

      {showAdd && (
        <div className="lg:hidden">
          <AddCustomerSheet
            onSave={(c) => {
              mutateCustomers((prev = []) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)), { revalidate: false });
              setShowAdd(false);
            }}
            onClose={() => setShowAdd(false)}
          />
        </div>
      )}
    </div>
  );
}
