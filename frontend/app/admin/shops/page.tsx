"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "../../components/AdminAuthProvider";
import { adminRequest, useAdminApi, Owner, Shop, ShopRow } from "../shared";

export default function AdminShopsPage() {
  const { token } = useAdminAuth();
  const { data: shops = [], isLoading: loading, mutate: mutateShops } = useAdminApi<Shop[]>("/admin/shops/", token);
  const [updatingShop, setUpdatingShop] = useState<number | null>(null);

  function applyOwnerSubscription(ownerId: number | null, owner: Owner) {
    mutateShops(
      (prev = []) =>
        prev.map((s) =>
          s.owner_id === ownerId
            ? {
                ...s,
                plan: owner.plan,
                billing_cycle: owner.billing_cycle,
                trial_ends_at: owner.trial_ends_at,
                subscription_status: owner.subscription_status,
                subscription_ends_at: owner.subscription_ends_at,
              }
            : s,
        ),
      { revalidate: false },
    );
  }

  async function activateShop(shop: Shop, tier: string, cycle: string) {
    if (!token || !shop.owner_id) return;
    setUpdatingShop(shop.id);
    try {
      const owner = await adminRequest<Owner>(`/admin/owners/${shop.owner_id}/activate`, token, {
        method: "POST",
        body: JSON.stringify({ tier, cycle }),
      });
      applyOwnerSubscription(shop.owner_id, owner);
    } finally {
      setUpdatingShop(null);
    }
  }

  async function suspendShop(shop: Shop) {
    if (!token || !shop.owner_id) return;
    setUpdatingShop(shop.id);
    try {
      const owner = await adminRequest<Owner>(`/admin/owners/${shop.owner_id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ subscription_status: "expired" }),
      });
      applyOwnerSubscription(shop.owner_id, owner);
    } finally {
      setUpdatingShop(null);
    }
  }

  return (
    <main className="w-full max-w-400 px-4 py-6 lg:px-8 lg:py-10 flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Shops &amp; subscriptions</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
          Every shop on Tara, its plan, and its billing status.
        </p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
        </div>
      ) : shops.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-3"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>No shops yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3">
          {shops.map((shop) => (
            <ShopRow
              key={shop.id}
              shop={shop}
              updating={updatingShop === shop.id}
              onActivate={(tier, cycle) => activateShop(shop, tier, cycle)}
              onSuspend={() => suspendShop(shop)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
