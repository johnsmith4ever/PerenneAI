import { useEffect } from "react";
import { useState } from "react";
import { fetchFeatureAction, upsertFeatureAction, incrementUsageAction } from "@/actions/supabase";

export type Tier = "Guest" | "Free" | "Core" | "Pro" | "Premium" | "Maximum";

// ============================================================================
// 🛑 FREE ACCESS MODE (Soft Bypass)
// Set this to `true` to unlock all Pro/Premium features for everyone.
// ============================================================================
export const FREE_ACCESS_MODE = true;

export const TIER_ALLOWANCES: Record<Tier, number> = {
  Guest: 50_000,
  Free: 100_000,
  Core: 100_000,
  Pro: 100_000,
  Premium: 100_000,
  Maximum: 100_000,
};

export const TIER_RANK: Record<Tier, number> = {
  Guest: -1,
  Free: 0,
  Core: 0,
  Pro: 0,
  Premium: 0,
  Maximum: 0,
};

export type ModelType = 
  | "GPT 5.4 Nano" 
  | "Gemini 3.5 Flash-Lite"
  | "Gemini 3.6 Flash" 
  | "Deepseek-V4-Flash" 
  | "Deepseek-V4-Pro" 
  | "Claude 4.5 Haiku"
  | "Claude 4.6 Sonnet"
  | "Claude Haiku"
  | "claude-haiku-5-5"
  | "GPT 6 Luna"
  | "Tavily Search";

export const MODEL_COSTS: Record<ModelType, { input: number, output: number }> = {
  "GPT 5.4 Nano":         { input: 2.5, output: 2.5 },
  "Gemini 3.5 Flash-Lite":{ input: 2.5, output: 2.5 },
  "Gemini 3.6 Flash":     { input: 2.5, output: 2.5 },
  "Deepseek-V4-Flash":    { input: 2.5, output: 2.5 },
  "Deepseek-V4-Pro":      { input: 2.5, output: 2.5 },
  "Claude 4.5 Haiku":     { input: 2.5, output: 2.5 },
  "Claude 4.6 Sonnet":    { input: 2.5, output: 2.5 },
  "Claude Haiku":         { input: 2.5, output: 2.5 },
  "claude-haiku-5-5":     { input: 2.5, output: 2.5 },
  "GPT 6 Luna":           { input: 2.5, output: 2.5 },
  "Tavily Search":        { input: 10, output: 10 },
};

type SubscriptionState = {
  tier: Tier;
  creditsUsed: number;
  lastReset: string;
};

// All tiers now use Deepseek-V4-Flash for everything, GPT 6 Luna locked for assistant
export function getTierModels(tier: Tier): { heavy: ModelType, generation: ModelType, judge: ModelType, assistant: ModelType } {
  return {
    heavy:      "Deepseek-V4-Flash",
    generation: "Deepseek-V4-Flash",
    judge:      "Deepseek-V4-Flash",
    assistant:  "GPT 6 Luna",
  };
}

import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useModelPreferences } from "./use-model-preferences";

function getGuestUsage(): { creditsUsed: number; lastReset: string } {
  const today = new Date().toISOString().split("T")[0];
  if (typeof window === "undefined") {
    return { creditsUsed: 0, lastReset: today };
  }
  try {
    const raw = window.localStorage.getItem("perenne_guest_usage");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.lastReset === today && typeof parsed.creditsUsed === "number") {
        return {
          creditsUsed: parsed.creditsUsed,
          lastReset: today,
        };
      }
    }
  } catch (e) {
    console.warn("Failed to read guest usage from localStorage:", e);
  }
  return { creditsUsed: 0, lastReset: today };
}

function saveGuestUsage(creditsUsed: number, lastReset: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("perenne_guest_usage", JSON.stringify({ creditsUsed, lastReset }));
  } catch (e) {
    console.warn("Failed to save guest usage to localStorage:", e);
  }
}

export function useSubscription() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const [state, setState] = useState<SubscriptionState>(() => {
    const today = new Date().toISOString().split("T")[0];
    const guestData = getGuestUsage();
    return {
      tier: "Guest", // Default to Guest (50k limit) until user is confirmed signed-in
      creditsUsed: guestData.creditsUsed,
      lastReset: today,
    };
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync across components via CustomEvent with monotonic guard (allowing explicit reset to 0)
  useEffect(() => {
    const handleCreditsUpdate = (e: any) => {
      if (e.detail && typeof e.detail.creditsUsed === "number") {
        setState(prev => {
          const today = new Date().toISOString().split("T")[0];
          if (e.detail.creditsUsed === 0) {
            return { ...prev, creditsUsed: 0, lastReset: today };
          }
          // Guard: usage can never decrease within the same reset period unless reset to 0
          if (prev.lastReset === today && e.detail.creditsUsed < prev.creditsUsed) {
            return prev;
          }
          return { ...prev, creditsUsed: e.detail.creditsUsed };
        });
      }
    };
    window.addEventListener("perenne_credits_updated", handleCreditsUpdate);
    return () => window.removeEventListener("perenne_credits_updated", handleCreditsUpdate);
  }, []);

  // Sync guest credits across tabs via StorageEvent with monotonic guard (allowing explicit reset to 0)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "perenne_guest_usage" && e.newValue && !user) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (typeof parsed.creditsUsed === "number") {
            setState(prev => {
              const today = new Date().toISOString().split("T")[0];
              if (parsed.creditsUsed === 0) {
                return { ...prev, creditsUsed: 0, lastReset: today };
              }
              if (prev.lastReset === today && parsed.creditsUsed < prev.creditsUsed) {
                return prev;
              }
              return { ...prev, creditsUsed: parsed.creditsUsed };
            });
          }
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user]);

  // Check for daily reset
  useEffect(() => {
    if (!isLoaded) return;
    
    const today = new Date().toISOString().split("T")[0];
    let needsUpdate = false;
    let nextState = { ...state };

    if (state.lastReset !== today) {
      nextState.creditsUsed = 0;
      nextState.lastReset = today;
      needsUpdate = true;
      if (!user) {
        saveGuestUsage(0, today);
      }
    }

    if (needsUpdate) {
      setState(nextState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastReset, isLoaded, setState, user]);

  // Sync tier from Clerk public metadata AND sync credits from Supabase (for signed in) or localStorage (for guest)
  useEffect(() => {
    if (clerkLoaded) {
      const today = new Date().toISOString().split("T")[0];
      if (user) {
        // Signed-in user: Free tier gets 100,000 allowance
        const dbTier: Tier = "Free";
        let isMounted = true;
        
        fetchFeatureAction("usage", "credits_used, last_reset", 1)
          .then((data) => {
            if (!isMounted) return;
            
            let remoteCredits = 0;
            let remoteReset = today;

            if (data && data.length > 0) {
              remoteCredits = data[0].credits_used || 0;
              remoteReset = (data[0].last_reset || today).split("T")[0];
            }

            // Reset if it's genuinely a new day
            if (remoteReset !== today) {
              remoteCredits = 0;
              remoteReset = today;
              upsertFeatureAction("usage", { credits_used: 0, last_reset: today }).catch(e => console.error("[usage] Reset failed:", e));
              setState({ tier: dbTier, creditsUsed: 0, lastReset: today });
            } else if (remoteCredits === 0) {
              // Explicit database reset to 0
              setState({ tier: dbTier, creditsUsed: 0, lastReset: today });
            } else {
              // Never let a stale read lower the displayed value within the same reset period:
              // Merge DB and in-memory values using Math.max!
              setState(prev => {
                const mergedCredits = !isLoaded || prev.lastReset !== today
                  ? remoteCredits
                  : Math.max(prev.creditsUsed, remoteCredits);
                return { tier: dbTier, creditsUsed: mergedCredits, lastReset: today };
              });
            }
            setIsLoaded(true);
          })
          .catch((e) => {
             console.error("Failed to load usage", e);
             if (isMounted) setIsLoaded(true);
          });

        return () => { isMounted = false; };
      } else {
        // Guest user: Guest tier gets 50,000 allowance
        const guestData = getGuestUsage();
        setState(prev => {
          const mergedCredits = prev.lastReset === today
            ? (guestData.creditsUsed === 0 ? 0 : Math.max(prev.creditsUsed, guestData.creditsUsed))
            : guestData.creditsUsed;
          return {
            tier: "Guest",
            creditsUsed: mergedCredits,
            lastReset: today,
          };
        });
        setIsLoaded(true);
      }
    }
  }, [clerkLoaded, user?.id]);

  const safeCreditsUsed = state.creditsUsed && !isNaN(state.creditsUsed) ? state.creditsUsed : 0;
  // Guest mode = 50,000; Signed in mode = 100,000
  const dailyLimit = TIER_ALLOWANCES[user ? "Free" : "Guest"];
  const creditsRemaining = Math.max(0, dailyLimit - safeCreditsUsed);

  // Pre-check for cost
  const canAfford = (wordCount: number, model: ModelType): boolean => {
    let costConfig = MODEL_COSTS[model] || { input: 1, output: 1 };
    const estimatedTokens = Math.ceil(wordCount * 1.3);
    const estimatedCost = Math.ceil(estimatedTokens * costConfig.input);
    return creditsRemaining >= estimatedCost;
  };

  const deductCredits = (inputTokens: number, outputTokens: number, model: ModelType, feature: "chat" | "other" = "other") => {
    let costConfig = MODEL_COSTS[model] || { input: 1, output: 1 };
    
    const safeInput = inputTokens || 0;
    const safeOutput = outputTokens || 0;
    let cost = Math.ceil((safeInput * costConfig.input) + (safeOutput * costConfig.output));
    
    // Non-chat features get a 2x multiplier
    if (feature !== "chat") {
      cost = Math.ceil(cost * 2.0);
    }
    
    const today = new Date().toISOString().split("T")[0];
    const currentCredits = state.creditsUsed && !isNaN(state.creditsUsed) ? state.creditsUsed : 0;
    const optimisticCredits = currentCredits + cost;

    // Optimistic monotonic update in memory
    setState((prev) => ({
      ...prev,
      creditsUsed: prev.lastReset === today ? Math.max(prev.creditsUsed, optimisticCredits) : optimisticCredits,
      lastReset: today
    }));
    
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("perenne_credits_updated", { detail: { creditsUsed: optimisticCredits } }));
    }
    
    // Update Supabase for signed-in users with atomic increment
    if (user) {
       incrementUsageAction(cost, state.lastReset || today)
         .then(dbCredits => {
           if (typeof dbCredits === "number") {
             setState(prev => {
               const highestCredits = Math.max(prev.creditsUsed, dbCredits);
               return {
                 ...prev,
                 creditsUsed: highestCredits,
                 lastReset: today
               };
             });
             if (typeof window !== "undefined") {
               window.dispatchEvent(new CustomEvent("perenne_credits_updated", { detail: { creditsUsed: dbCredits } }));
             }
           }
         })
         .catch(e => console.error("[useSubscription] Failed to sync usage atomic increment:", e));
       
       fetch("/api/add-xp", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ amount: cost })
       }).catch(e => console.error("Failed to add XP:", e));
    } else {
       // Persist in localStorage for guest users
       saveGuestUsage(optimisticCredits, state.lastReset || today);
    }
  };

  const resetCredits = async () => {
    const today = new Date().toISOString().split("T")[0];
    setState(prev => ({ ...prev, creditsUsed: 0, lastReset: today }));
    if (typeof window !== "undefined") {
      saveGuestUsage(0, today);
      window.dispatchEvent(new CustomEvent("perenne_credits_updated", { detail: { creditsUsed: 0 } }));
    }
    if (user) {
      try {
        await upsertFeatureAction("usage", { credits_used: 0, last_reset: today });
      } catch (e) {
        console.error("[useSubscription] Failed to reset credits in DB:", e);
      }
    }
  };

  const upgradeTo = (tier: Tier) => {
    setState((prev) => ({
      ...prev,
      tier,
    }));
  };

  // Always use the fixed model set — preferences are ignored (model is locked)
  const defaultModels = getTierModels(state.tier);

  return {
    tier: state.tier,
    creditsUsed: Math.ceil(safeCreditsUsed),
    creditsRemaining: Math.ceil(creditsRemaining),
    dailyLimit,
    canAfford,
    deductCredits,
    resetCredits,
    upgradeTo,
    isLoaded,
    // All features use Deepseek-V4-Flash; Study Assistant uses GPT 6 Luna (locked)
    assistant: "GPT 6 Luna" as ModelType,
    generation: "Deepseek-V4-Flash" as ModelType,
    heavy: "Deepseek-V4-Flash" as ModelType,
    judge: "Deepseek-V4-Flash" as ModelType,
    grading: "Deepseek-V4-Flash" as ModelType,
    tierRank: TIER_RANK[state.tier] ?? 0,
  };
}
