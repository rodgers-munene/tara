export default function OfflinePage() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-3 text-center p-6">
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-sm opacity-70">
        Reconnect to load this page. Sales you record will still be queued and
        synced once you&apos;re back online.
      </p>
    </div>
  );
}
