"use client";
import { Gift, ChevronRight } from "lucide-react";
import { useSubscription, TIER_RANK } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";

export function PromoBanner() {
  const { tier, isLoaded } = useSubscription();

  if (!isLoaded || TIER_RANK[tier] > TIER_RANK.Free) return null;

  const handleClaim = () => {
    window.dispatchEvent(new CustomEvent("perenne_open_promo", { detail: { code: "PERENNE2026" } }));
  };

  return (
    <div 
      onClick={handleClaim}
      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 flex items-center justify-center gap-2 cursor-pointer hover:from-amber-600 hover:to-orange-700 transition-colors z-50 text-sm font-medium shadow-md group shrink-0"
    >
      <Gift className="w-4 h-4 animate-pulse" />
      <span>Limited time: Use code <strong className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-xs">PERENNE2026</strong> to unlock the Core plan for free!</span>
      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </div>
  );
}
