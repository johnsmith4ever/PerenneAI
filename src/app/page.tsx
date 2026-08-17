import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BrainCircuit, GraduationCap, MessagesSquare, CheckCircle2, Calendar, LayoutTemplate, ShieldCheck, Zap } from "lucide-react";
import { MouseTrackingBackground } from "@/components/ui/mouse-tracking-bg";

export default async function RootPage() {
  const { userId } = await auth();

  // If a user is already signed in, bypass the landing page and take them to the dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#030303] text-slate-200 flex flex-col font-sans selection:bg-purple-500/30 overflow-hidden relative">
      
      {/* Subtle Ambient Background */}
      <MouseTrackingBackground active={true} />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Clean Navbar */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-8 h-8 invert opacity-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
          <span className="font-serif font-black text-2xl tracking-widest text-white uppercase">Perenne</span>
        </div>
        {/* Intentionally left blank: No auth links here per the plan */}
      </nav>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-24 space-y-32 relative z-10">

        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row items-center justify-between gap-16 pt-8 md:pt-16">
          
          <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold backdrop-blur-md">
              <SparklesIcon className="w-4 h-4 text-purple-400" /> Premium AQA Study Engine
            </div>
            
            <h1 className="text-5xl md:text-7xl font-sans font-black tracking-tighter text-white leading-[1.05]">
              Outsmart the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">AQA Exams.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-lg font-medium">
              Stop guessing what will be on the test. Perenne's elite suite of AI tools extracts the exact knowledge you need to ace your AQA exams, aligned flawlessly to the syllabus.
            </p>
            
            <div className="pt-4">
              <Link href="/get-started">
                <Button size="lg" className="h-14 rounded-full px-10 text-lg bg-white hover:bg-slate-200 text-black font-bold shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all flex items-center gap-3 group border-0">
                  Try it out
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Why Us Box - Glassmorphism */}
          <div className="flex-1 w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-purple-500/30 transition-colors duration-500">
              
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-500"></div>
              
              <h2 className="text-2xl font-sans font-bold text-white mb-8 relative z-10 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-purple-400" />
                Why us?
              </h2>
              
              <ul className="space-y-8 relative z-10">
                <li className="flex items-start gap-4">
                  <div className="mt-1 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                    <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1">AQA Specifics Only</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">We don't waste time on generic fluff. Every generated question, essay grade, and note is rigorously mapped to the official AQA mark schemes.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1">Cheaper than Coffee</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">Don't bleed money on $20/month AI subscriptions. Get access to the exact same premium AI models (Claude, DeepSeek, Mistral) for a fraction of the cost.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

        </section>

        {/* Feature Highlights Section (Bento Grid) */}
        <section className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <div className="text-left space-y-4 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-sans font-bold text-white tracking-tight">Your Study Tools</h2>
            <p className="text-slate-400 text-lg">Everything you need to dominate your studies, in one sleek dashboard.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-indigo-500/30 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all duration-300">
                <BrainCircuit className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-sans font-bold text-white mb-2">Note Summarizer</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Paste your chaotic lecture notes and watch them instantly transform into structured, perfectly formatted study guides.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-rose-500/30 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] transition-all duration-300">
                <GraduationCap className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-xl font-sans font-bold text-white mb-2">AQA Essay Grader</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Get brutal, accurate feedback rigorously matched to AQA mark schemes with paragraph-by-paragraph rewrites.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-amber-500/30 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all duration-300">
                <MessagesSquare className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-sans font-bold text-white mb-2">Curriculum Chat</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Chat with advanced models to break down complex topics, test your knowledge, or just talk through a difficult concept.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-emerald-500/30 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all duration-300">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-sans font-bold text-white mb-2">Adaptive Quizzes</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Generate quizzes tailored to your subject and year group with instant marking to find your weak spots.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-blue-500/30 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-sans font-bold text-white mb-2">Schedule Maker</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Use AI to generate optimal revision schedules leading up to your exams, spacing out your learning.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-purple-500/30 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300">
                <LayoutTemplate className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-sans font-bold text-white mb-2">Instant Flashcards</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Turn any topic or set of notes into ready-to-study flashcards in seconds. Export them directly to Anki.
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 mt-24 bg-white/[0.02] relative z-20">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-5 h-5 invert opacity-50" />
              <span className="font-serif font-black text-slate-500 tracking-widest uppercase">Perenne</span>
            </div>
            <p className="text-sm text-slate-600">© 2026 Perenne.</p>
            <p className="text-sm text-slate-600">Built for students who'd rather understand it than just get through it.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
