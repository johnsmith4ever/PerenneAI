"use client";

import { useState } from "react";

import { Sidebar } from "./sidebar";
import { DeviceModal } from "@/components/device-modal";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { usePathname } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [device, setDevice] = useState<"mobile" | "desktop">("desktop");
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const { creditsUsed, dailyLimit, isLoaded } = useSubscription();
  const pathname = usePathname();

  const isLimitReached = isLoaded && creditsUsed >= dailyLimit && dailyLimit > 0;
  const isSubscriptionsPage = pathname === "/subscriptions";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground relative">
      {/* Global Ambient Background across the whole app */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      
      <DeviceModal 
        forceOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        onPreferenceSet={(d) => {
          setDevice(d);
          if (d === "mobile") setSidebarOpen(false);
          else setSidebarOpen(true);
        }} 
      />

      <div className="relative z-10 flex h-full w-full">
        {device === "mobile" && sidebarOpen && (
          <div 
            className="absolute inset-0 bg-black/50 z-30 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          onOpen={() => setSidebarOpen(true)}
          isMobile={device === "mobile"} 
          onOpenSettings={() => setShowDeviceModal(true)}
        />
        <div className={cn("flex-1 min-w-0 overflow-y-auto relative flex flex-col break-words", device === "mobile" && "ml-[80px]")}>
          <div className="flex-1 max-w-4xl w-full mx-auto px-8 py-8 relative">
            {isLimitReached && !isSubscriptionsPage ? (
              <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-md rounded-3xl mt-8">
                <div className="sticky top-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                  <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 shadow-inner border border-red-500/20">
                    <Lock className="w-10 h-10 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                  </div>
                  <h2 className="text-3xl font-black font-serif text-foreground tracking-tight mb-3">
                    Daily Limit Reached
                  </h2>
                  <p className="text-muted-foreground text-center max-w-md mb-8">
                    You have used all {dailyLimit.toLocaleString()} of your daily AI credits. Your limit will reset at midnight, or you can upgrade to unlock more capacity immediately.
                  </p>
                  <Link href="/subscriptions" className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-primary px-8 font-medium text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95">
                    <span className="absolute -inset-full top-0 block h-full w-1/2 z-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></span>
                    <span className="relative flex items-center gap-2 z-10"><Sparkles className="w-4 h-4" /> Upgrade Plan</span>
                  </Link>
                </div>
              </div>
            ) : null}
            
            <div className={cn(isLimitReached && !isSubscriptionsPage && "pointer-events-none opacity-30 select-none blur-sm transition-all duration-500")}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
