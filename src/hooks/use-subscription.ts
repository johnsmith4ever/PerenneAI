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
  Free: 40_000,
  Core: 70_000,
  Pro: 150_000,
  Premium: 300_000,
  Maximum: 450_000,
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
  | "GPT OSS"
  | "Gemini 3.5 Flash-Lite"
  | "Gemini 3.6 Flash" 
  | "Gemini 3.5 Pro"
  | "Deepseek-V4-Flash" 
  | "Deepseek-V4-Pro" 
  | "Claude 4.5 Haiku"
  | "Claude 3.5 Sonnet"
  | "GPT Luna"
  | "GPT Terra"
  | "Mistral Large"
  | "Tavily Search"
  | "Mistral Embed";

export const MODEL_COSTS: Record<ModelType, { input: number, output: number }> = {
  "Mistral Small": { input: 150.0, output: 150.0 },
  "GPT OSS": { input: 1, output: 1 },
  "Gemini 3.5 Flash-Lite": { input: 1, output: 1 },
  "Gemini 3.6 Flash": { input: 2.5, output: 2.5 },
  "Gemini 3.5 Pro": { input: 4, output: 4 },
  "Deepseek-V4-Flash": { input: 3, output: 3 },
  "Deepseek-V4-Pro": { input: 5, output: 5 },
  "Claude 4.5 Haiku": { input: 10, output: 10 },
  "Claude 3.5 Sonnet": { input: 20, output: 20 },
  "GPT Luna": { input: 5, output: 5 },
  "GPT Terra": { input: 15, output: 15 },
  "Mistral Large": { input: 250.0, output: 250.0 },
  "Tavily Search": { input: 10, output: 10 },
  "Mistral Embed": { input: 168, output: 168 },
};

type SubscriptionState = {
  tier: Tier;
  creditsUsed: number;
  lastReset: string;
};

export function getTierModels(tier: Tier): { heavy: ModelType, judge: ModelType, assistant: ModelType } {
  const heavy: ModelType = "Deepseek-V4-Flash";
  const judge: ModelType = "Claude 4.5 Haiku";
  let assistant: ModelType = "Mistral Small"; // Free / Guest tier
  
  if (tier === "Core") {
    assistant = "Mistral Large"; // Also implies GPT OSS is unlocked
  } else if (tier === "Pro") {
    assistant = "Gemini 3.5 Pro";
  } else if (tier === "Premium") {
    assistant = "Deepseek-V4-Pro";
  } else if (tier === "Maximum") {
    assistant = "Claude 3.5 Sonnet";
  }
  
  return { heavy, judge, assistant };
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
        let dbTier: Tier = "Free"; 
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
    const estimatedCost = Math.ceil(estimatedTokens * (costConfig.input / 1000));
    
    // As long as they have enough to cover the prompt, let them proceed (it will deduct into the negative if it overruns).
    return creditsRemaining >= estimatedCost;
  };

  const deductCredits = (inputTokens: number, outputTokens: number, model: ModelType, feature: "chat" | "other" = "other") => {
    let costConfig = MODEL_COSTS[model] || { input: 1, output: 1 };
    
    const safeInput = inputTokens || 0;
    const safeOutput = outputTokens || 0;
    // Costs are defined per 1k tokens. Divide by 1000 to get the correct absolute cost.
    const cost = Math.ceil((safeInput * (costConfig.input / 1000)) + (safeOutput * (costConfig.output / 1000)));
    
    setState((prev) => {
      const currentCredits = prev.creditsUsed && !isNaN(prev.creditsUsed) ? prev.creditsUsed : 0;
      const newCredits = currentCredits + cost;
      
      // Update Supabase directly so stats carry over to other devices/browsers
      if (user) {
         upsertFeatureAction("usage", {
           credits_used: newCredits,
           last_reset: prev.lastReset
         }).catch(e => console.error("Failed to sync usage to supabase:", e));
      }

      return {
        ...prev,
        creditsUsed: newCredits,
      };
    });
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
    heavy: preferences.heavy !== "default" ? preferences.heavy : defaultModels.heavy,
    judge: preferences.judge !== "default" ? preferences.judge : defaultModels.judge,
    grading: preferences.grading !== "default" ? preferences.grading : "Claude 4.5 Haiku" // Default math/essay grading
  };
}
