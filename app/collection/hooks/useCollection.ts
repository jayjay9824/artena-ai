"use client";
import { useState, useEffect, useCallback } from "react";

export interface CollectionAuction    { date: string; work: string; house: string; result: string; estimate: string; note: string; }
export interface CollectionWork       { title: string; year: string; medium: string; location: string; }
export interface CollectionMuseum     { inst: string; city: string; period: string; work: string; }
export interface CollectionCritic     { critic: string; source: string; year: string; quote: string; }
export interface CollectionExhibition { title: string; venue: string; city: string; year: string; type: string; }

export type AnalysisCategory = "painting" | "sculpture" | "architecture" | "artifact" | "cultural_site";

export interface CollectionAnalysis {
  category?: AnalysisCategory;
  title?: string;
  artist?: string;
  year?: string;
  style?: string;
  description?: string;
  emotions?: Record<string, number>;
  colorPalette?: string[];
  keywords?: string[];
  marketNote?: string;
  auctions?: CollectionAuction[];
  collections?: CollectionMuseum[];
  works?: CollectionWork[];
  critics?: CollectionCritic[];
  exhibitions?: CollectionExhibition[];
  /** Model's self-rated identification confidence (0-100). Optional —
   *  older reports stored before this field was added simply omit it
   *  and the derive fallback picks up the heuristic value. */
  recognitionConfidence?: number;
  /** One-line evidence the model used to identify the work. */
  identificationEvidence?: string;
}

export interface CollectionItem {
  id: string;
  savedAt: string;
  liked: boolean;
  saved: boolean;
  collected: boolean;
  analysis: CollectionAnalysis;
  imagePreview?: string | null;
}

const LS_KEY = "artena_collection_v1";

function readLS(): CollectionItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}

function writeLS(items: CollectionItem[]) {
  const safe = items.map(i => ({
    ...i,
    // drop large base64 images to avoid localStorage quota errors
    imagePreview: i.imagePreview && i.imagePreview.length > 120_000 ? null : i.imagePreview,
  }));
  try { localStorage.setItem(LS_KEY, JSON.stringify(safe)); } catch { /* quota */ }
}

export function makeItemId(artist?: string, title?: string): string {
  return `${artist ?? "unknown"}__${title ?? "untitled"}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_]/g, "-")
    .slice(0, 80);
}

export function useCollection() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readLS());
    setHydrated(true);
  }, []);

  const upsert = useCallback((item: CollectionItem) => {
    setItems(prev => {
      const next = [item, ...prev.filter(i => i.id !== item.id)];
      writeLS(next);
      return next;
    });
  }, []);

  const patch = useCallback((id: string, changes: Partial<CollectionItem>) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...changes } : i);
      writeLS(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      writeLS(next);
      return next;
    });
  }, []);

  return { items, hydrated, upsert, patch, remove };
}
