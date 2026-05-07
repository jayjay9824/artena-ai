"use client";
import React from "react";
import { MyActivityProvider } from "./context/MyActivityContext";
import { TabProvider } from "./context/TabContext";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { LanguageToggle } from "./i18n/LanguageToggle";

/**
 * Client-side providers mounted once at the root layout so every route
 * (/analyze, /collection, /my, /taste, /recommendations, /gallery,
 * /exhibitions, /report/[id], /console) has access without each page
 * wrapping its own.
 *
 * Order: LanguageProvider on the outside so even in-shell tab content
 * + activity-aware modals can read the active language.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <MyActivityProvider>
        <TabProvider>
          {children}
          {/* Global language toggle — fixed top-right, visible app-wide
              including SmartScanner / IntroSplash / Loading / Shared
              Report / all in-shell tabs. */}
          <LanguageToggle />
        </TabProvider>
      </MyActivityProvider>
    </LanguageProvider>
  );
}
