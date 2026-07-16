"use client";

import { LayoutDashboard, CreditCard, Settings } from "lucide-react";
import { OwnerAuthProvider, useOwnerAuth } from "../components/OwnerAuthProvider";
import DashboardSidebar, { DashboardNavLink } from "../components/DashboardSidebar";

const links: DashboardNavLink[] = [
  { href: "/owner/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/owner/billing", label: "Billing", icon: CreditCard },
  { href: "/owner/settings", label: "Settings", icon: Settings },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { owner, logout } = useOwnerAuth();

  if (!owner) return <>{children}</>;

  return (
    <div className="min-h-svh" style={{ background: "var(--bg)" }}>
      <DashboardSidebar roleLabel="Owner" links={links} userName={owner.name} onLogout={logout} />
      <div className="lg:pl-56 pt-12 lg:pt-0 pb-16 lg:pb-0">{children}</div>
    </div>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerAuthProvider>
      <Shell>{children}</Shell>
    </OwnerAuthProvider>
  );
}
