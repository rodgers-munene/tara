"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const DISMISSED_KEY = "tara-install-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || localStorage.getItem(DISMISSED_KEY)) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    if (ios) setVisible(true);

    function onBeforeInstallPrompt(e: BeforeInstallPromptEvent) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-200 flex items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-lg sm:left-auto sm:right-4 sm:w-80"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
    >
      {isIOS ? (
        <p className="flex-1">
          Install Tara: tap <Share size={13} className="inline" /> then &quot;Add to Home Screen&quot;.
        </p>
      ) : (
        <>
          <span className="flex-1">Install Tara for quicker, offline-ready access.</span>
          <button
            onClick={install}
            className="rounded-md px-3 py-1.5 font-semibold text-white"
            style={{ background: "var(--brand)" }}
          >
            Install
          </button>
        </>
      )}
      <button onClick={dismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
