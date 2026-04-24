"use client";
import React, { createContext, useContext, useState } from "react";

export type AppTab = "scan" | "collection" | "taste" | "recommendations" | "gallery";

interface TabCtx {
  activeTab: AppTab;
  goTo: (tab: AppTab) => void;
  inShell: boolean;
}

const TabContext = createContext<TabCtx>({
  activeTab: "scan",
  goTo: () => {},
  inShell: false,
});

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<AppTab>("scan");
  return (
    <TabContext.Provider value={{ activeTab, goTo: setActiveTab, inShell: true }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabNav() {
  return useContext(TabContext);
}
