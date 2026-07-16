"use client";

import { LayoutDashboard, Users, Store } from "lucide-react";
import { AdminAuthProvider, useAdminAuth } from "../components/AdminAuthProvider";
import DashboardSidebar, { DashboardNavLink } from "../components/DashboardSidebar";

const links: DashboardNavLink[] = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/owners", label: "Owners", icon: Users },
  { href: "/admin/shops", label: "Shops", icon: Store },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAdminAuth();
  if (!admin) return <>{children}</>;
  return (
    <div className="min-h-svh" style={{ background: "var(--bg)" }}>
      <DashboardSidebar roleLabel="Platform admin" links={links} userName={admin.name} onLogout={logout} />
      <div className="lg:pl-56 pt-12 lg:pt-0 pb-16 lg:pb-0">{children}</div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <Shell>{children}</Shell>
    </AdminAuthProvider>
  );
}
