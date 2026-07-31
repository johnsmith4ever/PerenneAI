"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 overflow-y-auto relative flex flex-col break-words">
        {!sidebarOpen && (
          <div className="p-4 border-b border-border bg-card/50 flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="shrink-0">
              <Menu className="w-5 h-5" />
            </Button>
            <span className="ml-3 font-serif font-bold text-lg">Perenne</span>
          </div>
        )}
        <div className="flex-1 max-w-4xl w-full mx-auto px-8 py-8 relative">
          <Link href="/calendar">
            <Button size="icon" title="Global Calendar" className="absolute top-6 right-8 rounded-full shadow-lg z-50 hover:scale-105 transition-transform bg-primary text-primary-foreground border-2 border-background w-12 h-12 group">
              <Calendar className="w-5 h-5 group-hover:animate-bounce" />
            </Button>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
