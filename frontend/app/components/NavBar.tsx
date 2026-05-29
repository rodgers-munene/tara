"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Receipt, Users, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useState } from "react";

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

  const [showLogout, setShowLogout] = useState(false);

  return (
    <>
      {/* top header — mobile */}
      <header
        className="fixed top-0 left-0 right-0 z-30 flex items-center px-4 h-12 border-b lg:hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 flex-1">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md text-white text-xs font-bold"
            style={{ background: "var(--brand)" }}
          >
            T
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
            Tara POS
          </span>
        </div>

        {user && (
          <div className="relative">
            <button
              onClick={() => setShowLogout((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "var(--brand-light)", color: "var(--brand-dark)" }}
            >
              {user.name.charAt(0).toUpperCase()}
            </button>

            {showLogout && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLogout(false)}
                />
                <div
                  className="absolute right-0 top-9 z-50 rounded-xl shadow-lg border min-w-40 p-1"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="px-3 py-2 border-b mb-1" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{user.name}</p>
                    <p className="text-[11px] capitalize" style={{ color: "var(--text-3)" }}>{user.role}</p>
                  </div>
                  <button
                    onClick={() => { setShowLogout(false); logout(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ color: "var(--danger)" }}
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

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
