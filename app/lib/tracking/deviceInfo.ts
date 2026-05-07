/**
 * PART 5 — device-info collection.
 *
 * Cached for the session — recomputing on every event would be
 * wasteful and the values rarely change mid-session. Viewport
 * captures the value at first call; resize changes are not chased
 * (the queue runs in background and a few-pixel skew doesn't
 * meaningfully affect downstream analytics).
 */

import type { DeviceInfo } from "../../types/tracking";

let cached: DeviceInfo | null = null;

export function getDeviceInfo(): DeviceInfo {
  if (cached) return cached;
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      platform:   "ssr",
      user_agent: "",
      language:   "en",
      viewport:   { w: 0, h: 0 },
      online:     true,
    };
  }
  cached = {
    platform:   navigator.platform || "unknown",
    user_agent: (navigator.userAgent || "").slice(0, 200),
    language:   navigator.language || "en",
    viewport:   { w: window.innerWidth, h: window.innerHeight },
    online:     navigator.onLine,
  };
  return cached;
}
