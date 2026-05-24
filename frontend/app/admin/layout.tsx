"use client";

import { AdminAuthProvider } from "../components/AdminAuthProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
