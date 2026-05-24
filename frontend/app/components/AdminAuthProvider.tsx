"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AdminUser {
  id: number;
  name: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  token: string | null;
  initialized: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  token: null,
  initialized: false,
  login: () => {},
  logout: () => {},
});

function parseAdminToken(token: string): AdminUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.superadmin) return null;
    return { id: parseInt(payload.sub), name: payload.name };
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("tara_admin_token");
    if (stored) {
      const parsed = parseAdminToken(stored);
      if (parsed) {
        setToken(stored);
        setAdmin(parsed);
      } else {
        localStorage.removeItem("tara_admin_token");
      }
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const publicAdminPaths = ["/admin/login", "/admin/setup"];
    if (!admin && !publicAdminPaths.includes(pathname)) {
      router.replace("/admin/login");
    }
    if (admin && pathname === "/admin/login") {
      router.replace("/admin/dashboard");
    }
  }, [initialized, admin, pathname, router]);

  function login(newToken: string) {
    const parsed = parseAdminToken(newToken);
    if (!parsed) return;
    localStorage.setItem("tara_admin_token", newToken);
    setToken(newToken);
    setAdmin(parsed);
  }

  function logout() {
    localStorage.removeItem("tara_admin_token");
    setToken(null);
    setAdmin(null);
    router.replace("/admin/login");
  }

  return (
    <AdminAuthContext.Provider value={{ admin, token, initialized, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
