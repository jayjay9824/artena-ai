"use client";
import React, { useEffect } from "react";
import { MyActivityProvider } from "./context/MyActivityContext";
import { TabProvider } from "./context/TabContext";
import { AnswerModeProvider } from "./context/AnswerModeContext";
import { AIOverlayProvider, useAIOverlay } from "./context/AIOverlayContext";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { LanguageToggle } from "./i18n/LanguageToggle";
import { AIModeOverlay } from "./components/axvela-ai/AIModeOverlay";
import { isKakaoInApp, isInAppBrowser } from "./utils/browserDetect";

/**
 * Client-side providers mounted once at the root layout so every route
 * (/analyze, /collection, /my, /taste, /recommendations, /gallery,
 * /exhibitions, /report/[id], /console) has access without each page
 * wrapping its own.
 *
 * Order: LanguageProvider on the outside so even in-shell tab content
 * + activity-aware modals can read the active language.
 *
 * AnswerModeProvider sits inside Tab/MyActivity so a mode override
 * survives tab switches but doesn't escape the app shell.
 */
/**
 * Tag <html> with inapp-browser / kakao-inapp classes so the rest
 * of the tree (CSS + JS) can branch defensively. Mounted once via
 * Providers — runs only on the client and cleans up on unmount so
 * the classes don't leak across hot-reloads in dev. No visual
 * change here; downstream phases will hang behavior off the
 * classes.
 */
function InAppBrowserClassTag() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const added: string[] = [];
    if (isInAppBrowser()) { root.classList.add("inapp-browser"); added.push("inapp-browser"); }
    if (isKakaoInApp())   { root.classList.add("kakao-inapp");   added.push("kakao-inapp"); }
    return () => { added.forEach(c => root.classList.remove(c)); };
  }, []);
  return null;
}

/**
 * Keep --vh synced with window.innerHeight so .app-container can
 * use it as the most accurate height source. KakaoTalk's WebView
 * reports inconsistent values for 100vh / 100dvh; the JS-driven
 * value is the source of truth. Updates fire on resize and
 * orientationchange; both listeners are torn down on unmount.
 */
function ViewportHeightSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const sync = () => {
      const vh = window.innerHeight * 0.01;
      root.style.setProperty("--vh", `${vh}px`);
    };
    sync();
    window.addEventListener("resize",            sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize",            sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);
  return null;
}

/**
 * Globally-mounted AXVELA AI overlay. Visibility is driven by
 * AIOverlayContext so any surface (BottomNav middle tab, scanner
 * idle prompt, etc.) can open it without owning the state itself.
 */
function GlobalAIOverlay() {
  const { isAIMode, closeAI } = useAIOverlay();
  return <AIModeOverlay open={isAIMode} onClose={closeAI} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <MyActivityProvider>
        <TabProvider>
          <AnswerModeProvider>
            <AIOverlayProvider>
              <InAppBrowserClassTag />
              <ViewportHeightSync />
              {children}
              {/* Global AXVELA AI overlay — single mount point, opened
                  from BottomNav or any other entry. */}
              <GlobalAIOverlay />
              {/* Global language toggle — fixed top-right, visible
                  app-wide including SmartScanner / IntroSplash /
                  Loading / Shared Report / all in-shell tabs. */}
              <LanguageToggle />
            </AIOverlayProvider>
          </AnswerModeProvider>
        </TabProvider>
      </MyActivityProvider>
    </LanguageProvider>
  );
}
