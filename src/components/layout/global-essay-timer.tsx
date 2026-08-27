"use client";

import { useEffect } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Clock } from "lucide-react";

export function GlobalEssayTimer() {
  const [essayTimeLeft, setEssayTimeLeft] = usePersistentState<number>("essay_time_left", 0);
  const [essayTimerState, setEssayTimerState] = usePersistentState<"idle" | "running" | "expired" | "forfeited">("essay_timer_state", "idle");

  const [mathTimeLeft, setMathTimeLeft] = usePersistentState<number | null>("math_time", null);
  const [mathExamState, setMathExamState] = usePersistentState<string>("math_examstate", "setup");
  
  const pathname = usePathname();

  useEffect(() => {
    if (essayTimerState === "running" && essayTimeLeft > 0) {
      const timer = setInterval(() => setEssayTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (essayTimerState === "running" && essayTimeLeft === 0) {
      setEssayTimerState("expired");
    }
  }, [essayTimerState, essayTimeLeft, setEssayTimeLeft, setEssayTimerState]);

  useEffect(() => {
    if (mathExamState === "taking" && mathTimeLeft !== null && mathTimeLeft > 0) {
      const timer = setInterval(() => setMathTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(timer);
    } else if (mathExamState === "taking" && mathTimeLeft === 0) {
      // It's handled by math solver auto-submit, but we can clear timer here
    }
  }, [mathExamState, mathTimeLeft, setMathTimeLeft]);

  const isEssayActive = essayTimerState === "running" || essayTimerState === "expired";
  const isMathActive = mathExamState === "taking" && mathTimeLeft !== null;

  if (!isEssayActive && !isMathActive) return null;

  const timeLeft = isEssayActive ? essayTimeLeft : (mathTimeLeft || 0);
  const isExpired = isEssayActive ? essayTimerState === "expired" : timeLeft === 0;

  return (
    <div className="fixed top-4 right-8 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg backdrop-blur-md transition-all",
        essayTimeLeft > 300 
          ? "bg-background/80 border-border text-foreground" 
          : "bg-red-500/90 border-red-500 text-white shadow-red-500/20"
      )}>
        <Clock className={cn("w-4 h-4", timeLeft <= 300 && "animate-pulse")} />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 leading-none mb-1">
            {isExpired ? "Time's Up!" : (isEssayActive ? "Essay Timer" : "Math Timer")}
          </span>
          <span className="font-mono text-base font-bold leading-none">
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
