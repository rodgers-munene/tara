"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Receipt, Users, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/sell", label: "Sell", icon: ShoppingCart },
  { href: "/inventory", label: "Items", icon: Package },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/customers", label: "Customers", icon: Users },
];

export default function NavBar() {
  const path = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {/* bottom nav — mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t lg:hidden"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
              style={{ color: active ? "var(--brand)" : "var(--text-3)" }}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.8}
                className="transition-transform active:scale-90"
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* sidebar — desktop */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 flex-col border-r z-30"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 px-5 h-16 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold"
            style={{ background: "var(--brand)" }}
          >
            T
          </div>
          <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
            Tara POS
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? "var(--brand-light)" : "transparent",
                  color: active ? "var(--brand-dark)" : "var(--text-2)",
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logged-in user + logout */}
        {user && (
          <div
            className="flex items-center gap-3 px-4 py-4 border-t flex-shrink-0"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                {user.name}
              </p>
              <p className="text-[11px] capitalize" style={{ color: "var(--text-3)" }}>
                {user.role}
              </p>
            </div>
            <button
              onClick={logout}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--text-3)" }}
              title="Sign out"
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
