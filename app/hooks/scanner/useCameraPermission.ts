"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraPermission } from "../../types/scanner";
import { isInAppBrowser }       from "../../utils/browserDetect";

/**
 * Specific failure modes surfaced by requestPermission(). The UI
 * (CameraPermissionPrompt or any later surface) reads `errorCode`
 * + `errorMessage` to show targeted recovery copy instead of a
 * single generic "denied" string.
 */
export type CameraErrorCode =
  | "denied"               // user blocked permission in the browser
  | "in_app_unsupported"   // KakaoTalk / Naver / FBAN(V) / IG / LINE
  | "camera_unsupported"   // navigator.mediaDevices.getUserMedia missing
  | "camera_unavailable"   // generic gUM failure
  | "camera_not_found"     // NotFoundError / DevicesNotFoundError
  | "camera_in_use";       // NotReadableError / TrackStartError

interface UseCameraPermissionReturn {
  permissionStatus:  CameraPermission;
  requestPermission: () => Promise<boolean>;
  /** Concrete failure mode for the most recent denial; null when
   *  no permission attempt has failed yet. */
  errorCode:         CameraErrorCode | null;
  /** Korean recovery message keyed off errorCode — surface
   *  directly in the UI without further mapping. */
  errorMessage:      string | null;
}

/* Korean recovery messages — short, action-oriented, never leak
   browser-internal error names. The UI uses these verbatim. */
const ERROR_MESSAGES: Record<CameraErrorCode, string> = {
  denied:
    "카메라 권한이 거부되었습니다.\n브라우저 설정에서 권한을 허용해주세요.",
  in_app_unsupported:
    "카카오톡 등 인앱 브라우저는 카메라를 지원하지 않습니다.\nChrome 또는 Safari에서 열어주세요.",
  camera_unsupported:
    "이 브라우저는 카메라를 지원하지 않습니다.",
  camera_unavailable:
    "카메라를 시작할 수 없습니다.",
  camera_not_found:
    "카메라를 찾을 수 없습니다.",
  camera_in_use:
    "카메라가 다른 앱에서 사용 중입니다.\n다른 앱을 종료하고 다시 시도해주세요.",
};

/**
 * STEP 3 — Strengthened camera permission tracker.
 *
 *   Pre-flight checks fire before any getUserMedia call:
 *     1. isInAppBrowser → "in_app_unsupported"
 *        (KakaoTalk etc. expose mediaDevices but always fail at
 *        gUM; surface the warning before the user hits a black
 *        screen.)
 *     2. missing mediaDevices.getUserMedia → "camera_unsupported"
 *
 *   Concurrent calls are deduped via isRequestingRef so a double-
 *   tap on SCAN doesn't queue duplicate OS prompts (a known UX
 *   issue on some Chromium builds).
 *
 *   Caught errors are discriminated by `name` so the UI can offer
 *   the right recovery copy:
 *     NotAllowedError / PermissionDeniedError → "denied"
 *     NotFoundError / DevicesNotFoundError    → "camera_not_found"
 *     NotReadableError / TrackStartError      → "camera_in_use"
 *     anything else                           → "camera_unavailable"
 *
 *   Live tracking via the Permissions API (where supported)
 *   continues to mirror the OS state into permissionStatus.
 */
export function useCameraPermission(): UseCameraPermissionReturn {
  const [permissionStatus, setPermissionStatus] = useState<CameraPermission>("unknown");
  const [errorCode,        setErrorCode]        = useState<CameraErrorCode | null>(null);

  /* Live Permissions API tracking (Chromium / modern Safari).
     Firefox doesn't expose the "camera" name; we fall back to
     "prompt" so the UI surfaces the soft prompt and lets the
     actual gUM call drive the verdict. */
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

  /* Dedupe in-flight gUM requests — multiple SCAN taps used to
     queue duplicate OS prompts on some Chromium builds. */
  const isRequestingRef = useRef(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isRequestingRef.current) return false;
    isRequestingRef.current = true;

    try {
      // Reset stale error from a prior attempt; the next failure
      // will repopulate it before we return.
      setErrorCode(null);

      // Pre-flight 1 — in-app WebViews never succeed at gUM.
      if (isInAppBrowser()) {
        setErrorCode("in_app_unsupported");
        setPermissionStatus("denied");
        return false;
      }

      // Pre-flight 2 — runtime missing mediaDevices entirely.
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setErrorCode("camera_unsupported");
        setPermissionStatus("denied");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      // Drop the test stream immediately — useCameraLifecycle
      // re-acquires with the proper resolution / framerate ideals.
      stream.getTracks().forEach(t => t.stop());
      setPermissionStatus("granted");
      return true;
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "";
      let code: CameraErrorCode;
      switch (name) {
        case "NotAllowedError":
        case "PermissionDeniedError":
          code = "denied";
          break;
        case "NotFoundError":
        case "DevicesNotFoundError":
          code = "camera_not_found";
          break;
        case "NotReadableError":
        case "TrackStartError":
          code = "camera_in_use";
          break;
        default:
          code = "camera_unavailable";
      }
      setErrorCode(code);
      setPermissionStatus("denied");
      return false;
    } finally {
      isRequestingRef.current = false;
    }
  }, []);

  return {
    permissionStatus,
    requestPermission,
    errorCode,
    errorMessage: errorCode ? ERROR_MESSAGES[errorCode] : null,
  };
}
