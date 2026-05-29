"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthUser {
  id: number;
  name: string;
  role: string;
  shop_id: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  initialized: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
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
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
  }

  function logout() {
    localStorage.removeItem("tara_token");
    setToken(null);
    setUser(null);
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, token, initialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
