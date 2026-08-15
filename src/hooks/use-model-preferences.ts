"use client";

import { usePersistentState } from "./use-persistent-state";
import { ModelType } from "./use-subscription";

export type ModelCategory = "generation" | "heavy" | "grading" | "judge";

export type ModelPreferences = Record<ModelCategory, ModelType | "default">;

export const DEFAULT_MODEL_PREFERENCES: ModelPreferences = {
  generation: "default", // defaults to Tier engine or Gemini 3.6 Flash
  heavy: "default", // defaults to Deepseek-V4-Flash
  grading: "default", // defaults to Claude 4.5 Haiku
  judge: "default", // defaults to Claude 4.5 Haiku
};

export function useModelPreferences() {
  const [preferences, setPreferences, isLoaded] = usePersistentState<ModelPreferences>(
    "perenne_model_preferences",
    DEFAULT_MODEL_PREFERENCES
  );

  const updatePreference = (category: ModelCategory, model: ModelType | "default") => {
    setPreferences((prev: ModelPreferences) => ({
      ...prev,
      [category]: model,
    }));
  };

  return { preferences, updatePreference, isLoaded };
}
