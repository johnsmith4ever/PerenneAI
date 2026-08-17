"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { fetchUserStateAction, syncUserStateAction } from "@/actions/supabase";

export function usePersistentState<T>(baseKey: string, initialValue: T) {
  const { user, isLoaded: userLoaded } = useUser();
  const key = userLoaded ? (user ? `${baseKey}_${user.id}` : `guest_${baseKey}`) : baseKey;
  
  // Always initialize with initialValue to prevent server-side hydration mismatch
  const [state, setState] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Hydration Effect (Load from Supabase if logged in, else LocalStorage)
  useEffect(() => {
    if (!userLoaded) return; // Wait for clerk
    
    let isMounted = true;
    
    const hydrate = async () => {
      let finalState = initialValue;
      let stringified = null;

      if (user) {
        // Logged in: Fetch from Supabase as Source of Truth
        try {
          const cloudValue = await fetchUserStateAction(baseKey);
            
          if (cloudValue) {
            finalState = cloudValue as T;
            if (typeof finalState === 'object' && finalState !== null && !Array.isArray(finalState) && typeof initialValue === 'object') {
              finalState = { ...initialValue, ...finalState };
            }
            stringified = JSON.stringify(finalState);
          } else {
             // Fallback if no cloud state exists yet
             const item = window.localStorage.getItem(key);
             if (item) {
                 finalState = JSON.parse(item);
                 stringified = item;
             }
          }
        } catch (e) {
           console.error("Failed to load state from Supabase", e);
        }
      } else {
        // Guest mode: Read from LocalStorage only
        try {
          const item = window.localStorage.getItem(key);
          if (item) {
            finalState = JSON.parse(item);
            if (typeof finalState === 'object' && finalState !== null && !Array.isArray(finalState) && typeof initialValue === 'object') {
              finalState = { ...initialValue, ...finalState };
            }
            stringified = JSON.stringify(finalState);
          }
        } catch (e) {
          console.warn("Error reading localStorage", e);
        }
      }

      if (!isMounted) return;

      setState(finalState);
      setIsLoaded(true);

      // Keep local storage in sync as a fast read-through cache
      if (stringified) {
        window.localStorage.setItem(key, stringified);
      } else {
        window.localStorage.setItem(key, JSON.stringify(finalState));
      }
    };
    
    hydrate();

    // Event listeners for multi-tab sync (localStorage based)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) setState(JSON.parse(e.newValue));
    };
    const handleCustomStorage = (e: CustomEvent) => {
      if (e.detail.key === key) setState(JSON.parse(e.detail.value));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("local-storage", handleCustomStorage as EventListener);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("local-storage", handleCustomStorage as EventListener);
    };
  }, [key, userLoaded, user, baseKey]);

  // Track if we just hydrated to avoid syncing initial value immediately
  const hasHydrated = useRef(false);
  useEffect(() => {
    if (isLoaded) {
      hasHydrated.current = true;
    }
  }, [isLoaded]);

  // 2. Write-Through Sync Effect
  useEffect(() => {
    if (!isLoaded || !hasHydrated.current) return;
    
    const stringified = JSON.stringify(state);
    const currentStored = window.localStorage.getItem(key);
    
    if (stringified !== currentStored) {
      // Optimistic local update
      window.localStorage.setItem(key, stringified);
      window.dispatchEvent(new CustomEvent("local-storage", { detail: { key, value: stringified } }));
      
      // Async Sync to Supabase if logged in
      if (user) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          syncUserStateAction(baseKey, state).catch(e => console.error("Failed to sync state to Supabase", e));
        }, 1000); // 1 second debounce for rapid UI updates
      }
    }
  }, [state, isLoaded, key, baseKey, user]);

  return [state, setState, isLoaded] as const;
}
