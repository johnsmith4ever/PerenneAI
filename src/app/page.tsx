import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, BrainCircuit, GraduationCap, MessagesSquare, CheckCircle2, Calendar, LayoutTemplate } from "lucide-react";
import { MouseTrackingBackground } from "@/components/ui/mouse-tracking-bg";

export default async function RootPage() {
  const { userId } = await auth();

  // If a user is already signed in, bypass the landing page and take them to the welcome page
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-amber-500/20 overflow-hidden relative">
      
      {/* Global Ambient Background */}
      <MouseTrackingBackground active={true} />
      
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Navbar */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-8 h-8 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] invert" />
          <span className="font-serif font-black text-2xl tracking-widest text-white uppercase">Perenne</span>
        </div>
        <div className="flex items-center gap-4">
          {userId ? (
            <Link href="/dashboard">
              <Button className="rounded-full px-6 bg-white text-black hover:bg-slate-200 font-bold shadow-[0_0_20px_rgba(245,158,11,0.2)]">Welcome Back</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/get-started">
                <Button className="rounded-full px-6 bg-white text-black hover:bg-slate-200 font-bold shadow-[0_0_20px_rgba(245,158,11,0.2)]">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-24 space-y-32 relative z-10">

        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-4xl mx-auto pt-12 md:pt-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-amber-500 text-sm font-semibold backdrop-blur-md mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="w-4 h-4" /> Next-Generation AI Study Engine
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tight text-white leading-[1.1] animate-in fade-in zoom-in-95 duration-1000 delay-150 fill-mode-both">
            Outsmart your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 drop-shadow-sm">curriculum.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-both">
            Stop grinding endlessly. Use Perenne's elite suite of AI tools—from Note Summarizers to Essay Graders—to extract the exact knowledge you need to ace your exams.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 fill-mode-both">
            <Link href="/get-started">
              <Button size="lg" className="h-14 rounded-full px-8 text-base bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)] transition-all flex items-center gap-2 group border-0">
                Enter Perenne
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="space-y-16 relative z-10">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Your Tools</h2>
            <p className="text-slate-400 text-lg">Everything you need to dominate your studies, in one place.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl backdrop-blur-sm hover:bg-white/10 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6 border border-amber-500/30 group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-3">Note Summarizer</h3>
              <p className="text-slate-400 leading-relaxed">
                Paste your chaotic lecture notes and watch them instantly transform into structured, perfectly formatted study guides and ELI10 analogies.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl backdrop-blur-sm hover:bg-white/10 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-6 border border-orange-500/30 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-3">Essay Grader</h3>
              <p className="text-slate-400 leading-relaxed">
                Get brutal, accurate feedback on your essays across Content, Structure, and Grammar, along with paragraph-by-paragraph rewrites.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl backdrop-blur-sm hover:bg-white/10 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/30 group-hover:scale-110 transition-transform">
                <MessagesSquare className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-3">Curriculum Chat</h3>
              <p className="text-slate-400 leading-relaxed">
                Chat with our advanced models to break down complex topics, test your knowledge, or just talk through a difficult concept.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl backdrop-blur-sm hover:bg-white/10 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-3">Adaptive Quizzes</h3>
              <p className="text-slate-400 leading-relaxed">
                Generate quizzes tailored to your subject and year group with instant marking to find your weak spots immediately.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl backdrop-blur-sm hover:bg-white/10 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 border border-blue-500/30 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-3">Schedule Maker</h3>
              <p className="text-slate-400 leading-relaxed">
                Use AI to generate optimal revision schedules leading up to your exams, balancing difficult subjects and spacing out your learning.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl backdrop-blur-sm hover:bg-white/10 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30 group-hover:scale-110 transition-transform">
                <LayoutTemplate className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-3">Instant Flashcards</h3>
              <p className="text-slate-400 leading-relaxed">
                Turn any topic or set of notes into ready-to-study flashcards in seconds. Export them directly to Anki or study them right here.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 mt-24 bg-black/40 backdrop-blur-md relative z-20">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-5 h-5 opacity-70 invert" />
              <span className="font-serif font-black text-white/80 tracking-widest uppercase">Perenne</span>
            </div>
            <p className="text-sm text-slate-500">© 2026 Perenne.</p>
            <p className="text-sm text-slate-500">Built for students who'd rather understand it than just get through it.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
