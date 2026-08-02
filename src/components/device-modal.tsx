"use client";
import { useState, useEffect } from "react";
import { Monitor, Smartphone, X, Gift, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeviceModal({ onPreferenceSet, forceOpen = false, onClose }: { onPreferenceSet: (device: "mobile" | "desktop") => void; forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);
  
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<{ type: "success" | "error", msg: string } | null>(null);
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  
  const [gamificationEnabled, setGamificationEnabled] = useState(true);

  useEffect(() => {
    const pref = localStorage.getItem("perenne_device_preference");
    const skip = localStorage.getItem("perenne_skip_device_modal");
    const game = localStorage.getItem("perenne_gamification_enabled");
    
    if (game !== null) {
      setGamificationEnabled(game === "true");
    }
    
    if (pref) {
      onPreferenceSet(pref as "mobile" | "desktop");
    }
    if (!skip && !pref) {
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  const handleSelect = (device: "mobile" | "desktop") => {
    localStorage.setItem("perenne_device_preference", device);
    if (dontAsk) {
      localStorage.setItem("perenne_skip_device_modal", "true");
    }
    onPreferenceSet(device);
    // Don't close immediately if they might be tweaking gamification or referrals
    // handleClose(); 
  };

  const handleGamificationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setGamificationEnabled(val);
    localStorage.setItem("perenne_gamification_enabled", val ? "true" : "false");
    // Dispatch custom event to notify other components instantly
    window.dispatchEvent(new CustomEvent("perenne_gamification_changed", { detail: val }));
  };

  const handleReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim()) return;
    
    setIsSubmittingReferral(true);
    setReferralStatus(null);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralCode }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setReferralStatus({ type: "success", msg: data.message });
        setReferralCode("");
      } else {
        setReferralStatus({ type: "error", msg: data.message });
      }
    } catch (err: any) {
      setReferralStatus({ type: "error", msg: "An unexpected error occurred." });
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-serif font-bold text-white mb-6">Settings</h2>
        
        <div className="space-y-8">
          {/* Device Layout Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Layout Preference
            </h3>
            <p className="text-xs text-slate-400 mb-4">How are you primarily viewing Perenne right now?</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Button variant="outline" onClick={() => handleSelect("mobile")} className="h-24 flex flex-col items-center justify-center gap-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-amber-500/50">
                <Smartphone className="w-6 h-6 text-amber-500" />
                <span className="font-bold text-white text-xs">Mobile</span>
              </Button>
              <Button variant="outline" onClick={() => handleSelect("desktop")} className="h-24 flex flex-col items-center justify-center gap-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/50">
                <Monitor className="w-6 h-6 text-blue-500" />
                <span className="font-bold text-white text-xs">Desktop</span>
              </Button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0" />
              <span className="text-xs text-slate-400 font-medium">Don't ask me again</span>
            </label>
          </div>

          <div className="h-px bg-white/10 w-full" />

          {/* Referral Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Gift className="w-4 h-4" /> Referrals
            </h3>
            <p className="text-xs text-slate-400 mb-4">Enter a referral code to instantly upgrade your account.</p>
            
            <form onSubmit={handleReferral} className="space-y-3">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Enter code (e.g. EARLYBIRD)" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 uppercase placeholder:normal-case"
                />
                <Button type="submit" disabled={isSubmittingReferral || !referralCode.trim()} className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                  {isSubmittingReferral ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              
              {referralStatus && (
                <p className={`text-xs font-medium px-2 py-1.5 rounded-lg border ${referralStatus.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  {referralStatus.msg}
                </p>
              )}
            </form>
          </div>
          
          <div className="h-px bg-white/10 w-full" />

          {/* Gamification Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Experimental Features
            </h3>
            <p className="text-xs text-slate-400 mb-4">Toggle community leaderboards and study heatmaps. Turn this off if you prefer a cleaner, distraction-free environment.</p>
            
            <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <span className="text-sm text-white font-medium">Enable Gamification</span>
              <div className="relative">
                <input type="checkbox" checked={gamificationEnabled} onChange={handleGamificationToggle} className="sr-only" />
                <div className={cn("block w-10 h-6 rounded-full transition-colors", gamificationEnabled ? "bg-amber-500" : "bg-white/10")} />
                <div className={cn("absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", gamificationEnabled ? "translate-x-4" : "")} />
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
