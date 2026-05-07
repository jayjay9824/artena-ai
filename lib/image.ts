/**
 * Image utilities — client-only.
 */

export type DataUrlParts = {
  mimeType: string;
  base64: string;
};

/**
 * Parse a data: URL into mime type + base64 payload.
 * Returns null if the input is not a base64 data URL.
 *
 *   "data:image/jpeg;base64,/9j/..."
 *     → { mimeType: "image/jpeg", base64: "/9j/..." }
 */
export function extractFromDataUrl(dataUrl: string): DataUrlParts | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

/**
 * Read a File as a data: URL on the client.
 * Wraps FileReader.readAsDataURL in a promise.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('unexpected reader result'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize a data: URL to fit within maxWidth × maxHeight while preserving
 * aspect ratio. Returns a JPEG data: URL at the given quality.
 *
 * Used to keep scan-history thumbnails small enough for localStorage
 * (~50–150 KB each), so we can hold ~30 items inside the ~5 MB quota.
 */
/**
 * Grab the current frame of a playing <video> as a JPEG data URL.
 * Returns empty string on any failure (video not ready, no canvas
 * context, taint, etc.) so callers can degrade to a file picker.
 */
export function captureFromVideo(video: HTMLVideoElement, quality = 0.85): string {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (w === 0 || h === 0) return '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(video, 0, 0, w, h);
  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return '';
  }
}

export function resizeDataUrl(
  dataUrl: string,
  maxWidth = 480,
  maxHeight = 600,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('no canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err as Error);
      }
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
}
