"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckSquare, Square, BrainCircuit, GraduationCap, MessagesSquare, CheckCircle2, Calendar, LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import { MouseTrackingBackground } from "@/components/ui/mouse-tracking-bg";

export default function GetStartedPage() {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-amber-500/20 overflow-hidden relative isolate">
      
      {/* Background Ambient Lighting */}
      <MouseTrackingBackground active={true} />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Navbar */}
      <nav className="w-full max-w-4xl mx-auto px-6 py-8 flex items-center justify-between relative z-10">
        <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1">
          <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
        </Link>
        <Link href="/" className="flex items-center gap-3 group mx-auto absolute left-1/2 -translate-x-1/2">
          <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-7 h-7 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] invert group-hover:scale-110 transition-transform" />
          <span className="font-serif font-black text-xl tracking-widest text-white uppercase group-hover:text-amber-500 transition-colors">Perenne</span>
        </Link>
        <Link href="/sign-in" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
          Have an account? Sign In
        </Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 flex flex-col items-center justify-center space-y-12 relative z-10 py-12">
        
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-4xl md:text-5xl font-serif font-black text-white tracking-tight">Before we begin...</h1>
          <p className="text-lg text-slate-400">
            You are about to unlock a suite of elite AI tools designed strictly for academic dominance. 
            No fluff. No generic answers. Just raw, curriculum-aligned power.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="w-full grid sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150 fill-mode-both">
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="bg-amber-500/20 p-2 rounded-lg"><BrainCircuit className="w-5 h-5 text-amber-500" /></div>
            <div>
              <h4 className="font-bold text-white">Instant Flashcards</h4>
              <p className="text-xs text-slate-400">From any notes or topic</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="bg-orange-500/20 p-2 rounded-lg"><GraduationCap className="w-5 h-5 text-orange-500" /></div>
            <div>
              <h4 className="font-bold text-white">Essay Grader</h4>
              <p className="text-xs text-slate-400">Real marks, real rewrites</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="bg-red-500/20 p-2 rounded-lg"><MessagesSquare className="w-5 h-5 text-red-500" /></div>
            <div>
              <h4 className="font-bold text-white">Curriculum Chat</h4>
              <p className="text-xs text-slate-400">Your personal tutor</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="bg-amber-500/20 p-2 rounded-lg"><CheckCircle2 className="w-5 h-5 text-amber-500" /></div>
            <div>
              <h4 className="font-bold text-white">Adaptive Quizzes</h4>
              <p className="text-xs text-slate-400">Find your weak spots</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="bg-blue-500/20 p-2 rounded-lg"><Calendar className="w-5 h-5 text-blue-500" /></div>
            <div>
              <h4 className="font-bold text-white">Schedule Maker</h4>
              <p className="text-xs text-slate-400">Optimize your revision</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="bg-purple-500/20 p-2 rounded-lg"><LayoutTemplate className="w-5 h-5 text-purple-500" /></div>
            <div>
              <h4 className="font-bold text-white">Note Summarizer</h4>
              <p className="text-xs text-slate-400">Chaos to structure</p>
            </div>
          </div>
        </div>

        {/* Agreement Box */}
        <div className="w-full max-w-xl bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-1000 delay-300 fill-mode-both">
          <div className="w-full flex items-center gap-4 text-left">
            <button 
              onClick={() => setAgreed(!agreed)}
              className="shrink-0 transition-colors group p-1 -m-1 focus:outline-none"
            >
              {agreed ? (
                <CheckSquare className="w-6 h-6 text-amber-500" />
              ) : (
                <Square className="w-6 h-6 text-slate-500 group-hover:text-slate-300" />
              )}
            </button>
            <div className="text-sm text-slate-300">
              By stepping into Perenne, I acknowledge that I will use these tools to learn and understand, not just to cheat on my homework. I accept the <Link href="/terms" className="text-amber-500 hover:text-amber-400 underline decoration-amber-500/30 underline-offset-2 transition-colors">Terms & Conditions</Link>.
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="pt-4 pb-12 animate-in fade-in duration-1000 delay-500 fill-mode-both">
          <Button 
            disabled={!agreed}
            onClick={() => router.push("/sign-up")}
            size="lg" 
            className={`h-14 rounded-full px-12 text-base font-bold transition-all duration-500 flex items-center gap-2 group border-0 ${
              agreed 
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] hover:scale-105 cursor-pointer" 
                : "bg-white/10 text-slate-500 cursor-not-allowed"
            }`}
          >
            Create Account
            <ArrowRight className={`w-5 h-5 transition-transform ${agreed ? "group-hover:translate-x-1" : ""}`} />
          </Button>
        </div>

      </main>
    </div>
  );
}
