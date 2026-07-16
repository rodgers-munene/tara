"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, type ShopBrief } from "../../lib/api";

interface AuthUser {
  id: number;
  name: string;
  role: string;
  shop_id: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  shop: ShopBrief | null;
  initialized: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  shop: null,
  initialized: false,
  login: () => {},
  logout: () => {},
});

function parseToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.superadmin) return null;
    return {
      id: parseInt(payload.sub),
      name: payload.name,
      role: payload.role,
      shop_id: payload.shop_id ?? null,
    };
  } catch {
    return null;
  }
}

const PUBLIC_PATHS = ["/login"];
const ADMIN_PATHS = ["/admin"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<ShopBrief | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user?.shop_id) {
      setShop(null);
      return;
    }
    api.get<ShopBrief>("/shops/me").then(setShop).catch(() => setShop(null));
  }, [user?.shop_id]);

  useEffect(() => {
    function onBlocked(e: Event) {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      setBlockedMessage(detail?.message ?? "Your subscription needs to be renewed.");
    }
    window.addEventListener("tara:subscription-blocked", onBlocked);
    return () => window.removeEventListener("tara:subscription-blocked", onBlocked);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("tara_token");
    if (stored) {
      const parsed = parseToken(stored);
      if (parsed) {
        setToken(stored);
        setUser(parsed);
      } else {
        localStorage.removeItem("tara_token");
      }
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    const isAdmin = pathname.startsWith("/admin");
    const isOwner = pathname.startsWith("/owner");
    if (isAdmin || isOwner) return;
    if (!user && !isPublic) {
      router.replace("/login");
    }
    if (user && pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [initialized, user, pathname, router]);

  function login(newToken: string) {
    const parsed = parseToken(newToken);
    if (!parsed) return;
    localStorage.setItem("tara_token", newToken);
    setToken(newToken);
    setUser(parsed);
    setBlockedMessage(null);
  }

  function logout() {
    localStorage.removeItem("tara_token");
    setToken(null);
    setUser(null);
    setBlockedMessage(null);
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, token, shop, initialized, login, logout }}>
      {children}
      {blockedMessage && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-5"
          style={{ background: "var(--bg)" }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-4 text-center"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "var(--danger-light)" }}
            >
              <span className="text-2xl">⏳</span>
            </div>
            <div>
              <p className="font-bold text-lg" style={{ color: "var(--text)" }}>
                Access paused
              </p>
              <p className="text-sm mt-1.5" style={{ color: "var(--text-2)" }}>
                {blockedMessage}
              </p>
              <p className="text-xs mt-3" style={{ color: "var(--text-3)" }}>
                Ask the shop owner to renew from their dashboard, then try again.
              </p>
            </div>
            <div className="flex gap-2 w-full mt-1">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-xl text-sm font-medium py-2.5"
                style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
              >
                Try again
              </button>
              <button
                onClick={logout}
                className="flex-1 rounded-xl text-sm font-semibold text-white py-2.5"
                style={{ background: "var(--brand)" }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
