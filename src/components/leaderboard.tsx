"use client";

import { useState, useEffect } from "react";
import { Trophy, Flame, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaderboardUser = {
  id: string;
  name: string;
  score: number;
  tier: string;
};

export function Leaderboard() {
  const [top5, setTop5] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setTop5(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-8 flex flex-col items-center justify-center min-h-[250px]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
        <p className="text-xs text-muted-foreground">Loading scholars...</p>
      </div>
    );
  }

  if (top5.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -z-10 blur-2xl" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground">Top Scholars</h2>
          <p className="text-xs text-muted-foreground">Most active students today</p>
        </div>
      </div>

      <div className="space-y-3">
        {top5.map((user, index) => (
          <div key={user.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border",
              index === 0 ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.4)]" :
              index === 1 ? "bg-slate-300/20 text-slate-300 border-slate-300/50" :
              index === 2 ? "bg-amber-700/20 text-amber-600 border-amber-700/50" :
              "bg-muted border-border text-muted-foreground"
            )}>
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-foreground">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                {user.tier} Tier
              </p>
            </div>
            
            <div className="text-right shrink-0">
              <p className="text-sm font-bold tabular-nums text-foreground">{user.score.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 uppercase tracking-wider">
                <Zap className="w-3 h-3 text-amber-500" /> XP
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
