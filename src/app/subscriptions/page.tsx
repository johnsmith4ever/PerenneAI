"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSubscription, Tier } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Check, ArrowLeft, Zap, Sparkles, X, AlertCircle } from "lucide-react";

const GrowingBranchIcon = ({ level, className }: { level: number, className?: string }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Central Stem */}
      <path d="M12 22V5" />
      <circle cx="12" cy="5" r="2" />
      
      {/* Level 1: Free (1 pair of branches) */}
      {level >= 1 && (
        <>
          <path d="M12 15 C 7 15 7 10 7 10" />
          <circle cx="7" cy="10" r="1.2" />
          <path d="M12 15 C 17 15 17 10 17 10" />
          <circle cx="17" cy="10" r="1.2" />
        </>
      )}

      {/* Level 2: Core (2 pairs) */}
      {level >= 2 && (
        <>
          <path d="M12 18 C 3 18 3 12 3 12" />
          <circle cx="3" cy="12" r="1.2" />
          <path d="M12 18 C 21 18 21 12 21 12" />
          <circle cx="21" cy="12" r="1.2" />
        </>
      )}

      {/* Level 3: Pro (3 pairs) */}
      {level >= 3 && (
        <>
          <path d="M12 11 C 8.5 11 8.5 6.5 8.5 6.5" />
          <circle cx="8.5" cy="6.5" r="1" />
          <path d="M12 11 C 15.5 11 15.5 6.5 15.5 6.5" />
          <circle cx="15.5" cy="6.5" r="1" />
        </>
      )}

      {/* Level 4: Premium (4 pairs) */}
      {level >= 4 && (
        <>
          <path d="M12 19 C 1 19 1 9 1 9" />
          <circle cx="1" cy="9" r="1" />
          <path d="M12 19 C 23 19 23 9 23 9" />
          <circle cx="23" cy="9" r="1" />
        </>
      )}

      {/* Level 5: Maximum (5 pairs) */}
      {level >= 5 && (
        <>
          <path d="M12 9 C 10 9 10 4 10 4" />
          <circle cx="10" cy="4" r="0.8" />
          <path d="M12 9 C 14 9 14 4 14 4" />
          <circle cx="14" cy="4" r="0.8" />
        </>
      )}
    </svg>
  );
};

const TIER_STYLES: Record<string, { badge?: string; badgeColor?: string; glowColor: string; glowColor2: string; borderHover: string; borderActive: string }> = {
  Free:    { glowColor: "rgba(251,191,36,0.12)",  glowColor2: "rgba(251,191,36,0.06)",  borderHover: "hover:border-amber-500/40",  borderActive: "border-amber-600/50" },
  Core:    { badge: "Saver",       badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", glowColor: "rgba(16,185,129,0.10)",  glowColor2: "rgba(16,185,129,0.05)",  borderHover: "hover:border-emerald-500/40", borderActive: "border-emerald-600/50" },
  Pro:     { badge: "Best Value",  badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",  glowColor: "rgba(168,85,247,0.10)",  glowColor2: "rgba(168,85,247,0.05)",  borderHover: "hover:border-purple-500/40",  borderActive: "border-purple-600/50" },
  Premium: { glowColor: "rgba(59,130,246,0.10)",  glowColor2: "rgba(59,130,246,0.05)",  borderHover: "hover:border-blue-500/40",   borderActive: "border-blue-600/50" },
  Maximum: { badge: "No Limits",   badgeColor: "bg-red-500/15 text-red-400 border-red-500/30",           glowColor: "rgba(239,68,68,0.10)",   glowColor2: "rgba(239,68,68,0.05)",   borderHover: "hover:border-red-500/40",    borderActive: "border-red-600/50" },
};

const TIERS: { id: Tier; name: string; tagline: string; priceText: string; priceDetail: string; credits: string; featureHeader: string; features: string[]; iconLevel: number }[] = [
  {
    id: "Free",
    name: "Free",
    tagline: "Meet PerenneAI",
    priceText: "£0",
    priceDetail: "",
    credits: "40,000",
    featureHeader: "Includes:",
    features: ["Gemini 3.6 Flash engine", "Claude 4.5 Haiku for math grading", "Basic study tools"],
    iconLevel: 1
  },
  {
    id: "Core",
    name: "Core",
    tagline: "Standard study access",
    priceText: "£1.99",
    priceDetail: "GBP / month\nbilled monthly (includes VAT)",
    credits: "70,000",
    featureHeader: "Everything in Free and:",
    features: ["Deepseek V4 Flash engine", "Advanced study tools", "70,000 daily credits"],
    iconLevel: 2
  },
  {
    id: "Pro",
    name: "Pro",
    tagline: "Research, code, and organize",
    priceText: "£3.99",
    priceDetail: "GBP / month\nbilled monthly (includes VAT)",
    credits: "150,000",
    featureHeader: "Everything in Core and:",
    features: ["Deepseek V4 Pro engine", "Priority generation speed", "150,000 daily credits"],
    iconLevel: 3
  },
  {
    id: "Premium",
    name: "Premium",
    tagline: "For heavy daily usage",
    priceText: "£5.99",
    priceDetail: "GBP / month\nbilled monthly (includes VAT)",
    credits: "300,000",
    featureHeader: "Everything in Pro and:",
    features: ["Claude 4.5 Haiku engine", "Massive daily bandwidth", "300,000 daily credits"],
    iconLevel: 4
  },
  {
    id: "Maximum",
    name: "Maximum",
    tagline: "Higher limits, priority access",
    priceText: "From £10.99",
    priceDetail: "GBP / month\nbilled monthly (includes VAT)",
    credits: "450,000",
    featureHeader: "Everything in Premium, plus:",
    features: ["Claude 3.5 Sonnet engine", "Ultimate power user tier", "Early access to features", "450,000 daily credits"],
    iconLevel: 5
  }
];

export default function SubscriptionsPage() {
  const { tier, creditsUsed, dailyLimit, isLoaded } = useSubscription();
  const [showDevModal, setShowDevModal] = useState<Tier | null>(null);

  if (!isLoaded) return null;

  const rawPercent = Math.min(100, (creditsUsed / dailyLimit) * 100);
  const displayPercent = rawPercent > 0 && rawPercent < 0.1 ? "<0.1" : rawPercent.toFixed(1);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-12 pb-24 relative overflow-x-hidden">
      {/* Back Button */}
      <Link href="/dashboard" className="absolute top-8 left-8 text-neutral-400 hover:text-white transition-colors flex items-center gap-2 font-medium">
        <ArrowLeft className="w-5 h-5" />
        <span>Back to App</span>
      </Link>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 animate-in fade-in">
        
        {/* Header */}
        <div className="mb-10 relative flex flex-col items-center text-center">
          <div className="absolute w-[200px] h-[200px] bg-amber-500/10 rounded-full blur-[80px] top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0"></div>
          <div className="relative z-10">
            <p className="text-amber-500 font-bold uppercase tracking-widest text-xs mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" /> Subscriptions Locked
            </p>
            <h1 className="text-4xl font-serif font-black text-white tracking-tight flex items-center gap-3">
              Subscriptions & Usage
            </h1>
            <p className="text-slate-400 mt-2 max-w-xl mx-auto">
              Monitor your AI generation limits below. Note: Upgrades and downgrades are temporarily disabled while we test our systems.
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

      <div className="mb-12 text-center">
        <h2 className="text-4xl font-serif text-white mb-2 tracking-tight">Plans that grow with you</h2>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {TIERS.map((t) => {
          const isCurrent = t.id === tier;
          const style = TIER_STYLES[t.id] ?? TIER_STYLES.Free;
          return (
            <div key={t.id} className={cn(
              "rounded-[24px] border flex flex-col transition-all duration-300 relative overflow-hidden group",
              isCurrent ? `bg-[#1c1c1c] ${style.borderActive} shadow-xl` : `bg-[#171717] border-neutral-800 ${style.borderHover}`
            )}>
              {/* Per-plan ambient glow */}
              <div className="absolute inset-0 pointer-events-none mix-blend-screen" style={{ background: `radial-gradient(circle at top left, ${style.glowColor} 0%, transparent 60%)` }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at top left, ${style.glowColor} 0%, transparent 100%)` }} />

              <div className="p-8 pb-6 flex flex-col flex-1 relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <GrowingBranchIcon level={t.iconLevel} className="w-8 h-8 text-neutral-400 font-light" />
                  {style.badge && (
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border", style.badgeColor)}>
                      {style.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-3xl font-semibold text-white mb-1 tracking-tight">{t.name}</h3>
                <p className="text-sm text-neutral-400 mb-8 font-medium h-[40px]">{t.tagline}</p>
                
                <div className="flex flex-col items-start gap-1 mb-8 h-[64px]">
                  <span className="text-4xl font-bold tracking-tight text-white leading-none">{t.priceText}</span>
                  {t.priceDetail ? (
                    <span className="text-[11px] text-neutral-500 leading-tight whitespace-pre-wrap">{t.priceDetail}</span>
                  ) : (
                    <span className="text-[11px] text-transparent leading-tight whitespace-pre-wrap">No cost</span>
                  )}
                </div>

                <Button 
                  onClick={() => !isCurrent && setShowDevModal(t.id)}
                  disabled={isCurrent && t.id === "Free"}
                  className={cn(
                    "w-full rounded-xl py-6 font-medium text-sm transition-all", 
                    isCurrent 
                      ? "bg-transparent border border-neutral-700 text-white hover:bg-neutral-800 hover:text-white" 
                      : "bg-white text-black hover:bg-neutral-200"
                  )}
                >
                  {isCurrent ? `Use ${t.name} plan` : `Get ${t.name} plan`}
                </Button>
              </div>

              <div className="border-t border-neutral-800 p-8 pt-6 flex-1 bg-[#171717] rounded-b-[24px]">
                <p className="text-sm text-neutral-300 mb-4 font-medium">{t.featureHeader}</p>
                <ul className="space-y-3.5">
                  {t.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-[13px] text-neutral-400 leading-tight">
                      <Check className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" strokeWidth={2} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dev Modal */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 max-w-md w-full relative shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setShowDevModal(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-2xl font-serif font-black text-white tracking-tight mb-3">Development Phase</h3>
            <p className="text-slate-400 leading-relaxed mb-8">
              Stripe checkout is currently in development mode. No real money or payment methods are required at this time. To upgrade to the <strong className="text-white">{showDevModal}</strong> plan, please use the admin dashboard or wait for the full release.
            </p>
            <Button onClick={() => setShowDevModal(null)} className="w-full bg-white text-black hover:bg-slate-200 py-6 font-bold rounded-xl">
              Got it, thanks!
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
