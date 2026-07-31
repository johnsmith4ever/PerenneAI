"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { BookOpen, PenLine, FileText, LayoutDashboard, MessageSquare, Clock, CreditCard, PanelLeftClose, Globe, Network, FerrisWheel, Banknote, Calendar, MonitorPlay, Scale, AlignLeft } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Study Assistant", icon: MessageSquare },
  { href: "/flashcards", label: "Flashcards", icon: BookOpen },
  { href: "/quiz", label: "Quiz Maker", icon: PenLine },
  { href: "/essay", label: "Essay", icon: FileText },
  { href: "/mindmaps", label: "Mindmaps", icon: Network },
  { href: "/explore/schedule-maker", label: "Schedules", icon: Calendar },
  { href: "/explore/presentation", label: "Presentations", icon: MonitorPlay },
  { href: "/explore/pro-con", label: "Pro / Con", icon: Scale },
  { href: "/explore/note-summarizer", label: "Note Summarizer", icon: AlignLeft },
  { href: "/explore", label: "Explore", icon: Globe },
  { href: "/fun", label: "Fun", icon: FerrisWheel },
  { href: "/history", label: "History", icon: Clock },
];

export function Sidebar({ isOpen = true, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { creditsUsed, dailyLimit, isLoaded } = useSubscription();
  const rawPercent = isLoaded ? Math.min(100, (creditsUsed / dailyLimit) * 100) : 0;
  const displayPercent = rawPercent > 0 && rawPercent < 0.1 ? "<0.1" : rawPercent.toFixed(1);

  return (
    <aside
      className={cn(
        "shrink-0 border-border flex flex-col h-full bg-card overflow-hidden transition-all duration-300 ease-in-out",
        isOpen ? "w-56 border-r" : "w-0 border-r-0"
      )}
    >
      <div className="w-56 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={28} height={28} className="shrink-0 logo-img" />
            <span className="font-serif text-2xl font-bold text-foreground tracking-tight leading-none">
              Perenne
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="Close Sidebar">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Study smarter</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
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
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors relative group",
                active
                  ? "bg-primary text-white font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                comingSoon && "opacity-60 cursor-not-allowed pointer-events-none"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {comingSoon && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-wider font-bold bg-muted-foreground/20 px-1.5 py-0.5 rounded text-muted-foreground">Soon</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Explore, Subscriptions & Usage */}
      <div className="px-3 mb-3">
        <Link href="/community" className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-1", pathname === "/community" ? "bg-primary text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
          <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Community
        </Link>
        <Link href="/admin" className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-1", pathname === "/admin" ? "bg-primary text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
          <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Admin
        </Link>

        <Link href="/subscriptions" className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-2", pathname === "/subscriptions" ? "bg-primary text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
          <CreditCard className="w-4 h-4 shrink-0" />
          Subscriptions
        </Link>
        <div className="p-3 rounded-xl bg-background border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">Usage</p>
            <Link href="/subscriptions" className="text-[10px] font-medium text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded">Top up</Link>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mb-1.5 overflow-hidden">
            <div className={cn("h-1.5 rounded-full transition-all", rawPercent > 90 ? "bg-red-500" : "bg-primary")} style={{ width: `${rawPercent}%` }}></div>
          </div>
          <p className="text-[10px] text-muted-foreground">{isLoaded ? `${displayPercent}% used` : "Loading..."}</p>
        </div>
      </div>

      {/* User footer */}
      <div className="p-4 border-t border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserButton />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">My Account</p>
            <p className="text-[10px] text-muted-foreground truncate">Manage settings</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
      </div>
    </aside>
  );
}
