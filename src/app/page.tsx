import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BrainCircuit, GraduationCap, MessagesSquare, CheckCircle2, Calendar, LayoutTemplate, ShieldCheck, Zap } from "lucide-react";

export default async function RootPage() {
  const { userId } = await auth();

  // If a user is already signed in, bypass the landing page and take them to the welcome page
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-purple-500/20">
      
      {/* Clean Navbar */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-8 h-8 opacity-90" />
          <span className="font-serif font-black text-2xl tracking-widest text-slate-900 uppercase">Perenne</span>
        </div>
        {/* Intentionally left blank: No auth links here per the plan */}
      </nav>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-24 space-y-32">

        {/* Hero Section */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-12 pt-8 md:pt-16">
          
          <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tight text-slate-900 leading-[1.1]">
              Outsmart the <br />
              <span className="text-purple-600">AQA Exams.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-lg font-medium">
              Stop guessing what will be on the test. Perenne's elite suite of AI tools extracts the exact knowledge you need to ace your AQA exams, aligned flawlessly to the syllabus.
            </p>
            <div className="pt-4">
              <Link href="/get-started">
                <Button size="lg" className="h-16 rounded-full px-10 text-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-3 group border-0">
                  Try it out
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Why Us Box */}
          <div className="flex-1 w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <ShieldCheck className="w-32 h-32" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-slate-900 mb-6 relative z-10">Why us?</h2>
              
              <ul className="space-y-6 relative z-10">
                <li className="flex items-start gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">AQA Specifics Only</h3>
                    <p className="text-slate-600 leading-relaxed">We don't waste time on generic fluff. Every generated question, essay grade, and note is rigorously mapped to the official AQA mark schemes.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Cheaper than Coffee</h3>
                    <p className="text-slate-600 leading-relaxed">Don't bleed money on $20/month AI subscriptions. Get access to the exact same premium AI models (Claude, DeepSeek) for a fraction of the cost.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

        </section>

        {/* Feature Highlights Section (Clean Grid) */}
        <section className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <div className="text-left space-y-4 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900">Your Study Tools</h2>
            <p className="text-slate-600 text-lg">Everything you need to dominate your studies, in one clean dashboard.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 group-hover:bg-indigo-100 transition-colors">
                <BrainCircuit className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">Note Summarizer</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Paste your chaotic lecture notes and watch them instantly transform into structured, perfectly formatted study guides.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-6 group-hover:bg-rose-100 transition-colors">
                <GraduationCap className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">AQA Essay Grader</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Get brutal, accurate feedback rigorously matched to AQA mark schemes with paragraph-by-paragraph rewrites.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-6 group-hover:bg-amber-100 transition-colors">
                <MessagesSquare className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">Curriculum Chat</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Chat with advanced models to break down complex topics, test your knowledge, or just talk through a difficult concept.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:bg-emerald-100 transition-colors">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">Adaptive Quizzes</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Generate quizzes tailored to your subject and year group with instant marking to find your weak spots.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">Schedule Maker</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Use AI to generate optimal revision schedules leading up to your exams, spacing out your learning.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors">
                <LayoutTemplate className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">Instant Flashcards</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Turn any topic or set of notes into ready-to-study flashcards in seconds. Export them directly to Anki.
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-100 mt-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-5 h-5 opacity-50" />
              <span className="font-serif font-black text-slate-500 tracking-widest uppercase">Perenne</span>
            </div>
            <p className="text-sm text-slate-500">© 2026 Perenne.</p>
            <p className="text-sm text-slate-500">Built for students who'd rather understand it than just get through it.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
