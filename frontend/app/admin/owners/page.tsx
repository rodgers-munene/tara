"use client";

import { useState } from "react";
import { Loader2, Plus, CheckCircle, XCircle, Users } from "lucide-react";
import { useAdminAuth } from "../../components/AdminAuthProvider";
import { adminRequest, useAdminApi, CreateOwnerModal, Owner, TIER_OPTIONS, shopStatusLabel } from "../shared";

export default function AdminOwnersPage() {
  const { token } = useAdminAuth();
  const { data: owners = [], isLoading: loading, mutate: mutateOwners } = useAdminApi<Owner[]>("/admin/owners/", token);
  const [showCreate, setShowCreate] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [updatingSub, setUpdatingSub] = useState<number | null>(null);
  const [tierByOwner, setTierByOwner] = useState<Record<number, "small" | "medium">>({});
  const [cycleByOwner, setCycleByOwner] = useState<Record<number, string>>({});

  async function toggleActive(owner: Owner) {
    if (!token) return;
    setToggling(owner.id);
    try {
      await adminRequest(`/admin/owners/${owner.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ active: !owner.active }),
      });
      mutateOwners(
        (prev = []) => prev.map((o) => (o.id === owner.id ? { ...o, active: !o.active } : o)),
        { revalidate: false },
      );
    } finally {
      setToggling(null);
    }
  }

  async function activateOwner(owner: Owner) {
    if (!token) return;
    const tier = tierByOwner[owner.id] ?? "small";
    const cycle = cycleByOwner[owner.id] ?? TIER_OPTIONS[tier][0].cycle;
    setUpdatingSub(owner.id);
    try {
      const updated = await adminRequest<Owner>(`/admin/owners/${owner.id}/activate`, token, {
        method: "POST",
        body: JSON.stringify({ tier, cycle }),
      });
      mutateOwners((prev = []) => prev.map((o) => (o.id === owner.id ? updated : o)), { revalidate: false });
    } finally {
      setUpdatingSub(null);
    }
  }

  async function suspendOwner(owner: Owner) {
    if (!token) return;
    setUpdatingSub(owner.id);
    try {
      const updated = await adminRequest<Owner>(`/admin/owners/${owner.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ subscription_status: "expired" }),
      });
      mutateOwners((prev = []) => prev.map((o) => (o.id === owner.id ? updated : o)), { revalidate: false });
    } finally {
      setUpdatingSub(null);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 lg:px-8 lg:py-10 flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Owner accounts</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Every business owner registered on Tara.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl text-white"
          style={{ background: "var(--brand)" }}
        >
          <Plus size={15} /> New owner
        </button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
        </div>
      ) : owners.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-3"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
        >
          <Users size={36} strokeWidth={1} style={{ color: "var(--text-3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
            No owner accounts yet, create the first one
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
          {owners.map((owner) => {
            const status = shopStatusLabel(owner);
            const tier = tierByOwner[owner.id] ?? (owner.plan === "medium" ? "medium" : "small");
            const cycle = cycleByOwner[owner.id] ?? TIER_OPTIONS[tier][0].cycle;
            const selectStyle = {
              borderColor: "var(--border)",
              background: "var(--surface-2)",
              color: "var(--text)",
            };
            return (
              <div
                key={owner.id}
                className="rounded-2xl p-4 flex flex-col gap-3"
                style={{
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  opacity: owner.active ? 1 : 0.6,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
                  >
                    {owner.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{owner.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{owner.email}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                      {owner.shop_count} {owner.shop_count === 1 ? "shop" : "shops"}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleActive(owner)}
                    disabled={toggling === owner.id}
                    className="flex items-center gap-1 text-xs font-medium shrink-0"
                    style={{ color: owner.active ? "var(--brand)" : "var(--text-3)" }}
                  >
                    {toggling === owner.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : owner.active ? (
                      <CheckCircle size={13} />
                    ) : (
                      <XCircle size={13} />
                    )}
                    {owner.active ? "Active" : "Inactive"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs" style={{ color: status.color }}>{status.text}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                      Plan: {owner.plan}
                      {owner.billing_cycle ? ` (${owner.billing_cycle})` : ""}
                    </p>
                  </div>
                  {owner.subscription_status === "active" && (
                    <button
                      onClick={() => suspendOwner(owner)}
                      disabled={updatingSub === owner.id}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-60"
                      style={{ color: "var(--text-3)" }}
                    >
                      {updatingSub === owner.id && <Loader2 size={12} className="animate-spin" />}
                      Suspend
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={tier}
                    onChange={(e) => {
                      const next = e.target.value as "small" | "medium";
                      setTierByOwner((prev) => ({ ...prev, [owner.id]: next }));
                      setCycleByOwner((prev) => ({ ...prev, [owner.id]: TIER_OPTIONS[next][0].cycle }));
                    }}
                    className="text-xs rounded-lg border px-2 py-1.5 outline-none min-w-0"
                    style={selectStyle}
                  >
                    <option value="small">Small Enterprise</option>
                    <option value="medium">Medium Enterprise</option>
                  </select>
                  <select
                    value={cycle}
                    onChange={(e) => setCycleByOwner((prev) => ({ ...prev, [owner.id]: e.target.value }))}
                    className="text-xs rounded-lg border px-2 py-1.5 flex-1 outline-none min-w-0"
                    style={selectStyle}
                  >
                    {TIER_OPTIONS[tier].map((opt) => (
                      <option key={opt.cycle} value={opt.cycle}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => activateOwner(owner)}
                    disabled={updatingSub === owner.id}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0 disabled:opacity-60"
                    style={{ background: "var(--brand)" }}
                  >
                    {updatingSub === owner.id && <Loader2 size={12} className="animate-spin" />}
                    Activate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && token && (
        <CreateOwnerModal
          token={token}
          onCreated={(owner) => {
            mutateOwners((prev = []) => [owner, ...prev], { revalidate: false });
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </main>
  );
}
