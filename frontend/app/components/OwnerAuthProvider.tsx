"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface OwnerUser {
  id: number;
  name: string;
}

interface OwnerAuthContextType {
  owner: OwnerUser | null;
  token: string | null;
  initialized: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const OwnerAuthContext = createContext<OwnerAuthContextType>({
  owner: null,
  token: null,
  initialized: false,
  login: () => {},
  logout: () => {},
});

function parseOwnerToken(token: string): OwnerUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.owner) return null;
    return { id: parseInt(payload.sub), name: payload.name };
  } catch {
    return null;
  }
}

export function OwnerAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [owner, setOwner] = useState<OwnerUser | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("tara_owner_token");
    if (stored) {
      const parsed = parseOwnerToken(stored);
      if (parsed) {
        setToken(stored);
        setOwner(parsed);
      } else {
        localStorage.removeItem("tara_owner_token");
      }
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const publicPaths = ["/owner/login"];
    if (!owner && !publicPaths.includes(pathname)) {
      router.replace("/owner/login");
    }
    if (owner && pathname === "/owner/login") {
      router.replace("/owner/dashboard");
    }
  }, [initialized, owner, pathname, router]);

  function login(newToken: string) {
    const parsed = parseOwnerToken(newToken);
    if (!parsed) return;
    localStorage.setItem("tara_owner_token", newToken);
    setToken(newToken);
    setOwner(parsed);
  }

  function logout() {
    localStorage.removeItem("tara_owner_token");
    setToken(null);
    setOwner(null);
    router.replace("/owner/login");
  }

  return (
    <OwnerAuthContext.Provider value={{ owner, token, initialized, login, logout }}>
      {children}
    </OwnerAuthContext.Provider>
  );
}

export const useOwnerAuth = () => useContext(OwnerAuthContext);
