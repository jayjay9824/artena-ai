"use client";
import { useCallback, useEffect, useState } from "react";
import {
  type PendingScan,
  enqueueScan, listPendingScans, removeScan, countPendingScans,
} from "../../services/offlineQueue";

/**
 * STEP 3 — React surface for the offline scan queue.
 *
 *   isOnline       Tracks navigator.onLine + window online/offline events.
 *   pendingCount   Live count of scans waiting in IndexedDB.
 *   enqueue        Persist a scan locally. Refreshes pendingCount.
 *   syncNow        Drain the queue; only scans for which `sender`
 *                  resolves to true are removed (so failed sends stay
 *                  queued for the next online cycle).
 *
 * Consumers wire their own auto-sync trigger:
 *   useEffect(() => { if (isOnline) syncNow(mySender); }, [isOnline]);
 *
 * SSR safety: navigator/window references are guarded; on the server
 * the hook returns isOnline:true and pendingCount:0 with no-op writes.
 */
export function useOfflineQueue() {
  const [isOnline, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try { setCount(await countPendingScans()); }
    catch { /* IndexedDB unavailable (private mode / SSR) — leave count at 0 */ }
  }, []);

  const enqueue = useCallback(async (input: {
    imageBlob?:     Blob;
    extractedText?: string;
  }) => {
    const scan = await enqueueScan(input);
    await refresh();
    return scan;
  }, [refresh]);

  const syncNow = useCallback(
    async (sender: (scan: PendingScan) => Promise<boolean>): Promise<number> => {
      let drained = 0;
      try {
        const scans = await listPendingScans();
        for (const scan of scans) {
          let ok = false;
          try { ok = await sender(scan); }
          catch { ok = false; }
          if (ok) {
            await removeScan(scan.id);
            drained++;
          }
        }
      } finally {
        await refresh();
      }
      return drained;
    },
    [refresh],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    refresh();
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

  return { isOnline, pendingCount, enqueue, syncNow, refresh };
}
