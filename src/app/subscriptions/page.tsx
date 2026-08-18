"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSubscription, Tier } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Check, ArrowLeft, Zap, Sparkles, X, AlertCircle, Lock, Crown } from "lucide-react";
import { useUser } from "@clerk/nextjs";

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

const TIER_STYLES: Record<string, { badge?: string; badgeColor?: string; glowColor: string; buttonClass: string; borderHover: string; borderActive: string; accentColor: string }> = {
  Free:    { glowColor: "rgba(251,191,36,0.15)",  buttonClass: "bg-white text-black hover:bg-neutral-200", borderHover: "hover:border-amber-500/50",  borderActive: "border-amber-500", accentColor: "text-amber-500" },
  Core:    { badge: "Saver",       badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", glowColor: "rgba(16,185,129,0.15)", buttonClass: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]",  borderHover: "hover:border-emerald-500/50", borderActive: "border-emerald-500", accentColor: "text-emerald-500" },
  Pro:     { badge: "Best Value",  badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",  glowColor: "rgba(168,85,247,0.15)", buttonClass: "bg-purple-500 text-white hover:bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.3)]",  borderHover: "hover:border-purple-500/50",  borderActive: "border-purple-500", accentColor: "text-purple-500" },
  Premium: { glowColor: "rgba(59,130,246,0.15)",  buttonClass: "bg-blue-500 text-white hover:bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)]", borderHover: "hover:border-blue-500/50",   borderActive: "border-blue-500", accentColor: "text-blue-500" },
  Maximum: { badge: "No Limits",   badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",           glowColor: "rgba(239,68,68,0.15)",  buttonClass: "bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)]", borderHover: "hover:border-red-500/50",    borderActive: "border-red-500", accentColor: "text-red-500" },
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
  const { user, isLoaded: userLoaded } = useUser();
  const { tier, creditsUsed, dailyLimit, isLoaded } = useSubscription();
  const [showDevModal, setShowDevModal] = useState<Tier | null>(null);

  if (!isLoaded || !userLoaded) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <header className="border-b p-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 hover:bg-muted p-2 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">Back</span>
          </Link>
          <span className="font-serif font-black text-xl tracking-widest text-primary uppercase">Perenne</span>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center p-6 space-y-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive/20 mb-2">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-black">Sign in required</h2>
          <p className="text-muted-foreground">You cannot view or manage subscriptions while using Perenne in Guest mode.</p>
          <Link href="/sign-in">
            <Button className="w-full font-bold">Sign In to Continue</Button>
          </Link>
        </div>
      </div>
    );
  }

  const rawPercent = Math.min(100, (creditsUsed / dailyLimit) * 100);
  const displayPercent = rawPercent > 0 && rawPercent < 0.1 ? "<0.1" : rawPercent.toFixed(1);

  return (
    <div className="min-h-screen bg-[#050505] pt-12 pb-24 relative overflow-hidden font-sans">
      {/* Immersive Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/5 rounded-[100%] blur-[120px] pointer-events-none"></div>

      {/* Back Button */}
      <Link href="/dashboard" className="absolute top-8 left-8 text-neutral-400 hover:text-white transition-colors flex items-center gap-2 font-medium z-50 bg-[#0a0a0a]/50 p-2 pr-4 rounded-full backdrop-blur-md border border-white/5 shadow-lg hover:bg-white/10">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold tracking-wide">Dashboard</span>
      </Link>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header */}
        <div className="mb-14 relative flex flex-col items-center text-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold uppercase tracking-widest text-[10px] mb-6 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <Crown className="w-3 h-3" /> Account Status
            </div>
            <h1 className="text-5xl md:text-6xl font-serif font-black text-white tracking-tight mb-4 drop-shadow-sm">
              Your Subscriptions
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
              Unlock the full power of Perenne AI. Monitor your daily usage, explore advanced reasoning models, and scale your study tools exactly as you need them.
            </p>
          </div>
        </div>
      
        {/* Cinematic Usage Card */}
        <div className="max-w-4xl mx-auto rounded-[2rem] border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-2xl p-8 md:p-10 shadow-2xl flex flex-col mb-16 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none z-0"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-serif font-bold text-white mb-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                Daily Compute Usage
              </h2>
              <p className="text-sm text-slate-400 font-medium mb-6">Credits reset every 24 hours. Complex models (like Deepseek V4 Pro) consume credits faster per query.</p>
              
              <div className="w-full bg-[#171717] rounded-full h-5 border border-white/5 overflow-hidden shadow-inner relative">
                <div 
                  className={cn("h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden", rawPercent > 90 ? "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)]" : "bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.8)]")} 
                  style={{ width: `${rawPercent}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] -translate-x-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-start md:items-end md:pl-8 md:border-l border-white/10">
              <span className="text-sm font-bold text-slate-400 tracking-wider uppercase mb-1">Consumption</span>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-5xl font-black tracking-tighter drop-shadow-md", rawPercent > 90 ? "text-red-400" : "text-amber-400")}>
                  {displayPercent}%
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 mt-2 bg-white/5 px-2 py-1 rounded-md">
                {creditsUsed.toLocaleString()} / {dailyLimit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-[1400px] mx-auto">
          {TIERS.map((t) => {
            const isCurrent = t.id === tier;
            const style = TIER_STYLES[t.id] ?? TIER_STYLES.Free;
            
            return (
              <div key={t.id} className={cn(
                "rounded-[28px] flex flex-col transition-all duration-500 relative overflow-hidden group hover:-translate-y-2 hover:shadow-2xl",
                isCurrent ? `bg-[#121212] border-2 ${style.borderActive} z-10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] scale-[1.02]` : `bg-[#0c0c0c] border border-white/10 ${style.borderHover} opacity-90 hover:opacity-100`
              )}>
                {/* Immersive glow */}
                <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: `radial-gradient(circle at top, ${style.glowColor} 0%, transparent 70%)` }} />
                
                {/* Active Indicator */}
                {isCurrent && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-50" style={{ color: style.accentColor }} />
                )}

                <div className="p-8 pb-8 flex flex-col flex-1 relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className={cn("p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md", style.accentColor)}>
                      <GrowingBranchIcon level={t.iconLevel} className="w-7 h-7 font-light" />
                    </div>
                    {style.badge && (
                      <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-md", style.badgeColor)}>
                        {style.badge}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-sm">{t.name}</h3>
                  <p className="text-sm text-neutral-400 mb-8 font-medium h-[40px] leading-relaxed">{t.tagline}</p>
                  
                  <div className="flex flex-col items-start gap-1.5 mb-10 h-[64px]">
                    <span className="text-[2.75rem] font-black tracking-tighter text-white leading-none drop-shadow-sm">{t.priceText}</span>
                    {t.priceDetail ? (
                      <span className="text-xs text-neutral-500 font-medium leading-snug whitespace-pre-wrap">{t.priceDetail}</span>
                    ) : (
                      <span className="text-xs text-transparent leading-snug whitespace-pre-wrap">No cost</span>
                    )}
                  </div>

                  <Button 
                    onClick={() => !isCurrent && setShowDevModal(t.id)}
                    disabled={isCurrent && t.id === "Free"}
                    className={cn(
                      "w-full rounded-2xl py-6 font-bold text-sm transition-all duration-300 relative overflow-hidden", 
                      isCurrent 
                        ? "bg-white/5 border border-white/10 text-white cursor-default" 
                        : style.buttonClass
                    )}
                  >
                    <span className="relative z-10">{isCurrent ? `Current Plan` : `Upgrade to ${t.name}`}</span>
                  </Button>
                </div>

                <div className="border-t border-white/5 p-8 flex-1 bg-[#050505]/50 backdrop-blur-xl relative z-10">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-neutral-500 mb-5">{t.featureHeader}</p>
                  <ul className="space-y-4">
                    {t.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-neutral-300 leading-tight font-medium">
                        <div className={cn("mt-0.5 rounded-full p-0.5 bg-white/5 border border-white/10", style.accentColor)}>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                        <span className="drop-shadow-sm">{feature}</span>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-10 max-w-md w-full relative shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              
              <button onClick={() => setShowDevModal(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10 z-10">
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-8 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)] relative z-10">
                <AlertCircle className="w-10 h-10 text-blue-400" />
              </div>
              
              <div className="relative z-10">
                <h3 className="text-3xl font-serif font-black text-white tracking-tight mb-4">Development Phase</h3>
                <p className="text-slate-400 leading-relaxed mb-10 font-medium">
                  Stripe checkout is currently in development mode. No real money or payment methods are required at this time. To upgrade to the <strong className="text-white px-2 py-0.5 bg-white/10 rounded-md mx-1">{showDevModal}</strong> plan, please use the admin dashboard or wait for the full release.
                </p>
                <Button onClick={() => setShowDevModal(null)} className="w-full bg-white text-black hover:bg-neutral-200 py-7 text-base font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-transform">
                  Got it, thanks!
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
