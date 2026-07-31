"use client";
import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "./button";

export function AnimatedOrb() {
  return (
    <div className="relative w-full h-[300px] sm:h-[350px] bg-slate-950 rounded-3xl overflow-hidden flex flex-col items-center justify-center border border-slate-800 shadow-2xl mb-12 isolate">
      {/* Background Animated Gradient Layer */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden mix-blend-screen opacity-80">
        {/* Core glowing orb */}
        <div className="absolute w-[200px] h-[200px] bg-blue-600/50 rounded-full blur-[80px] animate-pulse"></div>
        {/* Orbiting layers */}
        <div className="absolute w-[300px] h-[300px] bg-indigo-500/40 rounded-full blur-[100px] animate-[spin_8s_linear_infinite] origin-bottom-right"></div>
        <div className="absolute w-[250px] h-[250px] bg-purple-600/40 rounded-full blur-[90px] animate-[spin_12s_linear_infinite_reverse] origin-top-left"></div>
        <div className="absolute w-[350px] h-[150px] bg-cyan-500/30 rounded-full blur-[100px] animate-[spin_10s_linear_infinite] origin-center"></div>
      </div>

      {/* Grid overlay for texture */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Content Layer */}
      <div className="relative z-10 text-center px-4 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200 text-xs font-medium backdrop-blur-md mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" /> AI-Powered Study Engine
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-lg" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>
          Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Lock In?</span>
        </h2>
        <Link href="/assistant">
          <Button size="lg" className="h-14 px-8 rounded-full bg-white text-black hover:bg-slate-200 font-bold text-base shadow-[0_0_40px_rgba(129,140,248,0.4)] hover:shadow-[0_0_60px_rgba(129,140,248,0.6)] transition-all flex items-center gap-2 group">
            Start Learning 
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
