"use client";
import { useEffect, useState } from "react";
import {
  LeadCard,
  LeadFilters,
  StrengthFilter,
  InterestedUser,
  getLeadSignals,
  getInterestedUsers,
} from "../services/galleryConsole/leadSignalService";
import type { GalleryId } from "../lib/types";

export function useLeadSignals(galleryId: GalleryId, initial: LeadFilters = {}) {
  const [filters, setFilters] = useState<LeadFilters>(initial);
  const [leads, setLeads]     = useState<LeadCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLeadSignals(galleryId, filters).then(rows => {
      if (!cancelled) { setLeads(rows); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [galleryId, filters]);

  const setStrength = (s: StrengthFilter) => setFilters(f => ({ ...f, strength: s }));

  return { leads, filters, setFilters, setStrength, loading };
}

export function useInterestedUsers(galleryId: GalleryId) {
  const [users, setUsers]     = useState<InterestedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInterestedUsers(galleryId).then(rows => {
      if (!cancelled) { setUsers(rows); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [galleryId]);

  return { users, loading };
}
