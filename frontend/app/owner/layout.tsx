"use client";

import { OwnerAuthProvider } from "../components/OwnerAuthProvider";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerAuthProvider>{children}</OwnerAuthProvider>;
}
