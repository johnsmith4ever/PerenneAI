import Link from "next/link";
import { ArrowRight, UserCircle, UserPlus, Sparkles } from "lucide-react";
import { MouseTrackingBackground } from "@/components/ui/mouse-tracking-bg";

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans overflow-hidden relative selection:bg-purple-500/30">
      
      {/* Glowy Ambient Background */}
      <MouseTrackingBackground active={true} />
      
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen opacity-50 animate-pulse duration-3000"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[80px] pointer-events-none z-0 mix-blend-screen opacity-70"></div>

      <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center">
        
        {/* Glowy Logo */}
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150 animate-pulse"></div>
            <img src="/logo.svg" alt="Perenne" className="w-20 h-20 invert relative z-10 drop-shadow-[0_0_25px_rgba(255,255,255,0.8)]" />
          </div>
          <h1 className="text-4xl font-serif font-black tracking-widest text-white uppercase text-center drop-shadow-lg">
            Perenne
          </h1>
          <p className="text-slate-400 mt-3 text-center text-lg">Choose how you want to start.</p>
        </div>

        {/* Options */}
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          
          <Link href="/sign-in" className="group block w-full relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative flex items-center justify-between p-6 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-slate-800/80 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                  <UserPlus className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white mb-0.5">Sign In / Register</h3>
                  <p className="text-sm text-slate-400">Save your progress and access history.</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          <Link href="/dashboard" className="group block w-full relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-600 to-slate-500 rounded-2xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative flex items-center justify-between p-6 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-slate-800/80 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-500/20 flex items-center justify-center border border-slate-500/30 group-hover:scale-110 transition-transform duration-300">
                  <UserCircle className="w-6 h-6 text-slate-300" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white mb-0.5">Try as Guest</h3>
                  <p className="text-sm text-slate-400">Jump right in. History won't be saved.</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}
