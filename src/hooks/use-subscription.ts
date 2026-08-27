import { useEffect } from "react";
import { useState } from "react";
import { fetchFeatureAction, upsertFeatureAction } from "@/actions/supabase";

export type Tier = "Guest" | "Free" | "Core" | "Pro" | "Premium" | "Maximum";

// ============================================================================
// 🛑 FREE ACCESS MODE (Soft Bypass)
// Set this to `true` to unlock all Pro/Premium features for everyone.
// Users will still consume their normal tier credits and hit daily limits.
// Set back to `false` when you want the paywalls to reappear.
// ============================================================================
export const FREE_ACCESS_MODE = false;

export const TIER_ALLOWANCES: Record<Tier, number> = {
  Guest: 11_000,
  Free: 30_000,
  Core: 70_000,
  Pro: 135_000,
  Premium: 280_000,
  Maximum: 400_000,
};

export const TIER_RANK: Record<Tier, number> = {
  Guest: -1,
  Free: 0,
  Core: 1,
  Pro: 2,
  Premium: 3,
  Maximum: 4,
};

export type ModelType = 
  | "Mistral Small" 
  | "Gemini 3.5 Flash-Lite"
  | "Gemini 3.6 Flash" 
  | "Deepseek-V4-Flash" 
  | "Deepseek-V4-Pro" 
  | "Claude 4.5 Haiku"
  | "Claude 4.6 Sonnet"
  | "Mistral Large"
  | "Tavily Search";

export const MODEL_COSTS: Record<ModelType, { input: number, output: number }> = {
  "Mistral Small": { input: 3, output: 3 },
  "Gemini 3.5 Flash-Lite": { input: 2, output: 2 },
  "Gemini 3.6 Flash": { input: 2.5, output: 2.5 },
  "Deepseek-V4-Flash": { input: 2.5, output: 2.5 },
  "Deepseek-V4-Pro": { input: 3.5, output: 3.5 },
  "Claude 4.5 Haiku": { input: 4, output: 4 },
  "Claude 4.6 Sonnet": { input: 5, output: 5 },
  "Mistral Large": { input: 4, output: 4 },
  "Tavily Search": { input: 10, output: 10 },
};

type SubscriptionState = {
  tier: Tier;
  creditsUsed: number;
  lastReset: string;
};

export function getTierModels(tier: Tier): { heavy: ModelType, generation: ModelType, judge: ModelType, assistant: ModelType } {
  // Free Defaults
  let heavy: ModelType = "Gemini 3.6 Flash";
  let generation: ModelType = "Deepseek-V4-Flash";
  let judge: ModelType = "Claude 4.5 Haiku";
  let assistant: ModelType = "Mistral Small";
  
  if (tier === "Core") {
    heavy = "Deepseek-V4-Flash";
    generation = "Deepseek-V4-Flash";
    judge = "Claude 4.5 Haiku";
    assistant = "Deepseek-V4-Flash";
  } else if (tier === "Pro") {
    heavy = "Deepseek-V4-Pro";
    generation = "Deepseek-V4-Pro";
    judge = "Deepseek-V4-Pro";
    assistant = "Deepseek-V4-Pro";
  } else if (tier === "Premium") {
    heavy = "Claude 4.5 Haiku";
    generation = "Claude 4.5 Haiku";
    judge = "Claude 4.5 Haiku";
    assistant = "Claude 4.5 Haiku";
  } else if (tier === "Maximum") {
    heavy = "Claude 4.6 Sonnet";
    generation = "Claude 4.6 Sonnet";
    judge = "Claude 4.6 Sonnet";
    assistant = "Claude 4.6 Sonnet";
  }
  
  return { heavy, generation, judge, assistant };
}

import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useModelPreferences } from "./use-model-preferences";

export function useSubscription() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const [state, setState] = useState<SubscriptionState>({
    tier: "Free",
    creditsUsed: 0,
    lastReset: new Date().toISOString().split("T")[0],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync across components
  useEffect(() => {
    const handleCreditsUpdate = (e: any) => {
      if (e.detail && e.detail.creditsUsed !== undefined) {
        setState(prev => ({ ...prev, creditsUsed: e.detail.creditsUsed }));
      }
    };
    window.addEventListener("perenne_credits_updated", handleCreditsUpdate);
    return () => window.removeEventListener("perenne_credits_updated", handleCreditsUpdate);
  }, []);

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
    }

    if (needsUpdate) {
      setState(nextState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastReset, isLoaded, setState]);

  // Sync tier from Clerk public metadata AND sync credits from Supabase
  useEffect(() => {
    if (clerkLoaded) {
      if (user) {
        let dbTier: Tier = (user.publicMetadata?.tier as Tier) || "Free"; 
        const today = new Date().toISOString().split("T")[0];

        let isMounted = true;
        
        fetchFeatureAction("usage", "credits_used, last_reset", 1)
          .then((data) => {
            if (!isMounted) return;
            
            let remoteCredits = 0;
            let remoteReset = today;

            if (data && data.length > 0) {
              remoteCredits = data[0].credits_used || 0;
              remoteReset = data[0].last_reset || today;
            }

            // Reset if it's a new day
            if (remoteReset !== today) {
              remoteCredits = 0;
              remoteReset = today;
              upsertFeatureAction("usage", { credits_used: 0, last_reset: today }).catch(console.error);
            }

            setState((prev) => {
              return { tier: dbTier, creditsUsed: remoteCredits, lastReset: today };
            });
            setIsLoaded(true);
          })
          .catch((e) => {
             console.error("Failed to load usage", e);
             if (isMounted) setIsLoaded(true);
          });

        return () => { isMounted = false; };
      } else {
        setState((prev) => {
          if (prev.tier !== "Guest") {
            return { ...prev, tier: "Guest" };
          }
          return prev;
        });
        setIsLoaded(true);
      }
    }
  }, [clerkLoaded, user?.id]);

  const safeCreditsUsed = state.creditsUsed && !isNaN(state.creditsUsed) ? state.creditsUsed : 0;
  const dailyLimit = TIER_ALLOWANCES[state.tier];
  const creditsRemaining = Math.max(0, dailyLimit - safeCreditsUsed);

  // Pre-check for cost
  const canAfford = (wordCount: number, model: ModelType): boolean => {
    let costConfig = MODEL_COSTS[model] || { input: 1, output: 1 };
    
    // Roughly estimate tokens from word count (e.g. 1.3 tokens per word)
    const estimatedTokens = Math.ceil(wordCount * 1.3);
    // Rough estimate just for the pre-check (actual usage is deducted post-generation)
    const estimatedCost = Math.ceil(estimatedTokens * costConfig.input);
    
    // As long as they have enough to cover the prompt, let them proceed (it will deduct into the negative if it overruns).
    return creditsRemaining >= estimatedCost;
  };

  const deductCredits = (inputTokens: number, outputTokens: number, model: ModelType, feature: "chat" | "other" = "other") => {
    let costConfig = MODEL_COSTS[model] || { input: 1, output: 1 };
    
    const safeInput = inputTokens || 0;
    const safeOutput = outputTokens || 0;
    // Costs are direct multipliers per token
    let cost = Math.ceil((safeInput * costConfig.input) + (safeOutput * costConfig.output));
    
    // Non-chat features provide massive value/compute per request (e.g. grading, flashcard gen)
    // Apply a 3.0x multiplier to reflect this service value (charge the product, not the cost)
    if (feature !== "chat") {
      cost = Math.ceil(cost * 3.0);
    }
    
    const currentCredits = state.creditsUsed && !isNaN(state.creditsUsed) ? state.creditsUsed : 0;
    const newCredits = currentCredits + cost;
    
    // Update Supabase directly so stats carry over to other devices/browsers
    if (user) {
       upsertFeatureAction("usage", {
         credits_used: newCredits,
         last_reset: state.lastReset
       }).catch(e => console.error("Failed to sync usage to supabase:", e));
       
       // Also add to all-time XP in background
       fetch("/api/add-xp", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ amount: cost })
       }).catch(e => console.error("Failed to add XP:", e));
    }

    setState((prev) => ({
      ...prev,
      creditsUsed: newCredits, // Use computed newCredits to avoid race conditions
    }));
    
    // Dispatch event to update other components (like the sidebar usage bar)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("perenne_credits_updated", { detail: { creditsUsed: newCredits } }));
    }
  };

  const upgradeTo = (tier: Tier) => {
    setState((prev) => ({
      ...prev,
      tier,
    }));
  };

  const defaultModels = getTierModels(state.tier);
  const { preferences } = useModelPreferences();

  return {
    tier: state.tier,
    creditsUsed: Math.ceil(safeCreditsUsed),
    creditsRemaining: Math.ceil(creditsRemaining),
    dailyLimit,
    canAfford,
    deductCredits,
    upgradeTo,
    isLoaded,
    assistant: preferences.generation !== "default" ? preferences.generation : defaultModels.assistant,
    generation: preferences.generation !== "default" ? preferences.generation : defaultModels.generation,
    heavy: preferences.heavy !== "default" ? preferences.heavy : defaultModels.heavy,
    judge: preferences.judge !== "default" ? preferences.judge : defaultModels.judge,
    grading: preferences.grading !== "default" ? preferences.grading : defaultModels.judge
  };
}
