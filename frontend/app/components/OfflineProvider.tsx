"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { WifiOff } from "lucide-react";
import { BackgroundSyncQueueStore } from "serwist";
import { invalidateApi } from "../../lib/api";

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

  const queueStore = useMemo(
    () => new BackgroundSyncQueueStore("tara-writes-queue"),
    [],
  );

  const refreshQueue = useCallback(async () => {
    setQueueSize(await queueStore.size());
  }, [queueStore]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    refreshQueue();

    function handleOnline() {
      refreshQueue();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshQueue]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "tara-queue-synced") {
        refreshQueue();
        invalidateApi("/products");
        invalidateApi("/sales");
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [refreshQueue]);

  return (
    <OfflineContext.Provider value={{ isOnline, queueSize, refreshQueue }}>
      {children}

      {/* Offline banner */}
      {!isOnline && (
        <div
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white"
          style={{ background: "var(--warning)" }}
        >
          <WifiOff size={13} />
          Offline, sales will sync when reconnected
          {queueSize > 0 && ` · ${queueSize} queued`}
        </div>
      )}

      {/* Syncing banner */}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
