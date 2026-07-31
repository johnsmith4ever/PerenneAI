"use client";
import React, { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate percentage for easier CSS background positioning
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden flex flex-col items-center justify-center isolate z-[100]">
      {/* Big PERENNE Logo at top */}
      <div className="absolute top-16 left-0 right-0 text-center z-20 animate-in fade-in slide-in-from-top-4 duration-1000">
        <h1 className="text-3xl sm:text-4xl font-black tracking-[0.4em] text-white/90 uppercase font-sans drop-shadow-md">
          Perenne
        </h1>
      </div>

      {/* Background Animated Gradient Layer */}
      <div 
        className="absolute inset-0 z-0 opacity-80 mix-blend-screen transition-all duration-75 ease-out"
        style={{
          background: `radial-gradient(circle 500px at ${mousePos.x}% ${mousePos.y}%, rgba(245,158,11,0.4), transparent),
                       radial-gradient(circle 400px at ${100 - mousePos.x}% ${100 - mousePos.y}%, rgba(234,88,12,0.3), transparent)`
        }}
      >
        {/* Orbiting layers for extra effect */}
        <div className="absolute w-[400px] h-[400px] bg-amber-500/20 rounded-full blur-[100px] animate-[spin_10s_linear_infinite] origin-bottom-right top-1/4 left-1/4 pointer-events-none"></div>
        <div className="absolute w-[350px] h-[350px] bg-orange-600/20 rounded-full blur-[90px] animate-[spin_15s_linear_infinite_reverse] origin-top-left bottom-1/4 right-1/4 pointer-events-none"></div>
      </div>

      {/* Grid overlay for texture */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Content Layer */}
      <div className="relative z-10 text-center px-4 flex flex-col items-center animate-in fade-in zoom-in duration-1000 delay-150 fill-mode-both mt-12">
        <img 
          src="/logo.svg" 
          alt="Perenne Logo" 
          className="w-24 h-24 mb-8 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:scale-105 transition-transform duration-300 invert"
        />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200 text-xs font-medium backdrop-blur-md mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI-Powered Study Engine
        </div>
        <h2 className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-lg font-serif">
          Start learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-400">smarter</span>
        </h2>
        <Link href="/dashboard">
          <Button size="lg" className="h-14 px-8 rounded-full bg-white text-black hover:bg-slate-200 font-bold text-base shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] transition-all flex items-center gap-2 group cursor-pointer">
            Go to Dashboard 
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
