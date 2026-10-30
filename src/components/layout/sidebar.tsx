"use client";

import { usePersistentState, getPersistentStateKey } from "@/hooks/use-persistent-state";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { FileText, Mic, Sparkles, BookOpen, Clock, Activity, Settings, Network, Search, MessageSquare, Bot, PenLine, LayoutDashboard, CreditCard, PanelLeftClose, Globe, FerrisWheel, Calendar, CalendarDays, Menu, Brain, AlignLeft, LogIn, Target, AlertTriangle, X, Lock } from "lucide-react";
import { useSubscription, FREE_ACCESS_MODE, TIER_RANK } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Study Assistant", icon: MessageSquare, aqa: true },
  { href: "/flashcards", label: "Flashcards", icon: BookOpen, aqa: true },
  { href: "/quiz", label: "Quiz Maker", icon: PenLine, aqa: true },
  { href: "/quiz/exam-sim", label: "Exam Sim", icon: Brain, aqa: true },
  { href: "/essay", label: "Essay", icon: FileText, aqa: true },
  { href: "/math-solver", label: "Maths", icon: Brain, pro: true, aqa: true },
  { href: "/explore/note-summarizer", label: "Understand", icon: AlignLeft, pro: true, aqa: true },
  { href: "/mindmaps", label: "Mindmaps", icon: Network, pro: true, aqa: true },
  { href: "/debate", label: "Debate", icon: Bot, pro: true },
  { href: "/history", label: "History", icon: Clock },
  { href: "/weak-areas", label: "Weak Areas", icon: Target },
];

import { useStreak } from "@/hooks/use-streak";
import { Flame } from "lucide-react";

export function Sidebar({ isOpen = true, onClose, onOpen, isMobile = false, onOpenSettings }: { isOpen?: boolean; onClose?: () => void; onOpen?: () => void; isMobile?: boolean; onOpenSettings?: () => void }) {
  const pathname = usePathname();
  const { creditsUsed, dailyLimit, isLoaded, tier, tierRank } = useSubscription();
  const { user, isLoaded: userLoaded } = useUser();
  const isGuest = userLoaded && !user;
  const { streak, activeToday, loading: streakLoading } = useStreak();
  const isPayingUser = tier === "Pro" || tier === "Premium" || tier === "Maximum";
  
  const rawPercent = isLoaded ? Math.min(100, (creditsUsed / dailyLimit) * 100) : 0;
  const displayPercent = rawPercent > 0 && rawPercent < 0.1 ? "<0.1" : rawPercent.toFixed(1);

  const isCollapsed = !isOpen;

  const router = useRouter();
  const [cheatWarning, setCheatWarning] = useState<{type: "exam_sim" | "math" | "essay", href: string} | null>(null);

  const [examSimState, setExamSimState] = usePersistentState("exam_sim_state", "setup");
  const [mathExamState, setMathExamState] = usePersistentState("math_examstate", "setup");
  const [essayTimerState, setEssayTimerState] = usePersistentState("essay_timer_state", "idle");

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    try {
      if (examSimState === "taking" && !href.includes("/exam-sim")) {
        e.preventDefault();
        setCheatWarning({ type: "exam_sim", href });
      } else if (mathExamState === "taking" && !href.includes("/math-solver")) {
        e.preventDefault();
        setCheatWarning({ type: "math", href });
      } else if (essayTimerState === "running" && !href.includes("/essay")) {
        e.preventDefault();
        setCheatWarning({ type: "essay", href });
      }
    } catch (err) {}
  };

  const handleForfeit = () => {
    if (!cheatWarning) return;
    
    // We need the full key (including user suffix) for the cross-component dispatch event
    let fullKey = "";
    if (cheatWarning.type === "exam_sim") {
      setExamSimState("forfeited");
      fullKey = getPersistentStateKey("exam_sim_state", user?.id);
    } else if (cheatWarning.type === "math") {
      setMathExamState("forfeited");
      fullKey = getPersistentStateKey("math_examstate", user?.id);
    } else if (cheatWarning.type === "essay") {
      setEssayTimerState("forfeited");
      fullKey = getPersistentStateKey("essay_timer_state", user?.id);
    }
    
    window.dispatchEvent(new CustomEvent("persistent-state-update", { detail: { key: fullKey, value: "forfeited" } }));
    setCheatWarning(null);
    router.push(cheatWarning.href);
  };

  return (
    <aside
      className={cn(
        "shrink-0 flex flex-col h-full transition-all duration-300 ease-in-out py-4 pl-4 z-40",
        isMobile ? "absolute inset-y-0 left-0" : "relative",
        isOpen ? "w-[260px]" : "w-[80px]"
      )}
    >
      {/* Floating Glassmorphic Container */}
      <div className="w-full flex flex-col h-full bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Logo Area */}
        <div className={cn("border-b border-white/5 bg-white/5 transition-all", isCollapsed ? "p-4 flex flex-col items-center gap-4" : "px-6 py-6")}>
          <div className={cn("flex items-center gap-2", isCollapsed ? "justify-center" : "justify-between mb-1")}>
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="Logo" width={28} height={28} className="shrink-0 logo-img drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] invert" />
              {!isCollapsed && (
                <span className="font-serif text-2xl font-black text-white tracking-tight leading-none uppercase">
                  Perenne
                </span>
              )}
            </div>
            {onClose && !isCollapsed && (
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Close Sidebar">
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
          {isCollapsed && onOpen && (
            <button onClick={() => onOpen()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 shadow-sm" title="Expand Sidebar">
               <Menu className="w-5 h-5" />
            </button>
          )}
          {!isCollapsed && <p className="text-xs text-slate-400 font-medium tracking-wide">Outsmart your curriculum.</p>}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const { href, label, icon: Icon } = item;
            const comingSoon = ('comingSoon' in item ? item.comingSoon : false) as boolean;
            
            const active = href === "/explore" 
              ? pathname === "/explore" 
              : href === "/quiz"
              ? pathname === "/quiz"
              : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={(e) => handleLinkClick(e, href)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative group",
                  active
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-600/10 text-amber-500 font-bold border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                    : "text-slate-400 hover:text-white hover:bg-white/10 border border-transparent",
                  comingSoon && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", active && "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]")} />
                {!isCollapsed && (
                  <div className="flex items-center gap-2">
                    {label}
                    {('aqa' in item && item.aqa) && (
                      <span className="text-[7.5px] uppercase tracking-wider font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-[1px] rounded-[3px] shadow-[0_0_8px_rgba(59,130,246,0.15)] leading-none -mt-px whitespace-nowrap">AQA</span>
                    )}
                  </div>
                )}

                {comingSoon && !isCollapsed && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-wider font-bold bg-white/10 px-1.5 py-0.5 rounded-md text-white/50">Soon</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Area */}
        <div className="px-3 pb-3 mt-auto flex flex-col gap-1">
          <Link href="/community" onClick={(e) => handleLinkClick(e, "/community")} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group border border-transparent", pathname === "/community" ? "bg-white/10 text-white font-bold border-white/10" : "text-slate-400 hover:text-white hover:bg-white/10", isCollapsed && "justify-center")}>
            <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            {!isCollapsed && "Community"}
          </Link>

          {!isCollapsed && (
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden group mt-2">
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2 text-slate-300">
                  <CreditCard className="w-4 h-4" />
                  <p className="text-xs font-bold tracking-wide">Usage</p>
                </div>
                <Link href="/subscriptions" onClick={(e) => handleLinkClick(e, "/subscriptions")} className="text-[10px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-1 rounded-md transition-colors">Upgrade</Link>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mb-2 overflow-hidden relative z-10">
                <div className={cn("h-1.5 rounded-full transition-all shadow-[0_0_10px_currentColor]", rawPercent > 90 ? "bg-red-500 text-red-500" : "bg-amber-500 text-amber-500")} style={{ width: `${rawPercent}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium relative z-10">{isLoaded ? `${displayPercent}% used` : "Loading..."}</p>
            </div>
          )}
        </div>

        {/* User Profile / Guest Sign In */}
        {isGuest ? (
          <div className={cn("p-4 border-t border-white/5 bg-white/5 backdrop-blur-md", isCollapsed && "px-2 py-4")}>
            {!isCollapsed ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Guest Mode
                </p>
                <p className="text-[10px] text-slate-400 leading-snug">Sign in to save progress and unlock more credits.</p>
                <Link
                  href="/sign-in"
                  onClick={(e) => handleLinkClick(e, "/sign-in")}
                  className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign In / Register
                </Link>
              </div>
            ) : (
              <Link href="/sign-in" onClick={(e) => handleLinkClick(e, "/sign-in")} className="flex items-center justify-center p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors" title="Sign In">
                <LogIn className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className={cn("p-4 border-t border-white/5 bg-white/5 flex items-center justify-between gap-3 backdrop-blur-md", isCollapsed && "flex-col justify-center px-2 py-4 gap-4")}>
            <div className={cn("flex items-center gap-3 min-w-0", isCollapsed && "gap-0")}>
              <div className="shrink-0 p-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" suppressHydrationWarning>
                <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 rounded-full border-2 border-transparent" } }} />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">My Account</p>
                  <button 
                    onClick={onOpenSettings}
                    className="text-[10px] text-slate-400 hover:text-white truncate uppercase tracking-wider transition-colors text-left"
                  >
                    Manage settings
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={onOpenSettings}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 shrink-0" 
              title="Device Layout Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
        
      </div>

      {cheatWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden relative p-6 text-center">
            <button onClick={() => setCheatWarning(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4 font-serif">Leave Exam?</h3>
            <p className="text-sm text-muted-foreground mb-8">
              WARNING: You are currently taking a timed {cheatWarning.type === 'exam_sim' ? 'Exam Simulator' : 'Maths'} session. 
              Navigating away means you will instantly forfeit the exam. Are you sure you want to leave?
            </p>
            
            <div className="space-y-3">
              <button onClick={handleForfeit} className="w-full py-3 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 font-bold transition-colors border border-red-500/20">
                Forfeit Exam & Leave
              </button>
              <button onClick={() => setCheatWarning(null)} className="w-full py-3 rounded-xl bg-muted text-foreground hover:bg-muted/80 font-bold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </aside>
  );
}
