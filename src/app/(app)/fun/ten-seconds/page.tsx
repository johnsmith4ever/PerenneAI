"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Timer, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number; // score is the difference in milliseconds
};

export default function TenSecondsGamePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalDiffMs, setFinalDiffMs] = useState(0);
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/ten-seconds");
      const data = await res.json();
      if (data.status === "success") {
        setLeaderboard(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLB(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    let animationFrame: number;
    if (isPlaying && startTime) {
      const updateTimer = () => {
        setDisplayTime(Date.now() - startTime);
        animationFrame = requestAnimationFrame(updateTimer);
      };
      animationFrame = requestAnimationFrame(updateTimer);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, startTime]);

  const submitScore = async (diffMs: number) => {
    try {
      const res = await fetch("/api/ten-seconds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: diffMs }),
      });
      const data = await res.json();
      if (data.newHighScore) {
        fetchLeaderboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInteract = () => {
    if (!isPlaying && !isFinished) {
      // Start Game
      setStartTime(Date.now());
      setIsPlaying(true);
      setDisplayTime(0);
    } else if (isPlaying) {
      // Stop Game
      const endTime = Date.now();
      const durationMs = endTime - (startTime || 0);
      const diffMs = Math.abs(10000 - durationMs);
      
      setIsPlaying(false);
      setIsFinished(true);
      setDisplayTime(durationMs);
      setFinalDiffMs(diffMs);
      
      submitScore(diffMs);
    }
  };

  // Convert ms to seconds string with 3 decimal places
  const formatTime = (ms: number) => (ms / 1000).toFixed(3);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/fun">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-serif" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
            Blind 10s Timer
          </h1>
          <p className="text-sm text-muted-foreground">Can you stop the clock exactly at 10.000 seconds?</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Game Area */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center min-h-[400px]">
          
          <div
            onClick={handleInteract}
            role="button"
            tabIndex={0}
            className={cn(
              "w-full h-80 rounded-3xl border-4 shadow-xl transition-all duration-100 flex flex-col items-center justify-center gap-4 group cursor-pointer",
              !isPlaying && !isFinished ? "bg-primary text-primary-foreground border-primary/50 hover:bg-primary/90 active:scale-[0.98]" : 
              isPlaying ? "bg-red-500 text-white border-red-600 active:bg-red-600 active:scale-[0.98]" :
              "bg-card border-border cursor-default"
            )}
          >
            {!isPlaying && !isFinished && (
              <>
                <Timer className="w-16 h-16 opacity-80 group-hover:scale-110 transition-transform" />
                <span className="text-3xl font-black tracking-wider">CLICK TO START</span>
                <p className="text-primary-foreground/70 text-sm max-w-sm text-center px-4">
                  The timer will hide itself after 2 seconds. Trust your internal clock!
                </p>
              </>
            )}
            
            {isPlaying && (
              <div className="flex flex-col items-center justify-center gap-4">
                <span className={cn(
                  "text-8xl font-black font-mono select-none pointer-events-none transition-opacity duration-1000",
                  displayTime > 2000 ? "opacity-0" : "opacity-100"
                )}>
                  {formatTime(displayTime)}s
                </span>
                <span className="text-4xl font-black tracking-widest mt-8">STOP</span>
              </div>
            )}

            {isFinished && (
              <div className="text-center text-foreground cursor-default p-8">
                <p className="text-xl font-bold mb-2">You stopped at</p>
                <h2 className={cn(
                  "text-6xl font-black font-mono mb-4",
                  finalDiffMs < 100 ? "text-green-500" :
                  finalDiffMs < 500 ? "text-amber-500" : "text-destructive"
                )}>
                  {formatTime(displayTime)}s
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  You were <span className="font-bold text-foreground">{formatTime(finalDiffMs)}s</span> away from 10.
                </p>
                <Button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setIsFinished(false); 
                    setDisplayTime(0); 
                    setStartTime(null);
                  }} 
                  size="lg" 
                  className="rounded-xl shadow-lg"
                >
                  <RefreshCcw className="w-5 h-5 mr-2" /> Try Again
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm h-[500px] flex flex-col">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Most Accurate
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
            {loadingLB ? (
              <p className="text-sm text-muted-foreground text-center py-10">Loading scores...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No scores yet. Set the bar!</p>
            ) : (
              leaderboard.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                    i === 0 ? "bg-amber-500 text-white" : 
                    i === 1 ? "bg-slate-300 text-slate-800" :
                    i === 2 ? "bg-amber-700 text-white" :
                    "bg-background text-muted-foreground"
                  )}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm truncate">{entry.name}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold font-mono text-primary text-sm">
                      {formatTime(entry.score)}s
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">off</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
