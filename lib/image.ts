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
