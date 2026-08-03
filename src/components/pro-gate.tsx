"use client";

import { useSubscription } from "@/hooks/use-subscription";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ProGate({ children, featureName }: { children: React.ReactNode, featureName: string }) {
  const { tier, isLoaded } = useSubscription();

  if (!isLoaded) {
    return <div className="h-[50vh] flex items-center justify-center animate-pulse text-muted-foreground">Loading...</div>;
  }

  const isProOrHigher = !["Free", "Core"].includes(tier);

  if (isProOrHigher) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-3xl mx-auto mt-12 mb-20 animate-in fade-in zoom-in duration-500">
      <div className="p-1 rounded-3xl bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-rose-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="bg-[#0a0a0a]/90 backdrop-blur-3xl rounded-[22px] p-10 md:p-14 text-center border border-white/5 relative z-10 flex flex-col items-center">
          
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mb-6 shadow-inner border border-amber-500/20">
            <Lock className="w-10 h-10 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
          </div>

          <h2 className="text-3xl md:text-4xl font-black font-serif text-white tracking-tight mb-4" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
            Unlock <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">{featureName}</span>
          </h2>
          
          <p className="text-lg text-slate-300 max-w-lg mb-10 leading-relaxed font-sans">
            This is a premium feature. Upgrade to the Pro tier to gain full access to advanced AI models, deep web research, and rigorous logic engines.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 w-full max-w-md mb-10 text-left">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-sm font-semibold text-white">Elite AI Models</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-sm font-semibold text-white">Uncapped Potential</span>
            </div>
          </div>

          <Link href="/subscriptions" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-14 px-10 text-lg font-bold rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-0 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all group">
              Upgrade to Pro
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
        </div>
      </div>
    </div>
  );
}
