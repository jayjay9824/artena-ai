"use client";
import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";

export interface SavedArtwork {
  artwork_id: string;
  /** Latest report id if this artwork came from an ARTENA analysis. */
  report_id?: string;
  image_url: string | null;
  artist_name: string;
  title: string;
  year: string | number;
  /** Optional metadata extras for archive cards. */
  medium?: string;
  period?: string;
  gallery_name: string;
  source: "gallery" | "analysis";
  listing_id?: string;
  status: "available" | "held" | "sold" | "not_available" | "not_listed";
}

export interface CollectionItem { artwork: SavedArtwork; added_at: string; }
export interface Collection {
  collection_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items: CollectionItem[];
}
export interface RecentlyViewedItem { artwork: SavedArtwork; viewed_at: string; }
export interface ToastData {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface State {
  likes: SavedArtwork[];
  saved: SavedArtwork[];
  collections: Collection[];
  recentlyViewed: RecentlyViewedItem[];
  toast: ToastData | null;
}

type Action =
  | { type: "LIKE"; artwork: SavedArtwork }
  | { type: "UNLIKE"; artwork_id: string }
  | { type: "SAVE"; artwork: SavedArtwork }
  | { type: "UNSAVE"; artwork_id: string }
  | { type: "CREATE_COLLECTION"; collection_id: string; name: string }
  | { type: "DELETE_COLLECTION"; collection_id: string }
  | { type: "RENAME_COLLECTION"; collection_id: string; name: string }
  | { type: "ADD_TO_COLLECTION"; collection_id: string; artwork: SavedArtwork }
  | { type: "REMOVE_FROM_COLLECTION"; collection_id: string; artwork_id: string }
  | { type: "ADD_RECENTLY_VIEWED"; artwork: SavedArtwork }
  | { type: "SHOW_TOAST"; data: ToastData }
  | { type: "HIDE_TOAST" };

const INITIAL: State = { likes: [], saved: [], collections: [], recentlyViewed: [], toast: null };
let _tid = 0;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LIKE":
      if (state.likes.some(a => a.artwork_id === action.artwork.artwork_id)) return state;
      return { ...state, likes: [action.artwork, ...state.likes] };
    case "UNLIKE":
      return { ...state, likes: state.likes.filter(a => a.artwork_id !== action.artwork_id) };
    case "SAVE":
      if (state.saved.some(a => a.artwork_id === action.artwork.artwork_id)) return state;
      return { ...state, saved: [action.artwork, ...state.saved] };
    case "UNSAVE":
      return { ...state, saved: state.saved.filter(a => a.artwork_id !== action.artwork_id) };
    case "CREATE_COLLECTION": {
      const now = new Date().toISOString();
      return { ...state, collections: [{ collection_id: action.collection_id, name: action.name, created_at: now, updated_at: now, items: [] }, ...state.collections] };
    }
    case "DELETE_COLLECTION":
      return { ...state, collections: state.collections.filter(c => c.collection_id !== action.collection_id) };
    case "RENAME_COLLECTION":
      return { ...state, collections: state.collections.map(c => c.collection_id !== action.collection_id ? c : { ...c, name: action.name, updated_at: new Date().toISOString() }) };
    case "ADD_TO_COLLECTION":
      return {
        ...state, collections: state.collections.map(c => {
          if (c.collection_id !== action.collection_id) return c;
          if (c.items.some(i => i.artwork.artwork_id === action.artwork.artwork_id)) return c;
          return { ...c, updated_at: new Date().toISOString(), items: [{ artwork: action.artwork, added_at: new Date().toISOString() }, ...c.items] };
        }),
      };
    case "REMOVE_FROM_COLLECTION":
      return { ...state, collections: state.collections.map(c => c.collection_id !== action.collection_id ? c : { ...c, items: c.items.filter(i => i.artwork.artwork_id !== action.artwork_id) }) };
    case "ADD_RECENTLY_VIEWED":
      return { ...state, recentlyViewed: [{ artwork: action.artwork, viewed_at: new Date().toISOString() }, ...state.recentlyViewed.filter(r => r.artwork.artwork_id !== action.artwork.artwork_id)].slice(0, 50) };
    case "SHOW_TOAST":
      return { ...state, toast: action.data };
    case "HIDE_TOAST":
      return { ...state, toast: null };
    default:
      return state;
  }
}

interface CtxValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  isLiked: (id: string) => boolean;
  isSaved: (id: string) => boolean;
  like: (artwork: SavedArtwork, onAction?: () => void) => void;
  unlike: (artwork_id: string) => void;
  save: (artwork: SavedArtwork, onAction?: () => void) => void;
  unsave: (artwork_id: string) => void;
  createCollection: (name: string) => string;
  addToCollection: (collection_id: string, artwork: SavedArtwork, onAction?: () => void) => void;
  addRecentlyViewed: (artwork: SavedArtwork) => void;
  showToast: (msg: string, actionLabel?: string, onAction?: () => void) => void;
}

const Ctx = createContext<CtxValue | null>(null);
const STORAGE_KEY = "artena_my_v1";

export function MyActivityProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL, (init) => {
    if (typeof window === "undefined") return init;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...init, ...JSON.parse(raw), toast: null };
    } catch {}
    return init;
  });

  useEffect(() => {
    const { toast: _, ...rest } = state;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rest)); } catch {}
  }, [state]);

  const showToast = useCallback((msg: string, actionLabel?: string, onAction?: () => void) => {
    const id = ++_tid;
    dispatch({ type: "SHOW_TOAST", data: { id, message: msg, actionLabel, onAction } });
    setTimeout(() => dispatch({ type: "HIDE_TOAST" }), 3200);
  }, []);

  const isLiked = useCallback((id: string) => state.likes.some(a => a.artwork_id === id), [state.likes]);
  const isSaved = useCallback((id: string) => state.saved.some(a => a.artwork_id === id), [state.saved]);

  const like = useCallback((artwork: SavedArtwork, onAction?: () => void) => {
    dispatch({ type: "LIKE", artwork });
    showToast("Added to Likes", "View Likes", onAction);
  }, [showToast]);

  const unlike = useCallback((artwork_id: string) => dispatch({ type: "UNLIKE", artwork_id }), []);

  const save = useCallback((artwork: SavedArtwork, onAction?: () => void) => {
    dispatch({ type: "SAVE", artwork });
    showToast("Saved", "View Saved", onAction);
  }, [showToast]);

  const unsave = useCallback((artwork_id: string) => dispatch({ type: "UNSAVE", artwork_id }), []);

  const createCollection = useCallback((name: string): string => {
    const id = `col-${Date.now()}`;
    dispatch({ type: "CREATE_COLLECTION", collection_id: id, name });
    return id;
  }, []);

  const addToCollection = useCallback((collection_id: string, artwork: SavedArtwork, onAction?: () => void) => {
    dispatch({ type: "ADD_TO_COLLECTION", collection_id, artwork });
    showToast("Added to Collection", "View", onAction);
  }, [showToast]);

  const addRecentlyViewed = useCallback((artwork: SavedArtwork) => dispatch({ type: "ADD_RECENTLY_VIEWED", artwork }), []);

  return (
    <Ctx.Provider value={{ state, dispatch, isLiked, isSaved, like, unlike, save, unsave, createCollection, addToCollection, addRecentlyViewed, showToast }}>
      {children}
      {state.toast && <Toast data={state.toast} onDismiss={() => dispatch({ type: "HIDE_TOAST" })} />}
    </Ctx.Provider>
  );
}

export function useMyActivity() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMyActivity must be inside MyActivityProvider");
  return ctx;
}

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

function Toast({ data, onDismiss }: { data: ToastData; onDismiss: () => void }) {
  return (
    <div style={{
      position: "fixed", bottom: 92, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
      background: "#1A1A18", color: "#FFF", borderRadius: 24, padding: "11px 18px",
      display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap",
      boxShadow: "0 8px 32px rgba(0,0,0,0.26)", fontSize: 13, fontFamily: FONT,
      animation: "toastIn .18s ease",
    }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      {data.message}
      {data.actionLabel && (
        <button onClick={() => { data.onAction?.(); onDismiss(); }} style={{ background: "none", border: "none", color: "#C8B68A", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "0 0 0 2px", fontFamily: FONT }}>
          {data.actionLabel} →
        </button>
      )}
    </div>
  );
}
