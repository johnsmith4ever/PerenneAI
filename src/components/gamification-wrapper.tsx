"use client";

import { useGamification } from "@/hooks/use-gamification";
import { useEffect, useState } from "react";

export function GamificationWrapper({ children }: { children: React.ReactNode }) {
  const enabled = useGamification();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  
  if (!mounted || !enabled) return null;
  
  return <>{children}</>;
}
