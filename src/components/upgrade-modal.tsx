"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { X, Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UpgradeModalContextType {
  openUpgradeModal: (message?: string, actionLabel?: string, actionUrl?: string) => void;
  closeUpgradeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(undefined);

export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error("useUpgradeModal must be used within an UpgradeModalProvider");
  }
  return context;
}

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("This feature is restricted to a higher tier.");
  const [actionLabel, setActionLabel] = useState("View Subscriptions");
  const [actionUrl, setActionUrl] = useState("/subscriptions");

  const openUpgradeModal = (customMessage?: string, customActionLabel?: string, customActionUrl?: string) => {
    setMessage(customMessage || "This feature is restricted to a higher tier.");
    setActionLabel(customActionLabel || "View Subscriptions");
    setActionUrl(customActionUrl || "/subscriptions");
    setIsOpen(true);
  };

  const closeUpgradeModal = () => setIsOpen(false);

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal, closeUpgradeModal }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-background border border-border rounded-3xl p-8 max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

            <button onClick={closeUpgradeModal} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors z-10">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-black tracking-tight text-foreground">Premium Feature</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="w-full space-y-3 pt-2">
                <Link href={actionUrl} onClick={closeUpgradeModal} className="block w-full">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-md font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 group">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    {actionLabel}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="ghost" onClick={closeUpgradeModal} className="w-full text-muted-foreground hover:text-foreground rounded-xl">
                  Maybe Later
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UpgradeModalContext.Provider>
  );
}
