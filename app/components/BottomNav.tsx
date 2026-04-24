"use client";
import React from "react";
import { useTabNav, AppTab } from "../context/TabContext";

const ROUTES: Record<AppTab, string> = {
  scan: "/analyze",
  collection: "/collection",
  taste: "/taste",
  recommendations: "/recommendations",
  gallery: "/gallery",
  my: "/my",
};

interface BottomNavProps {
  currentTab: AppTab;
}

export function BottomNav({ currentTab }: BottomNavProps) {
  const { goTo, inShell } = useTabNav();

  const navigate = (tab: AppTab) => {
    if (inShell) {
      goTo(tab);
    } else {
      window.location.href = ROUTES[tab];
    }
  };

  const Item = ({ tab, label, children }: { tab: AppTab; label: string; children: React.ReactNode }) => {
    const active = currentTab === tab;
    return (
      <button
        onClick={() => navigate(tab)}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          background: "none", border: "none", cursor: "pointer",
          color: active ? "#1856FF" : "#BBBBBB", flex: 1, padding: 0,
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          transition: "color .15s",
        }}
      >
        {children}
        <span style={{ fontSize: 9, letterSpacing: ".07em", fontWeight: active ? 600 : 400 }}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 640,
      background: "rgba(255,255,255,0.96)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      borderTop: "0.5px solid #EBEBEB",
      display: "flex", alignItems: "center", justifyContent: "space-around",
      padding: "10px 22px 22px",
      boxSizing: "border-box" as const, zIndex: 100,
    }}>
      <Item tab="scan" label="스캔">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8.2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </Item>

      <Item tab="collection" label="컬렉션">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {currentTab === "collection" ? (
            <>
              <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1" fill="currentColor" />
              <rect x="11" y="2.5" width="6.5" height="6.5" rx="1" fill="currentColor" />
              <rect x="2.5" y="11" width="6.5" height="6.5" rx="1" fill="currentColor" />
              <rect x="11" y="11" width="6.5" height="6.5" rx="1" fill="currentColor" />
            </>
          ) : (
            <>
              <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="11" y="2.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="2.5" y="11" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="11" y="11" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </>
          )}
        </svg>
      </Item>

      <Item tab="taste" label="취향">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.3"
            fill={currentTab === "taste" ? "currentColor" : "none"}
          />
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
        </svg>
      </Item>

      <Item tab="recommendations" label="추천">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2.5L12.2 8H18L13.4 11.5L15.2 17L10 13.8L4.8 17L6.6 11.5L2 8H7.8L10 2.5Z"
            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
            fill="currentColor" fillOpacity={currentTab === "recommendations" ? 0.25 : 0.08}
          />
        </svg>
      </Item>

      <Item tab="my" label="My">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"
            fill={currentTab === "my" ? "currentColor" : "none"} fillOpacity={currentTab === "my" ? 0.2 : 0} />
          <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </Item>

      <Item tab="gallery" label="갤러리">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {currentTab === "gallery" ? (
            <>
              <rect x="2" y="5" width="16" height="11" rx="1" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.1" />
              <rect x="5" y="11.5" width="3.5" height="2.5" rx="0.5" fill="currentColor" />
              <rect x="11.5" y="11.5" width="3.5" height="2.5" rx="0.5" fill="currentColor" />
            </>
          ) : (
            <>
              <rect x="2" y="5" width="16" height="11" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.1" />
              <rect x="5" y="11.5" width="3.5" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
              <rect x="11.5" y="11.5" width="3.5" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
            </>
          )}
        </svg>
      </Item>
    </div>
  );
}
