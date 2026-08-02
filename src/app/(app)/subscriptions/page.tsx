"use client";

import { CreditCard, CheckCircle2, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, Tier } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { useState } from "react";

const TIERS: { id: Tier; name: string; price: string; credits: string; features: string[] }[] = [
  {
    id: "Free",
    name: "Free",
    price: "£0.00",
    credits: "5,000",
    features: [
      "Polaris 1 (Llama) - Basic AI",
      "Strict Daily Limits",
      "History & Tracking Locked",
      "Basic Essay Grading (1 Paragraph)"
    ]
  },
  {
    id: "Core",
    name: "Core",
    price: "£1.99/mo",
    credits: "24,000",
    features: [
      "Unlocks Full Study History & Tracker",
      "Bastion 3.5 Pro (Gemini)",
      "Essay Grader (up to 3 Paragraphs)",
      "Presentation Builder & Pro/Con Tool",
      "The perfect starter kit for staying organized"
    ]
  },
  {
    id: "Pro",
    name: "Pro",
    price: "£3.99/mo",
    credits: "60,000",
    features: [
      "Apollo V4 Pro (Deepseek) - Advanced Logic",
      "Unlocks all Essay Writing Styles",
      "Mindmap Auto-Builder (Gemini)",
      "60,000 Credits (3x the Core plan!)",
      "Our most popular choice for serious students"
    ]
  },
  {
    id: "Premium",
    name: "Premium",
    price: "£6.99/mo",
    credits: "100,000",
    features: [
      "Atlas 4.5 Flash (Claude Haiku)",
      "Full-Length Essay Evaluations (8 Paragraphs)",
      "Advanced Note Summarizer",
      "Priority Server Access (Zero wait times)",
      "The ultimate toolkit for A-Level & Uni students"
    ]
  },
  {
    id: "Maximum",
    name: "Maximum",
    price: "£10.99/mo",
    credits: "150,000",
    features: [
      "Atlas 5 Pro (Claude 3.5 Sonnet) - State of the art",
      "Unlimited Chat History Retention",
      "Strict Coach (Focus Timer Integration)",
      "Beta access to experimental tools",
      "Zero token throttling",
      "Ideal for University students & absolute power users"
    ]
  }
];

export default function SubscriptionsPage() {
  const { tier, creditsUsed, dailyLimit, isLoaded } = useSubscription();
  const [isLoadingTier, setIsLoadingTier] = useState<string | null>(null);

  const handleUpgrade = async (tierId: string) => {
    if (tierId === "Free") return;
    
    setIsLoadingTier(tierId);
    try {
      let priceId = "";
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
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in">
      
      {/* Header */}
      <div className="mb-10 relative">
        <div className="absolute w-[200px] h-[200px] bg-amber-500/10 rounded-full blur-[80px] top-0 left-0 pointer-events-none z-0"></div>
        <div className="relative z-10">
          <p className="text-amber-500 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Upgrade
          </p>
          <h1 className="text-4xl font-serif font-black text-white tracking-tight flex items-center gap-3">
            Subscriptions & Usage
          </h1>
          <p className="text-slate-400 mt-2 max-w-lg">
            Manage your study plan and monitor your AI generation limits. Upgrade to unlock powerful models and unlimited features.
          </p>
        </div>
      </div>
      
      {/* Cinematic Usage Card */}
      <div className="rounded-3xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl p-8 shadow-2xl flex flex-col mb-12 relative overflow-hidden group">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        
        <div className="relative z-10">
          <h2 className="text-xl font-serif font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            Daily AI Usage
          </h2>
          
          <div className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-300 tracking-wide">{creditsUsed.toLocaleString()} / {dailyLimit.toLocaleString()} Credits</span>
              <span className={cn("text-lg font-black", rawPercent > 90 ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]")}>
                {displayPercent}%
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-4 mb-3 border border-white/10 overflow-hidden shadow-inner">
              <div 
                className={cn("h-full rounded-full transition-all duration-500 ease-out", rawPercent > 90 ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" : "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]")} 
                style={{ width: `${rawPercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 font-medium">Credits reset every 24 hours. Advanced reasoning models cost more credits per query.</p>
          </div>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
        {TIERS.map(t => {
          const isActive = tier === t.id;
          const isPro = t.id === "Pro";
          const isPremium = t.id === "Premium";
          const isMaximum = t.id === "Maximum";
          const isFree = t.id === "Free";
          const isCore = t.id === "Core";

          const bentoClasses = cn(
            isFree ? "md:col-span-6 lg:col-span-3" : "",
            isCore ? "md:col-span-6 lg:col-span-3" : "",
            isPro ? "md:col-span-12 lg:col-span-6 lg:row-span-2 flex flex-col justify-center" : "",
            isPremium ? "md:col-span-12 lg:col-span-6" : "",
            isMaximum ? "md:col-span-12 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center" : ""
          );

          return (
            <div 
              key={t.id} 
              className={cn(
                "rounded-3xl p-6 flex flex-col relative transition-all duration-300 hover:-translate-y-1 backdrop-blur-xl group", 
                bentoClasses,
                isActive ? "border border-amber-500/50 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.15)]" : 
                isPro ? "border border-purple-500/40 bg-purple-900/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]" : 
                isPremium ? "border border-cyan-500/40 bg-cyan-900/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]" :
                isMaximum ? "border border-yellow-400 bg-gradient-to-b from-yellow-500/90 to-yellow-600/90 shadow-[0_0_40px_rgba(250,204,21,0.4)] text-yellow-950 scale-[1.02] z-10" : 
                "border border-white/10 bg-white/5 hover:bg-white/10"
              )}
            >
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-amber-500 text-amber-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    Active Plan
                  </span>
                </div>
              )}
              {isPro && !isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-purple-500/40 whitespace-nowrap">
                    Popular
                  </span>
                </div>
              )}
              {isMaximum && !isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-black text-yellow-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-yellow-500/40 whitespace-nowrap border border-yellow-400/50">
                    Limitless
                  </span>
                </div>
              )}
            
            <div className={isMaximum ? "lg:col-span-1" : ""}>
              <h2 className={cn("text-lg font-black tracking-wide mb-2 uppercase", isMaximum ? "text-yellow-950" : "text-white", isPro && "text-2xl mb-4")}>{t.name}</h2>
              <div className="mb-4 flex items-end gap-1">
                <span className={cn("text-3xl font-black tracking-tight", isMaximum ? "text-black" : "text-white", isPro && "text-5xl")}>{t.price}</span>
              </div>
              
              <div className={cn("text-xs font-bold mb-6 pb-6 border-b flex flex-col gap-1", isMaximum ? "text-yellow-900 border-yellow-900/20" : "text-slate-300 border-white/10")}>
                <span className={cn("text-lg font-black", isMaximum ? "text-black" : "text-amber-500")}>{t.credits}</span>
                <span className={cn("opacity-70", isMaximum ? "text-yellow-950" : "text-slate-400")}>credits / day</span>
              </div>
            </div>

            <div className={cn("flex flex-col h-full", isMaximum ? "lg:col-span-1 lg:mt-0 mt-4" : "")}>
              <ul className={cn("space-y-4 mb-8 flex-1", isMaximum && "lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-4 lg:space-y-0")}>
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className={cn("w-4 h-4 mt-0.5 shrink-0", isMaximum ? "text-black" : isPro ? "text-purple-400" : isPremium ? "text-cyan-400" : "text-amber-500")} />
                    <span className={cn("text-sm leading-tight font-medium", isMaximum ? "text-yellow-950" : "text-slate-300", isPro && "text-base")}>{f}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={cn("w-full text-sm font-bold shadow-lg h-12 transition-all mt-auto", 
                  isMaximum ? "bg-black text-yellow-400 hover:bg-zinc-900 hover:scale-105" : 
                  isActive ? "bg-white/10 text-white hover:bg-white/20" : 
                  "bg-white text-black hover:bg-slate-200",
                  isPro && "h-14 text-lg"
                )} 
                variant={t.id === "Free" || isActive ? "outline" : "default"}
                disabled={tier === t.id || isLoadingTier === t.id}
                onClick={() => handleUpgrade(t.id)}
              >
                {isLoadingTier === t.id ? "Loading..." : tier === t.id ? "Current Plan" : "Upgrade"}
              </Button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
