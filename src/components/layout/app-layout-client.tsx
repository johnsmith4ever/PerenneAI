"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        {!sidebarOpen && (
          <div className="p-4 border-b border-border bg-card/50 flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="shrink-0">
              <Menu className="w-5 h-5" />
            </Button>
            <span className="ml-3 font-serif font-bold text-lg">Perenne</span>
          </div>
        )}
        <div className="flex-1 max-w-4xl w-full mx-auto px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
