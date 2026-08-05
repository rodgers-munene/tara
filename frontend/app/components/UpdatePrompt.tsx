"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useSerwist } from "@serwist/turbopack/react";

export function UpdatePrompt() {
  const { serwist } = useSerwist();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!serwist) return;

    function onWaiting() {
      setUpdateReady(true);
    }
    function onControlling() {
      window.location.reload();
    }

    serwist.addEventListener("waiting", onWaiting);
    serwist.addEventListener("controlling", onControlling);
    return () => {
      serwist.removeEventListener("waiting", onWaiting);
      serwist.removeEventListener("controlling", onControlling);
    };
  }, [serwist]);

  if (!updateReady) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-200 flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg sm:left-auto sm:right-4 sm:w-80"
      style={{ background: "var(--brand)" }}
    >
      <span>A new version of Tara is available.</span>
      <button
        onClick={() => serwist?.messageSkipWaiting()}
        className="flex shrink-0 items-center gap-1 rounded-md bg-white/20 px-3 py-1.5 font-semibold"
      >
        <RefreshCw size={13} />
        Refresh
      </button>
    </div>
  );
}
