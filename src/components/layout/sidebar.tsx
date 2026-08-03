"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { FileText, Mic, Sparkles, BookOpen, Clock, Activity, Settings, Network, Search, MessageSquare, Bot, PenLine, LayoutDashboard, CreditCard, PanelLeftClose, Globe, FerrisWheel, Calendar, CalendarDays, Menu, Brain, AlignLeft } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Study Assistant", icon: MessageSquare },
  { href: "/flashcards", label: "Flashcards", icon: BookOpen },
  { href: "/quiz", label: "Quiz Maker", icon: PenLine },
  { href: "/essay", label: "Essay", icon: FileText },
  { href: "/research", label: "Research", icon: Search, pro: true },
  { href: "/debate", label: "Debate", icon: Bot, pro: true },
  { href: "/math-solver", label: "Math Solver", icon: Brain, pro: true },
  { href: "/mindmaps", label: "Mindmaps", icon: Network, pro: true },
  { href: "/explore/schedule-maker", label: "Schedules", icon: Calendar, premium: true },
  { href: "/explore/note-summarizer", label: "Note Summarizer", icon: AlignLeft, pro: true },
  { href: "/explore", label: "Explore", icon: Globe },
  { href: "/fun", label: "Fun", icon: FerrisWheel },
  { href: "/history", label: "History", icon: Clock },
];

import { useStreak } from "@/hooks/use-streak";
import { Flame } from "lucide-react";

export function Sidebar({ isOpen = true, onClose, onOpen, isMobile = false, onOpenSettings }: { isOpen?: boolean; onClose?: () => void; onOpen?: () => void; isMobile?: boolean; onOpenSettings?: () => void }) {
  const pathname = usePathname();
  const { creditsUsed, dailyLimit, isLoaded } = useSubscription();
  const { streak, activeToday, loading: streakLoading } = useStreak();
  
  const rawPercent = isLoaded ? Math.min(100, (creditsUsed / dailyLimit) * 100) : 0;
  const displayPercent = rawPercent > 0 && rawPercent < 0.1 ? "<0.1" : rawPercent.toFixed(1);

  const isCollapsed = !isOpen;

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
              : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative group",
                  active
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-600/10 text-amber-500 font-bold border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                    : "text-slate-400 hover:text-white hover:bg-white/10 border border-transparent",
                  comingSoon && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", active && "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]")} />
                {!isCollapsed && label}
                {('pro' in item && item.pro) && !isCollapsed && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] uppercase tracking-wider font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-md">Pro</span>
                )}
                {('premium' in item && item.premium) && !isCollapsed && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] uppercase tracking-wider font-bold bg-gradient-to-br from-slate-100/20 to-slate-400/10 text-slate-200 border border-slate-300/30 px-1.5 py-0.5 rounded-md shadow-[0_0_8px_rgba(203,213,225,0.15)]">Premium</span>
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
          
          <div className={cn("flex gap-2 mb-2", isCollapsed && "flex-col")}>
            <Link href="/calendar" className={cn("flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all border group", pathname === "/calendar" ? "bg-blue-500/10 border-blue-500/20 text-blue-500" : "bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10")}>
              <CalendarDays className={cn("w-5 h-5 transition-transform group-hover:scale-110 group-hover:-rotate-3", pathname === "/calendar" && "drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]")} />
              {!isCollapsed && <span className="text-[10px] font-bold uppercase tracking-wider">Calendar</span>}
            </Link>
            
            <div className={cn("flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all border", activeToday ? "bg-orange-500/10 border-orange-500/20 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]" : "bg-white/5 border-transparent text-slate-400")}>
              <Flame className={cn("w-5 h-5", activeToday && "animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]")} />
              {!isCollapsed && (
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {streakLoading ? "..." : `${streak} Day${streak === 1 ? "" : "s"}`}
                </span>
              )}
            </div>
          </div>

          <Link href="/community" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group border border-transparent", pathname === "/community" ? "bg-white/10 text-white font-bold border-white/10" : "text-slate-400 hover:text-white hover:bg-white/10", isCollapsed && "justify-center")}>
            <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            {!isCollapsed && "Community"}
          </Link>
          <Link href="/admin" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group border border-transparent", pathname === "/admin" ? "bg-white/10 text-white font-bold border-white/10" : "text-slate-400 hover:text-white hover:bg-white/10", isCollapsed && "justify-center")}>
            <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            {!isCollapsed && "Admin"}
          </Link>

          {!isCollapsed && (
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden group mt-2">
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2 text-slate-300">
                  <CreditCard className="w-4 h-4" />
                  <p className="text-xs font-bold tracking-wide">Usage</p>
                </div>
                <Link href="/subscriptions" className="text-[10px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-1 rounded-md transition-colors">Upgrade</Link>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mb-2 overflow-hidden relative z-10">
                <div className={cn("h-1.5 rounded-full transition-all shadow-[0_0_10px_currentColor]", rawPercent > 90 ? "bg-red-500 text-red-500" : "bg-amber-500 text-amber-500")} style={{ width: `${rawPercent}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium relative z-10">{isLoaded ? `${displayPercent}% used` : "Loading..."}</p>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className={cn("p-4 border-t border-white/5 bg-white/5 flex items-center justify-between gap-3 backdrop-blur-md", isCollapsed && "flex-col justify-center px-2 py-4 gap-4")}>
          <div className={cn("flex items-center gap-3 min-w-0", isCollapsed && "gap-0")}>
            <div className="shrink-0 p-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500">
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
        
      </div>
    </aside>
  );
}
