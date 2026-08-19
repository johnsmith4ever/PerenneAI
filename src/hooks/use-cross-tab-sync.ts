import { useEffect } from "react";

export function useCrossTabSync(key: string, callback: () => void) {
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) {
        callback();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, callback]);

  const triggerSync = () => {
    window.localStorage.setItem(key, Date.now().toString());
  };

  return triggerSync;
}
