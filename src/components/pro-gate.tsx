"use client";

import { useSubscription, TIER_RANK, Tier } from "@/hooks/use-subscription";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProGateProps {
  children: React.ReactNode;
  requiredTier?: Tier;
  featureName: string;
}

export function ProGate({ children, requiredTier = "Core", featureName }: ProGateProps) {
  const { tierRank, isLoaded } = useSubscription();

  if (!isLoaded) {
    return <div className="animate-pulse bg-muted rounded-3xl h-[60vh] w-full" />;
  }

  const requiredRank = TIER_RANK[requiredTier];
  const hasAccess = tierRank >= requiredRank;

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-[60vh] min-h-[400px] rounded-3xl overflow-hidden border border-purple-500/30 bg-purple-950/20 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center shadow-[0_0_50px_rgba(168,85,247,0.1)]">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />
      
      <div className="relative z-10 w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 shadow-inner border border-purple-500/30">
        <Lock className="w-12 h-12 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" />
      </div>
      
      <h2 className="relative z-10 text-3xl font-black font-serif text-white tracking-tight mb-3">
        Unlock {featureName}
      </h2>
      
      <p className="relative z-10 text-purple-200/70 max-w-md mb-8 text-lg">
        {featureName} is an advanced AI feature requiring a tremendous amount of compute power. Upgrade to the <span className="font-bold text-purple-300">{requiredTier}</span> tier or higher to access it.
      </p>
      
      <Link href="/subscriptions" className="relative z-10 group inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-purple-600 px-8 font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95 hover:bg-purple-500">
        <span className="absolute -inset-full top-0 block h-full w-1/2 z-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></span>
        <span className="relative flex items-center gap-2 z-10"><Sparkles className="w-5 h-5" /> Upgrade Plan</span>
      </Link>
    </div>
  );
}
