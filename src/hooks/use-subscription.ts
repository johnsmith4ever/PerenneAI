import { useEffect } from "react";
import { usePersistentState } from "./use-persistent-state";

export type Tier = "Free" | "Core" | "Pro" | "Premium" | "Maximum";

export const TIER_ALLOWANCES: Record<Tier, number> = {
  Free: 17_000,
  Core: 50_000,
  Pro: 100_000,
  Premium: 180_000,
  Maximum: 300_000,
};

export const TIER_RANK: Record<Tier, number> = {
  Free: 0,
  Core: 1,
  Pro: 2,
  Premium: 3,
  Maximum: 4,
};

export type ModelType = 
  | "Polaris 1" 
  | "Bastion 3.5 Flash" 
  | "Bastion 3.5 Pro"
  | "Apollo V4 Flash" 
  | "Apollo V4 Pro" 
  | "Atlas 4.5 Flash"
  | "Atlas 5 Pro";

export const MODEL_COSTS: Record<ModelType, { input: number, output: number }> = {
  "Polaris 1": { input: 1, output: 1 },        // Llama - Cheapest
  "Bastion 3.5 Flash": { input: 2, output: 2 }, // Gemini Flash
  "Bastion 3.5 Pro": { input: 4, output: 4 },   // Gemini Pro
  "Apollo V4 Flash": { input: 3, output: 3 },   // Deepseek Flash
  "Apollo V4 Pro": { input: 6, output: 6 },     // Deepseek Pro
  "Atlas 4.5 Flash": { input: 10, output: 10 }, // Claude Haiku
  "Atlas 5 Pro": { input: 20, output: 20 },     // Claude Sonnet - Most Expensive
};

type SubscriptionState = {
  tier: Tier;
  creditsUsed: number;
  lastReset: string;
};

import { useUser } from "@clerk/nextjs";

export function useSubscription() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const [state, setState, isLoaded] = usePersistentState<SubscriptionState>("user_subscription", {
    tier: "Free",
    creditsUsed: 0,
    lastReset: new Date().toISOString().split("T")[0],
  });

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

  // Sync tier from Clerk public metadata
  useEffect(() => {
    if (clerkLoaded && user) {
      const dbTier = (user.publicMetadata.tier as Tier) || "Free";
      if (dbTier !== state.tier) {
        setState({ ...state, tier: dbTier });
      }
    }
  }, [clerkLoaded, user, state.tier, setState]);

  const safeCreditsUsed = state.creditsUsed && !isNaN(state.creditsUsed) ? state.creditsUsed : 0;
  const dailyLimit = TIER_ALLOWANCES[state.tier];
  const creditsRemaining = Math.max(0, dailyLimit - safeCreditsUsed);

  // Pre-check for cost
  // In unrestricted mode, we just track tokens, so canAfford is always true.
  const canAfford = (wordCount: number, model: ModelType): boolean => {
    return true;
  };

  const deductCredits = (inputTokens: number, outputTokens: number, model: ModelType, feature: "chat" | "other" = "other") => {
    let costConfig = MODEL_COSTS[model] || { input: 1, output: 1 };
    
    // Llama is x1 in chat, x2 in other features (essay, flashcards, etc.)
    if (model === "Polaris 1" && feature !== "chat") {
      costConfig = { input: costConfig.input * 2, output: costConfig.output * 2 };
    }

    const safeInput = inputTokens || 0;
    const safeOutput = outputTokens || 0;
    const cost = (safeInput * costConfig.input) + (safeOutput * costConfig.output);
    
    setState((prev) => {
      const currentCredits = prev.creditsUsed && !isNaN(prev.creditsUsed) ? prev.creditsUsed : 0;
      return {
        ...prev,
        creditsUsed: currentCredits + cost,
      };
    });
  };

  const upgradeTo = (tier: Tier) => {
    setState((prev) => ({
      ...prev,
      tier,
    }));
  };

  return {
    tier: state.tier,
    creditsUsed: Math.ceil(safeCreditsUsed),
    creditsRemaining: Math.ceil(creditsRemaining),
    dailyLimit,
    canAfford,
    deductCredits,
    upgradeTo,
    isLoaded
  };
}
