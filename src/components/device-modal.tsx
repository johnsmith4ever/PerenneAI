"use client";
import { useState, useEffect } from "react";
import { Monitor, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeviceModal({ onPreferenceSet, forceOpen = false, onClose }: { onPreferenceSet: (device: "mobile" | "desktop") => void; forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);

  useEffect(() => {
    const pref = localStorage.getItem("perenne_device_preference");
    const skip = localStorage.getItem("perenne_skip_device_modal");

    if (pref) {
      onPreferenceSet(pref as "mobile" | "desktop");
    }
    // Only auto-open on very first visit (no pref saved and not dismissed)
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
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl relative animate-in zoom-in-95">
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
        </div>
      </div>
    </div>
  );
}
