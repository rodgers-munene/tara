"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OwnerRoot() {
  const router = useRouter();
  useEffect(() => { router.replace("/owner/login"); }, [router]);
  return null;
}
