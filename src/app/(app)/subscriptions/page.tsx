"use client";

import { CreditCard, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, Tier } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

const TIERS: { id: Tier; name: string; price: string; credits: string; features: string[] }[] = [
  {
    id: "Free",
    name: "Free",
    price: "£0.00",
    credits: "17,000",
    features: ["Polaris 1 (Llama)", "Bastion 3.5 Flash (Gemini)", "Apollo V4 Flash (Deepseek)"]
  },
  {
    id: "Core",
    name: "Core",
    price: "£1.99/mo",
    credits: "50,000",
    features: ["Bastion 3.5 Pro (Gemini)", "Access to History section", "Essay max 3 paragraphs"]
  },
  {
    id: "Pro",
    name: "Pro",
    price: "£3.99/mo",
    credits: "100,000",
    features: ["Apollo V4 Pro (Deepseek)", "Essay medium passage length", "Essay max 5 paragraphs", "Unlocks writing styles", "Relaxed token control"]
  },
  {
    id: "Premium",
    name: "Premium",
    price: "£6.99/mo",
    credits: "180,000",
    features: ["Atlas 4.5 Flash (Claude Haiku)", "Essay max 8 paragraphs", "Deepseek Flashcard generation", "Essay long passage length", "Happy developer"]
  },
  {
    id: "Maximum",
    name: "Maximum",
    price: "£10.99/mo",
    credits: "300,000",
    features: ["Atlas 5 Pro (Claude Sonnet)", "Priority access", "Very happy developer"]
  }
];

import { useState } from "react";

export default function SubscriptionsPage() {
  const { tier, creditsUsed, dailyLimit, isLoaded } = useSubscription();
  const [isLoadingTier, setIsLoadingTier] = useState<string | null>(null);

  const handleUpgrade = async (tierId: string) => {
    if (tierId === "Free") return;
    
    setIsLoadingTier(tierId);
    try {
      let priceId = "";
      // In a real app, these should come from an API or env variables injected into the frontend
      switch (tierId) {
        case "Core": priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_CORE || ""; break;
        case "Pro": priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || ""; break;
        case "Premium": priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM || ""; break;
        case "Maximum": priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAXIMUM || ""; break;
      }

      if (!priceId) {
        alert("Price ID not configured for this tier yet.");
        setIsLoadingTier(null);
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, tierName: tierId }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create checkout session");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong");
    } finally {
      setIsLoadingTier(null);
    }
  };

  if (!isLoaded) return null;

  const rawPercent = Math.min(100, (creditsUsed / dailyLimit) * 100);
  const displayPercent = rawPercent > 0 && rawPercent < 0.1 ? "<0.1" : rawPercent.toFixed(1);

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in">
      <div className="mb-8">
        <p className="label-title mb-1.5 flex items-center gap-2">
          Account
        </p>
        <h1 className="page-title flex items-center gap-2 font-serif">
          <CreditCard className="w-6 h-6 text-primary" />
          Subscriptions & Usage
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your plan and monitor your API usage limits.
        </p>
      </div>
      
      {/* Usage Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col mb-12">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 font-serif">
          <Zap className="w-5 h-5 text-primary" /> Daily AI Usage
        </h2>
        
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{creditsUsed.toLocaleString()} / {dailyLimit.toLocaleString()} Credits</span>
            <span className="text-sm font-medium text-primary">{displayPercent}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 mb-2 overflow-hidden">
            <div className={cn("h-3 rounded-full transition-all", rawPercent > 90 ? "bg-red-500" : "bg-primary")} style={{ width: `${rawPercent}%` }}></div>
          </div>
          <p className="text-xs text-muted-foreground">Credits reset every 24 hours. Complex models cost more credits per token.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
        {TIERS.map(t => {
          const isActive = tier === t.id;
          const isPro = t.id === "Pro" && !isActive;
          const isCore = t.id === "Core" && !isActive;
          const isMaximum = t.id === "Maximum" && !isActive;

          return (
            <div 
              key={t.id} 
              className={cn(
                "rounded-xl border p-5 flex flex-col relative transition-all", 
                isActive ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm text-foreground" : 
                isPro ? "border-2 border-purple-500 bg-card dark:bg-purple-900/40 shadow-md shadow-purple-500/30 scale-[1.02] z-10 text-foreground" : 
                isCore ? "border-2 border-emerald-500 bg-card dark:bg-emerald-900/40 shadow-md shadow-emerald-500/30 scale-[1.02] z-10 text-foreground" : 
                isMaximum ? "border-2 border-yellow-500 bg-yellow-400 dark:bg-yellow-400 shadow-xl shadow-yellow-500/40 scale-[1.02] z-10 text-black" : 
                "border-border bg-card shadow-sm hover:shadow-md text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute top-0 right-0 p-3">
                  <span className="bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    Current
                  </span>
                </div>
              )}
              {isPro && (
                <div className="absolute top-0 right-0 p-3">
                  <span className="bg-purple-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    Best Value
                  </span>
                </div>
              )}
              {isCore && (
                <div className="absolute top-0 right-0 p-3">
                  <span className="bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    Saver
                  </span>
                </div>
              )}
              {isMaximum && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-yellow-500 text-yellow-950 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                    Millionaire
                  </span>
                </div>
              )}
            
            <h2 className={cn("text-base font-semibold mb-1 font-serif", isMaximum ? "text-black" : "text-foreground")}>{t.name}</h2>
            <div className="mb-4">
              <span className={cn("text-2xl font-bold", isMaximum ? "text-black" : "text-foreground")}>{t.price}</span>
            </div>
            
            <div className={cn("text-sm font-semibold mb-4 pb-4 border-b", isMaximum ? "text-black border-yellow-600/50" : "text-primary border-border")}>
              {t.credits} <span className={cn("font-normal", isMaximum ? "text-black/70" : "text-muted-foreground")}>credits/day</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {t.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", isMaximum ? "text-black" : "text-emerald-600")} />
                  <span className={cn("text-xs leading-relaxed", isMaximum ? "text-black/80 font-medium" : "text-muted-foreground")}>{f}</span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full text-xs shadow-sm" 
              variant={t.id === "Free" ? "outline" : "default"}
              disabled={tier === t.id || isLoadingTier === t.id}
              onClick={() => handleUpgrade(t.id)}
            >
              {isLoadingTier === t.id ? "Loading..." : tier === t.id ? "Active Plan" : "Upgrade"}
            </Button>
          </div>
          );
        })}
      </div>
    </div>
  );
}
