"use client";
import React from "react";
import { MyActivityProvider } from "./context/MyActivityContext";
import { TabProvider } from "./context/TabContext";

/**
 * Client-side providers mounted once at the root layout so every route
 * (/analyze, /collection, /my, /taste, /recommendations, /gallery)
 * has access without each page wrapping its own.
 *
 * Why root: child routes like /collection use useMyActivity() directly.
 * If only /analyze wraps the providers, prerendering /collection throws
 * "useMyActivity must be inside MyActivityProvider" and the build fails.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MyActivityProvider>
      <TabProvider>{children}</TabProvider>
    </MyActivityProvider>
  );
}
