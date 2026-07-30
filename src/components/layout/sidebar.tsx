"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { BookOpen, PenLine, FileText, LayoutDashboard, MessageSquare, Clock, CreditCard, PanelLeftClose, Globe, Network, FerrisWheel } from "lucide-react";
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
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary text-white font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Explore, Subscriptions & Usage */}
      <div className="px-3 mb-3">
        <Link href="/daily-poll" className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-1", pathname === "/daily-poll" ? "bg-primary text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
          <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
          Daily Poll
        </Link>
        <Link href="/admin" className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-1", pathname === "/admin" ? "bg-primary text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
          <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Admin
        </Link>
        <Link href="/terms" className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-1", pathname === "/terms" ? "bg-primary text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
          <FileText className="w-4 h-4 shrink-0" />
          Terms & Conditions
        </Link>
        <Link href="/explore" className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-1", pathname === "/explore" || pathname.startsWith("/explore/") ? "bg-primary text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
          <Globe className="w-4 h-4 shrink-0" />
          Explore
        </Link>
        <Link href="/fun" className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-1", pathname === "/fun" || pathname.startsWith("/fun/") ? "bg-primary text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
          <FerrisWheel className="w-4 h-4 shrink-0" />
          Fun
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
