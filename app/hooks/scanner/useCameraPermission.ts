"use client";
import { useCallback, useEffect, useState } from "react";
import type { CameraPermission } from "../../types/scanner";

interface UseCameraPermissionReturn {
  permissionStatus:  CameraPermission;
  requestPermission: () => Promise<boolean>;
  error:             string | null;
}

/**
 * STEP 1 — Camera permission tracker.
 *
 * Reads live state via the Permissions API where supported and
 * exposes a `requestPermission()` helper that fires a brief
 * getUserMedia call to trigger the prompt, then immediately stops
 * the tracks. The actual stream is owned by useCameraLifecycle so
 * permission and lifecycle stay decoupled.
 *
 * Spec rule: a denied result must NOT surface a technical browser
 * error to the user. This hook captures `error` separately for
 * truly unsupported environments; the screen layer handles denied
 * by showing fallback actions.
 */
export function useCameraPermission(): UseCameraPermissionReturn {
  const [permissionStatus, setPermissionStatus] = useState<CameraPermission>("unknown");
  const [error, setError] = useState<string | null>(null);

  // Live tracking via Permissions API (Chromium / Safari modern).
  // Firefox doesn't expose "camera" name → fall back to "prompt".
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      setPermissionStatus("prompt");
      return;
    }

    let cancelled = false;
    let permRef: PermissionStatus | null = null;

    const sync = () => {
      if (!permRef) return;
      const next: CameraPermission =
        permRef.state === "granted" ? "granted" :
        permRef.state === "denied"  ? "denied"  :
                                       "prompt";
      setPermissionStatus(next);
    };

    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then(p => {
        if (cancelled) return;
        permRef = p;
        sync();
        p.addEventListener("change", sync);
      })
      .catch(() => {
        if (!cancelled) setPermissionStatus("prompt");
      });

    return () => {
      cancelled = true;
      if (permRef) permRef.removeEventListener("change", sync);
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("camera_unsupported");
      setPermissionStatus("denied");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      // Drop the test stream immediately — useCameraLifecycle re-acquires
      // with the proper resolution / framerate idealss.
      stream.getTracks().forEach(t => t.stop());
      setPermissionStatus("granted");
      return true;
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermissionStatus("denied");
      } else {
        // Unsupported / hardware failure — record but don't render the
        // browser's raw error string. Screen surfaces the fallback row.
        setError("camera_unavailable");
        setPermissionStatus("denied");
      }
      return false;
    }
  }, []);

  return { permissionStatus, requestPermission, error };
}
