"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { BookOpen, PenLine, FileText, LayoutDashboard, MessageSquare, Clock, CreditCard } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Study Assistant", icon: MessageSquare },
  { href: "/flashcards", label: "Flashcards", icon: BookOpen },
  { href: "/quiz", label: "Quiz Maker", icon: PenLine },
  { href: "/essay", label: "Essay", icon: FileText },
  { href: "/history", label: "History", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();
  const { creditsUsed, dailyLimit, isLoaded } = useSubscription();
  const rawPercent = isLoaded ? Math.min(100, (creditsUsed / dailyLimit) * 100) : 0;
  const displayPercent = rawPercent > 0 && rawPercent < 0.1 ? "<0.1" : rawPercent.toFixed(1);

  return (
    <aside className="w-56 shrink-0 border-r border-border flex flex-col h-full bg-[#faf9f5] dark:bg-card/50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-0.5">
          <Image src="/logo.svg" alt="Logo" width={28} height={28} className="shrink-0 logo-img" />
          <span className="font-serif text-2xl font-bold text-foreground tracking-tight leading-none">
            Perenne
          </span>
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
                  : "text-muted-foreground hover:text-foreground hover:bg-[#ede8df] dark:hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Subscriptions & Usage */}
      <div className="px-3 mb-3">
        <Link href="/subscriptions" className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-2", pathname === "/subscriptions" ? "bg-primary text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-[#ede8df] dark:hover:bg-muted")}>
          <CreditCard className="w-4 h-4 shrink-0" />
          Subscriptions
        </Link>
        <div className="p-3 rounded-xl bg-white dark:bg-card border border-border shadow-sm">
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
    </aside>
  );
}
