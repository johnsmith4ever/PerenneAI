"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Trophy, MousePointerClick, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
};

export default function ClickerGamePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [clicks, setClicks] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/clicker");
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
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 0.1);
      }, 100);
    } else if (isPlaying && timeLeft <= 0) {
      setTimeLeft(0);
      setIsPlaying(false);
      setIsFinished(true);
      submitScore(clicks / 10);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, clicks]);

  const submitScore = async (cps: number) => {
    try {
      const res = await fetch("/api/clicker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: cps }),
      });
      const data = await res.json();
      if (data.newHighScore) {
        // Refresh leaderboard to show their new score
        fetchLeaderboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = () => {
    setClicks(0);
    setTimeLeft(10);
    setIsFinished(false);
    setIsPlaying(true);
  };

  const handleClick = () => {
    if (isPlaying) {
      setClicks(prev => prev + 1);
    } else if (!isFinished && !isPlaying) {
      startGame();
      setClicks(1); // count the first click
    }
  };

  const cps = (clicks / (10 - (timeLeft > 0 ? timeLeft : 0))).toFixed(2);
  const finalCps = (clicks / 10).toFixed(2);

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
            10s Reaction Clicker
          </h1>
          <p className="text-sm text-muted-foreground">Test your clicking speed. Can you beat the high score?</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Game Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Time Left</p>
              <p className="text-4xl font-black font-mono">{Math.max(0, timeLeft).toFixed(1)}s</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Current CPS</p>
              <p className="text-4xl font-black font-mono">{isPlaying && clicks > 0 ? cps : (isFinished ? finalCps : "0.00")}</p>
            </div>
          </div>

          <div
            onClick={handleClick}
            role="button"
            tabIndex={0}
            className={cn(
              "w-full h-80 rounded-3xl border-4 shadow-xl transition-all duration-100 flex flex-col items-center justify-center gap-4 group cursor-pointer",
              !isPlaying && !isFinished ? "bg-primary text-primary-foreground border-primary/50 hover:bg-primary/90 active:scale-[0.98]" : 
              isPlaying ? "bg-amber-500 text-white border-amber-600 active:bg-amber-600 active:scale-[0.98]" :
              "bg-card border-border cursor-default"
            )}
          >
            {!isPlaying && !isFinished && (
              <>
                <MousePointerClick className="w-16 h-16 opacity-80 group-hover:scale-110 transition-transform" />
                <span className="text-3xl font-black">CLICK TO START</span>
              </>
            )}
            
            {isPlaying && (
              <span className="text-8xl font-black font-mono select-none pointer-events-none">{clicks}</span>
            )}

            {isFinished && (
              <div className="text-center text-foreground cursor-default">
                <p className="text-xl font-bold mb-2">Time's Up!</p>
                <p className="text-muted-foreground mb-4">You clicked <span className="text-primary font-black">{clicks}</span> times in 10 seconds.</p>
                <h2 className="text-6xl font-black text-primary font-mono mb-8">{finalCps} CPS</h2>
                <Button 
                  onClick={(e) => { 
                    e.stopPropagation(); // prevent triggering the parent div's onClick
                    setIsFinished(false); 
                    setClicks(0); 
                    setTimeLeft(10); 
                  }} 
                  size="lg" 
                  className="rounded-xl shadow-lg"
                >
                  <RefreshCcw className="w-5 h-5 mr-2" /> Play Again
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm h-[500px] flex flex-col">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Global Leaderboard
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
            {loadingLB ? (
              <p className="text-sm text-muted-foreground text-center py-10">Loading scores...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No scores yet. Be the first!</p>
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
                  <div className="font-bold font-mono text-primary">
                    {entry.score.toFixed(2)}
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
