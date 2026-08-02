"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

type StreakData = {
  streak: number;
  activeToday: boolean;
};

export function useStreak() {
  const { user } = useUser();
  const [data, setData] = useState<StreakData>({ streak: 0, activeToday: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStreak = async () => {
      try {
        const res = await fetch("/api/streak", { method: "POST" });
        const json = await res.json();
        setData({
          streak: json.streak || 0,
          activeToday: json.activeToday || false,
        });
      } catch (e) {
        console.error("Failed to fetch streak:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStreak();
  }, [user]);

  return { ...data, loading };
}
