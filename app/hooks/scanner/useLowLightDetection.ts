"use client";
import { useEffect, useState } from "react";

/**
 * Lightweight luminance sampling — averages a 24×24 downsample of the
 * live preview every ~1.1s using Rec. 601 weights and reports
 * `lowLight: true` when the average dips below the threshold.
 *
 * Mirrors the legacy analyze/scanner low-light hint so the new layer
 * can surface the flash icon contextually without warning text.
 */
export function useLowLightDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isActive: boolean,
  threshold = 55,
  intervalMs = 1100,
): boolean {
  const [lowLight, setLowLight] = useState(false);

  useEffect(() => {
    if (!isActive) { setLowLight(false); return; }
    if (typeof document === "undefined") return;

    const canvas = document.createElement("canvas");
    canvas.width  = 24;
    canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const sample = () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || v.videoWidth === 0) return;
      try {
        ctx.drawImage(v, 0, 0, 24, 24);
        const { data } = ctx.getImageData(0, 0, 24, 24);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        }
        const avg = sum / (data.length / 4); // 0..255
        setLowLight(avg < threshold);
      } catch {
        /* ignore sampling errors */
      }
    };

    sample();
    const id = setInterval(sample, intervalMs);
    return () => clearInterval(id);
  }, [videoRef, isActive, threshold, intervalMs]);

  return lowLight;
}
