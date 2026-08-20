import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function usePersistentState<T>(baseKey: string, initialValue: T) {
  const { user, isLoaded } = useUser();
  const key = `${baseKey}_${user?.id || 'guest'}`;

  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        console.warn("Error reading localStorage", error);
        return initialValue;
      }
    }
    return initialValue;
  });
  
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

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn("Error setting localStorage", error);
    }
  };

  return [state, setValue, isStateLoaded] as const;
}
