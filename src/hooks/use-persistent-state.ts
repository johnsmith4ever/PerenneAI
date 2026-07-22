"use client";

import { useState, useEffect } from "react";

export function usePersistentState<T>(key: string, initialValue: T) {
  // Always initialize with initialValue to prevent server-side hydration mismatch
  const [state, setState] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // On mount, check if there's a saved value in localStorage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && typeof initialValue === 'object') {
          setState({ ...initialValue, ...parsed });
        } else {
          setState(parsed);
        }
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    setIsLoaded(true);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setState(JSON.parse(e.newValue));
      }
    };

    const handleCustomStorage = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setState(JSON.parse(e.detail.value));
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("local-storage", handleCustomStorage as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("local-storage", handleCustomStorage as EventListener);
    };
  }, [key]);

  // Whenever state changes (and we've finished initial load), save to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const stringified = JSON.stringify(state);
      const currentStored = window.localStorage.getItem(key);
      
      // Only update local storage and dispatch event if the value actually changed.
      // This prevents the infinite loop when receiving updates from other components.
      if (stringified !== currentStored) {
        window.localStorage.setItem(key, stringified);
        window.dispatchEvent(new CustomEvent("local-storage", { detail: { key, value: stringified } }));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state, isLoaded]);

  return [state, setState, isLoaded] as const;
}
