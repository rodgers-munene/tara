"use client";

import { useState, useEffect } from "react";
import { Delete, Loader2, Store, ArrowLeft, HelpCircle } from "lucide-react";
import { api, type StaffMember, type ShopInfo } from "../../lib/api";
import { useAuth } from "../components/AuthProvider";

const PIN_LENGTH = 4;

function PinDots({ filled }: { filled: number }) {
  return (
    <div className="flex items-center justify-center gap-4 my-6">
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 w-3.5 rounded-full transition-all duration-150"
          style={{
            background: i < filled ? "var(--brand)" : "var(--border-strong)",
            transform: i < filled ? "scale(1.2)" : "scale(1)",
          }}
        />
      ))}
    </div>
  );
}

function Numpad({ onPress }: { onPress: (key: string) => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
      {keys.map((key, i) => {
        if (!key) return <div key={i} />;
        return (
          <button
            key={i}
            onClick={() => onPress(key)}
            className="flex items-center justify-center rounded-2xl font-semibold text-xl transition-all active:scale-90 select-none"
            style={{
              height: 64,
              background: key === "del" ? "var(--surface-2)" : "var(--surface)",
              border: "1.5px solid var(--border)",
              color: key === "del" ? "var(--text-2)" : "var(--text)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {key === "del" ? <Delete size={20} /> : key}
          </button>
        );
      })}
    </div>
  );
}

// ── Brand header ──────────────────────────────────────────────────────────────
function BrandHeader({ shopName }: { shopName?: string }) {
  return (
    <div className="flex flex-col items-center mb-8">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl text-white text-xl font-bold mb-3 shadow"
        style={{ background: "var(--brand)" }}
      >
        T
      </div>
      <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
        {shopName ?? "Tara POS"}
      </h1>
    </div>
  );
}

// ── Shop code entry ───────────────────────────────────────────────────────────
function ShopCodeStep({ onFound }: { onFound: (info: ShopInfo) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = code.trim().toLowerCase();
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const info = await api.get<ShopInfo>(`/shops/${slug}`);
      localStorage.setItem("tara_shop_slug", info.slug);
      onFound(info);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Shop not found");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xs flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 mb-2">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
        >
          <Store size={22} />
        </div>
        <p className="text-base font-semibold text-center" style={{ color: "var(--text)" }}>
          Welcome back
        </p>
        <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>
          Enter your shop ID to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
              Shop ID
            </label>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: "var(--brand)" }}
            >
              <HelpCircle size={13} />
              What&apos;s this?
            </button>
          </div>

          {showHelp && (
            <div
              className="rounded-xl px-4 py-3 text-xs leading-relaxed"
              style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
            >
              Your shop ID is a short name for your shop, like{" "}
              <span className="font-mono font-semibold">mama-grace-shop</span>.
              Your shop owner or admin will give it to you.
            </div>
          )}

          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            placeholder="e.g. mama-grace-shop"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              height: 52,
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {error && (
          <p className="text-sm rounded-xl px-4 py-2.5"
            style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--brand)", height: 52 }}
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Continue
        </button>
      </form>
    </div>
  );
}

// ── Login page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();

  // "loading" | "enter-code" | "staff-list" | "enter-pin"
  const [step, setStep] = useState<"loading" | "enter-code" | "staff-list" | "enter-pin">("loading");
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const slug = localStorage.getItem("tara_shop_slug");
    if (!slug) {
      setStep("enter-code");
      return;
    }
    api.get<ShopInfo>(`/shops/${slug}`)
      .then((info) => {
        setShopInfo(info);
        setStep("staff-list");
      })
      .catch(() => {
        localStorage.removeItem("tara_shop_slug");
        setStep("enter-code");
      });
  }, []);

  function handleShopFound(info: ShopInfo) {
    setShopInfo(info);
    setStep("staff-list");
  }

  function handleNumpad(key: string) {
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      setError("");
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      submitPin(next);
    }
  }

  async function submitPin(enteredPin: string) {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post<{ access_token: string }>("/login/", {
        staff_id: selected.id,
        pin: enteredPin,
      });
      login(res.access_token);
    } catch {
      setError("Wrong PIN. Try again.");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }

  function changeShop() {
    localStorage.removeItem("tara_shop_slug");
    setShopInfo(null);
    setSelected(null);
    setPin("");
    setError("");
    setStep("enter-code");
  }

  if (step === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center" style={{ background: "var(--bg)" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--brand)" }} />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-start px-5 py-10"
      style={{ background: "var(--bg)" }}
    >
      <BrandHeader shopName={shopInfo?.name} />

      {step === "enter-code" && (
        <ShopCodeStep onFound={handleShopFound} />
      )}

      {step === "staff-list" && shopInfo && (
        <div className="w-full max-w-sm">
          <p className="text-sm font-medium text-center mb-5" style={{ color: "var(--text-2)" }}>
            Who&apos;s at the counter?
          </p>
          <div className="flex flex-col gap-2.5">
            {shopInfo.staff.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelected(s); setPin(""); setError(""); setStep("enter-pin"); }}
                className="flex items-center gap-4 w-full rounded-2xl px-4 py-3.5 text-left border-2 transition-all active:scale-98"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{s.name}</p>
                  <p className="text-xs capitalize" style={{ color: "var(--text-3)" }}>{s.role}</p>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={changeShop}
            className="w-full mt-5 text-xs font-medium text-center"
            style={{ color: "var(--text-3)" }}
          >
            Change shop ID
          </button>
        </div>
      )}

      {step === "enter-pin" && selected && (
        <div className="w-full max-w-sm flex flex-col items-center">
          <button
            onClick={() => { setSelected(null); setPin(""); setError(""); setStep("staff-list"); }}
            className="flex items-center gap-2 mb-6 text-sm font-medium"
            style={{ color: "var(--brand)" }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold mb-2"
            style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
          >
            {selected.name.charAt(0).toUpperCase()}
          </div>
          <p className="font-semibold text-base" style={{ color: "var(--text)" }}>
            {selected.name}
          </p>
          <p className="text-xs mt-0.5 mb-1" style={{ color: "var(--text-3)" }}>
            Enter your 4-digit PIN
          </p>

          <PinDots filled={pin.length} />

          {error && (
            <p className="text-sm mb-4 text-center" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          {submitting ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
            </div>
          ) : (
            <Numpad onPress={handleNumpad} />
          )}
        </div>
      )}

      <div className="mt-auto pt-10 text-center">
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          Shop owner?{" "}
          <a href="/admin/login" style={{ color: "var(--brand)", fontWeight: 500 }}>
            Go to Business Hub
          </a>
        </p>
      </div>
    </div>
  );
}
