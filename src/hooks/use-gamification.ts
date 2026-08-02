"use client";

import { useState, useEffect } from "react";

export function useGamification() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // Initial load
    const pref = localStorage.getItem("perenne_gamification_enabled");
    if (pref !== null) {
      setEnabled(pref === "true");
    }

    // Listen for cross-component changes
    const handleToggle = (e: any) => {
      setEnabled(e.detail);
    };

    window.addEventListener("perenne_gamification_changed", handleToggle);
    return () => window.removeEventListener("perenne_gamification_changed", handleToggle);
  }, []);

  return enabled;
}
