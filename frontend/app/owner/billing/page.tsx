"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard, X } from "lucide-react";
import { useOwnerAuth } from "../../components/OwnerAuthProvider";
import { ownerRequest, useOwnerApi, Shop, subscriptionLabel, UpgradeModal } from "../shared";

export default function OwnerBillingPage() {
  const { token } = useOwnerAuth();
  const { data: shops = [], isLoading: loading, mutate: load } = useOwnerApi<Shop[]>("/owner/shops/", token);
  const [upgradeShop, setUpgradeShop] = useState<Shop | null>(null);
  const [verifyBanner, setVerifyBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Paystack redirects back here with ?reference=|trxref= after checkout.
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

  return (
    <main className="w-full px-4 py-6 lg:px-10 lg:py-10 flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Billing</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
          Subscription status and plan for every shop you own.
        </p>
      </div>

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

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
        </div>
      ) : shops.length === 0 ? (
        <div
          className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
        >
          <CreditCard size={32} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />
          <p className="text-sm" style={{ color: "var(--text-3)" }}>Create a shop first to see billing here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {shops.map((shop) => {
            const label = subscriptionLabel(shop);
            const isTrialOrExpired = shop.subscription_status !== "active" || (label.text.includes("ended") || label.text.includes("expired"));
            return (
              <div
                key={shop.id}
                className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }} title={shop.name}>{shop.name}</p>
                  <p className="text-xs mt-1" style={{ color: label.color }}>{label.text}</p>
                  {shop.billing_cycle && (
                    <p className="text-[11px] mt-0.5 capitalize" style={{ color: "var(--text-3)" }}>
                      {shop.billing_cycle} billing
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setUpgradeShop(shop)}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white shrink-0"
                  style={{ background: isTrialOrExpired ? "var(--brand)" : "var(--surface-2)", color: isTrialOrExpired ? "#fff" : "var(--text-2)" }}
                >
                  {isTrialOrExpired ? "Upgrade now" : "Change plan"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {upgradeShop && token && (
        <UpgradeModal shop={upgradeShop} token={token} onClose={() => setUpgradeShop(null)} />
      )}
    </main>
  );
}
