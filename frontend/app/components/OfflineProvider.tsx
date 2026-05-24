"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { WifiOff, Loader2 } from "lucide-react";
import { getQueue, dequeueItem } from "../../lib/offlineQueue";
import { api } from "../../lib/api";

interface OfflineContextType {
  isOnline: boolean;
  queueSize: number;
  refreshQueue: () => void;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  queueSize: 0,
  refreshQueue: () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshQueue = useCallback(() => {
    setQueueSize(getQueue().length);
  }, []);

  const processQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;
    setSyncing(true);
    for (const item of queue) {
      try {
        await api.post("/sales/", item.payload);
        dequeueItem(item.id);
      } catch {
        // leave in queue — will retry next time we come online
        break;
      }
    }
    setQueueSize(getQueue().length);
    setSyncing(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    setQueueSize(getQueue().length);

    function handleOnline() {
      setIsOnline(true);
      processQueue();
    }
    function handleOffline() {
      setIsOnline(false);
      setQueueSize(getQueue().length);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processQueue]);

  return (
    <OfflineContext.Provider value={{ isOnline, queueSize, refreshQueue }}>
      {children}

      {/* Offline banner */}
      {!isOnline && !syncing && (
        <div
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white"
          style={{ background: "var(--warning)" }}
        >
          <WifiOff size={13} />
          Offline — sales will sync when reconnected
          {queueSize > 0 && ` · ${queueSize} queued`}
        </div>
      )}

      {/* Syncing banner */}
      {syncing && (
        <div
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white"
          style={{ background: "var(--brand)" }}
        >
          <Loader2 size={13} className="animate-spin" />
          Syncing offline sales…
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
