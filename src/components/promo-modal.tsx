"use client";
import { useState, useEffect } from "react";
import { X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, TIER_RANK } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";

export function PromoModal() {
  const [open, setOpen] = useState(false);
  const { tier, isLoaded } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && TIER_RANK[tier] === TIER_RANK.Free) {
      // pop up after initial render
      const t = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(t);
    }
  }, [isLoaded, tier]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleClaim = () => {
    handleClose();
    window.dispatchEvent(new CustomEvent("perenne_open_promo", { detail: { code: "PERENNE2026" } }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>
        
        <button onClick={handleClose} className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] mb-6 transform rotate-12">
            <Gift className="w-8 h-8 text-white -rotate-12" />
          </div>
          
          <h2 className="text-2xl font-serif font-black text-white mb-2">Exclusive Promotion!</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            You're currently experiencing life in the Free tier... 
            <br/><br/>
            Want a taste of the good life? Use code <span className="text-amber-400 font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded">PERENNE2026</span> to unlock the Core plan and supercharge your study sessions!
          </p>
          
          <Button 
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg"
            onClick={handleClaim}
          >
            Claim Promo Code
          </Button>
          <button onClick={handleClose} className="mt-4 text-xs text-slate-500 hover:text-slate-400 font-medium">
            No thanks, I prefer the slums
          </button>
        </div>
      </div>
    </div>
  );
}
