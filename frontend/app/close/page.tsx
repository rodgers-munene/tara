"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Calculator } from "lucide-react";
import NavBar from "../components/NavBar";
import { useAuth } from "../components/AuthProvider";
import { api, fmtKES, type DayCloseSummary } from "../../lib/api";

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "0"}
        className="w-full rounded-xl border px-4 text-base font-semibold outline-none transition-colors"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)", height: 52 }}
        onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

export default function ClosePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [summary, setSummary] = useState<DayCloseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<DayCloseSummary>("/day-close/today")
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const opening = parseFloat(openingCash) || 0;
  const closing = parseFloat(closingCash) || 0;
  const expectedCash = opening + (summary?.total_cash_sales ?? 0);
  const variance = closing - expectedCash;

  async function handleClose() {
    if (!summary) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/day-close/", {
        date: summary.date,
        opening_cash: opening,
        closing_cash: closing,
        notes: notes.trim() || null,
      });
      setDone(true);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to close day");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-5 px-6" style={{ background: "var(--bg)" }}>
        <div className="pop-in flex flex-col items-center gap-4">
          <CheckCircle2 size={72} strokeWidth={1.5} style={{ color: "var(--brand)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>Day closed!</p>
          <p className="text-sm text-center" style={{ color: "var(--text-3)" }}>
            {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <div className="mt-2 rounded-2xl p-5 w-full max-w-xs" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
            <div className="flex justify-between mb-2">
              <span className="text-sm" style={{ color: "var(--text-2)" }}>Total sales</span>
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{fmtKES(summary!.total_sales)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm" style={{ color: "var(--text-2)" }}>Cash</span>
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{fmtKES(summary!.total_cash_sales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: "var(--text-2)" }}>M-Pesa</span>
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{fmtKES(summary!.total_mpesa_sales)}</span>
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-2 rounded-xl font-semibold text-base text-white px-8"
            style={{ background: "var(--brand)", height: 52 }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col lg:pl-56" style={{ background: "var(--bg)" }}>
      <NavBar />

      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 h-14 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "var(--surface-2)" }}
        >
          <ArrowLeft size={16} style={{ color: "var(--text-2)" }} />
        </button>
        <span className="font-semibold text-base flex-1" style={{ color: "var(--text)" }}>
          Close Day
        </span>
      </header>

      <main className="flex-1 px-4 py-5 pb-28 lg:pb-8 flex flex-col gap-5 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
          </div>
        ) : !summary ? (
          <p className="text-sm text-center" style={{ color: "var(--text-3)" }}>
            Failed to load today&apos;s data
          </p>
        ) : summary.already_closed ? (
          <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} style={{ color: "var(--brand)" }} />
              <p className="font-semibold" style={{ color: "var(--text)" }}>Day already closed</p>
            </div>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              Closed by {summary.close_record?.closed_by}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl font-semibold text-sm text-white mt-2"
              style={{ background: "var(--brand)", height: 44 }}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Date */}
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--text)" }}>
                {new Date(summary.date + "T12:00:00").toLocaleDateString("en-KE", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                {summary.sale_count} sales recorded today
              </p>
            </div>

            {/* Sales summary cards */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                <Calculator size={16} style={{ color: "var(--brand-dark)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Today&apos;s sales</p>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>Cash sales</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{fmtKES(summary.total_cash_sales)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>M-Pesa sales</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--mpesa)" }}>{fmtKES(summary.total_mpesa_sales)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Total</span>
                  <span className="text-base font-bold" style={{ color: "var(--text)" }}>{fmtKES(summary.total_sales)}</span>
                </div>
              </div>
            </div>

            {/* Cash reconciliation */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Cash reconciliation</p>
              </div>
              <div className="px-4 py-4 flex flex-col gap-4">
                <InputField
                  label="Opening cash (KES)"
                  value={openingCash}
                  onChange={setOpeningCash}
                  placeholder="Cash in drawer at start of day"
                />
                <InputField
                  label="Closing cash (KES)"
                  value={closingCash}
                  onChange={setClosingCash}
                  placeholder="Cash counted at end of day"
                />

                {closingCash && (
                  <div
                    className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{
                      background: Math.abs(variance) < 1 ? "var(--brand-light)" : variance > 0 ? "var(--brand-light)" : "var(--danger-light)",
                    }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: Math.abs(variance) < 1 ? "var(--brand-dark)" : variance > 0 ? "var(--brand-dark)" : "var(--danger)" }}
                    >
                      {Math.abs(variance) < 1 ? "Balanced ✓" : variance > 0 ? "Cash surplus" : "Cash shortage"}
                    </span>
                    <span
                      className="font-bold"
                      style={{ color: Math.abs(variance) < 1 ? "var(--brand-dark)" : variance > 0 ? "var(--brand-dark)" : "var(--danger)" }}
                    >
                      {variance > 0 ? "+" : ""}{fmtKES(Math.abs(variance))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
                Notes <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for today…"
                rows={3}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors resize-none"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {error && (
              <p className="text-sm rounded-xl px-4 py-3" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                {error}
              </p>
            )}

            <button
              onClick={handleClose}
              disabled={submitting}
              className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "var(--brand)", height: 52 }}
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              Close Day &amp; Save Report
            </button>
          </>
        )}
      </main>
    </div>
  );
}
