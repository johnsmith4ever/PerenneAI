import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
export function getPersistentStateKey(baseKey: string, userId?: string | null) {
  return `${baseKey}_${userId || 'guest'}`;
}

export function usePersistentState<T>(baseKey: string, initialValue: T) {
  const { userId, isLoaded } = useAuth();
  const key = `${baseKey}_${userId || 'guest'}`;

  // Always start with initialValue so SSR and the initial client render match,
  // preventing React hydration errors. The useEffect below syncs from localStorage
  // after hydration is complete.
  const [state, setState] = useState<T>(initialValue);
  
  const [isStateLoaded, setIsStateLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setState(JSON.parse(item));
      } else {
        setState(initialValue);
      }
    } catch (error) {
      console.warn("Error reading localStorage", error);
    }
    setIsStateLoaded(true);
  }, [key, isLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setState(JSON.parse(e.newValue));
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setState(e.detail.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("persistent-state-update", handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("persistent-state-update", handleCustomEvent as EventListener);
    };
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(new CustomEvent("persistent-state-update", {
          detail: { key, newValue: valueToStore }
        }));
      }
    } catch (error) {
      console.warn("Error setting localStorage", error);
    }
  };

  return [state, setValue, isStateLoaded] as const;
}
