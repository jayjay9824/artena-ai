"use client";
import { useEffect, useState } from "react";
import {
  PerformanceFilters,
  PerformanceRow,
  SortKey,
  getPerformanceRows,
} from "../services/galleryConsole/artworkPerformanceService";
import type { GalleryId } from "../lib/types";

export function useArtworkPerformance(
  galleryId: GalleryId,
  initial: PerformanceFilters = { range: "30d", sort: "leadScore" },
) {
  const [filters, setFilters] = useState<PerformanceFilters>(initial);
  const [rows, setRows]       = useState<PerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPerformanceRows(galleryId, filters).then(r => {
      if (!cancelled) { setRows(r); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [galleryId, filters]);

  const setSort = (s: SortKey) => setFilters(f => ({ ...f, sort: s }));

  return { rows, filters, setFilters, setSort, loading };
}
