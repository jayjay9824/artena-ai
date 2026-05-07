"use client";
import React, { useState } from "react";
import { useMyActivity, SavedArtwork } from "../context/MyActivityContext";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

interface Props {
  artwork: SavedArtwork;
  onClose: () => void;
  onDone?: () => void;
}

export function CollectionPicker({ artwork, onClose, onDone }: Props) {
  const { state, createCollection, addToCollection } = useMyActivity();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleAdd = (collection_id: string) => {
    addToCollection(collection_id, artwork, onDone);
    onClose();
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const id = createCollection(name);
    addToCollection(id, artwork, onDone);
    setNewName("");
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.44)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", background: "#FFF", borderRadius: "20px 20px 0 0", padding: "20px 22px 44px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E8E8E8" }} />
        </div>
        <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".16em", textTransform: "uppercase", margin: "0 0 16px", fontFamily: FONT }}>Add to Collection</p>

        {/* Existing collections */}
        {state.collections.length === 0 && !creating && (
          <p style={{ fontSize: 13, color: "#CCCCCC", fontFamily: FONT, padding: "8px 0 16px" }}>No collections yet.</p>
        )}
        {state.collections.map(c => {
          const alreadyIn = c.items.some(i => i.artwork.artwork_id === artwork.artwork_id);
          return (
            <button key={c.collection_id} onClick={() => !alreadyIn && handleAdd(c.collection_id)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", background: "none", border: "none",
              borderBottom: "0.5px solid #F4F4F4", padding: "14px 0",
              cursor: alreadyIn ? "default" : "pointer",
            }}>
              <div style={{ textAlign: "left" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: alreadyIn ? "#CCCCCC" : "#0D0D0D", margin: "0 0 2px", fontFamily: FONT_HEAD }}>{c.name}</p>
                <p style={{ fontSize: 11, color: "#AAAAAA", margin: 0, fontFamily: FONT }}>{c.items.length} works</p>
              </div>
              {alreadyIn
                ? <span style={{ fontSize: 10, color: "#AAAAAA", fontFamily: FONT }}>Added</span>
                : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="#CCCCCC" strokeWidth="1.8" strokeLinecap="round" /></svg>
              }
            </button>
          );
        })}

        {/* New collection */}
        {creating ? (
          <div style={{ paddingTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
              placeholder="Collection name"
              style={{ flex: 1, border: "0.5px solid #D8D8D8", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: FONT, outline: "none", color: "#0D0D0D" }}
            />
            <button onClick={handleCreate} disabled={!newName.trim()} style={{ padding: "10px 18px", background: newName.trim() ? "#0D0D0D" : "#E8E8E8", color: newName.trim() ? "#FFF" : "#AAAAAA", border: "none", borderRadius: 8, fontSize: 13, fontFamily: FONT, cursor: newName.trim() ? "pointer" : "default" }}>
              Create
            </button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} style={{ width: "100%", padding: "14px 0", background: "none", border: "0.5px dashed #D8D8D8", borderRadius: 8, fontSize: 13, color: "#555", fontFamily: FONT, cursor: "pointer", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="#888" strokeWidth="1.8" strokeLinecap="round" /></svg>
            New Collection
          </button>
        )}
      </div>
    </div>
  );
}
