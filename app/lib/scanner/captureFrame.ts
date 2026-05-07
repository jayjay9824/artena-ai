/**
 * STEP 4 — Capture the current video frame as a Blob + data URL.
 *
 * Used at scannerState === "success" so the routing handler has the
 * exact frame the user saw when the lock fired. Returns null when
 * the video isn't ready yet (readyState < HAVE_CURRENT_DATA) so
 * callers can fall back gracefully.
 */

export interface CapturedFrame {
  blob:    Blob;
  dataUrl: string;
  width:   number;
  height:  number;
}

export async function captureVideoFrame(
  video:    HTMLVideoElement | null,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
  quality:  number = 0.92,
): Promise<CapturedFrame | null> {
  if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, quality);
  });
  if (!blob) return null;

  return {
    blob,
    dataUrl: canvas.toDataURL(mimeType, quality),
    width:   canvas.width,
    height:  canvas.height,
  };
}
