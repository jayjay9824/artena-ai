/**
 * STEP 3 — Offline scan queue (IndexedDB).
 *
 * Pending scans are persisted in IndexedDB so a user can hit the
 * scanner without connectivity and have the request fire automatically
 * once the network returns. localStorage is unsuitable here — the
 * imageBlob payload is binary and frequently larger than 1 MB.
 *
 * Schema:
 *   db:       artena-offline
 *   store:    pendingScans   (keyPath: "id")
 *   record:   { id, imageBlob?, extractedText?, timestamp }
 */

import { nanoid } from "nanoid";

const DB_NAME    = "artena-offline";
const DB_VERSION = 1;
const STORE      = "pendingScans";

export interface PendingScan {
  id:             string;
  imageBlob?:     Blob;
  extractedText?: string;
  timestamp:      number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable in this environment"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error);
  });
}

export async function enqueueScan(input: {
  imageBlob?:     Blob;
  extractedText?: string;
}): Promise<PendingScan> {
  const scan: PendingScan = {
    id:            nanoid(12),
    imageBlob:     input.imageBlob,
    extractedText: input.extractedText,
    timestamp:     Date.now(),
  };
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).add(scan);
  await txDone(tx);
  db.close();
  return scan;
}

export async function listPendingScans(): Promise<PendingScan[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).getAll();
  const result = await new Promise<PendingScan[]>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as PendingScan[]);
    req.onerror   = () => reject(req.error);
  });
  db.close();
  return result.sort((a, b) => a.timestamp - b.timestamp);
}

export async function removeScan(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}

export async function countPendingScans(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).count();
  const n = await new Promise<number>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  db.close();
  return n;
}

export async function clearPendingScans(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).clear();
  await txDone(tx);
  db.close();
}
