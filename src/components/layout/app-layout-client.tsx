"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { DeviceModal } from "@/components/device-modal";
import { PromoModal } from "@/components/promo-modal";
import { PromoBanner } from "@/components/promo-banner";
import { cn } from "@/lib/utils";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [device, setDevice] = useState<"mobile" | "desktop">("desktop");
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200 relative">
      <PromoBanner />
      
      {/* Global Ambient Background across the whole app */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      
      <DeviceModal 
        forceOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        onPreferenceSet={(d) => {
          setDevice(d);
          if (d === "mobile") setSidebarOpen(false);
          else setSidebarOpen(true);
        }} 
      />

      <PromoModal />

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
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
