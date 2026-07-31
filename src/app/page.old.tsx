import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, BrainCircuit, GraduationCap, MessagesSquare, CheckCircle2 } from "lucide-react";

export default async function RootPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">

      {/* Navbar */}
      <nav className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-7 h-7" />
          <span className="font-serif font-bold text-xl tracking-wide">Perenne</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button className="rounded-full px-5 shadow-sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 md:py-24 space-y-32">

        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-3xl mx-auto pt-8">
          <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-foreground leading-[1.1]">
            Study smarter,<br />
            <span className="text-primary/90">not harder.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            AI-powered flashcards, quizzes, and essay feedback — built for GCSE and A-Level students across the UK.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/sign-up">
              <Button size="lg" className="rounded-full px-8 text-base shadow-sm">Get Started</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="rounded-full px-8 text-base">Sign In</Button>
            </Link>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-serif font-bold text-foreground">Everything you need to revise</h2>
            <p className="text-muted-foreground">Purpose-built tools for the UK curriculum.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card border border-border p-8 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-foreground">Flashcards, made instantly</h3>
              <p className="text-muted-foreground leading-relaxed">
                Turn any topic or set of notes into ready-to-study flashcards in seconds. No more spending an hour making cards before you've even started revising.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <BookOpenCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-foreground">Quizzes that actually test you</h3>
              <p className="text-muted-foreground leading-relaxed">
                Generate quizzes tailored to your subject and year group, with instant AI marking and feedback — so you know exactly where you're strong and where you're not.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                <GraduationCap className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-foreground">Essay grading that gives real feedback</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload your essay or paste your writing, and get scored across Content, Structure, Evidence, and Grammar — plus a rewrite engine that shows you how to actually improve, paragraph by paragraph.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                <MessagesSquare className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-foreground">An AI study partner, on your terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                Stuck on a concept? Ask. Perenne's chat adapts to how you want to work — quick explanations, deeper dives, or just checking your understanding before an exam.
              </p>
            </div>
          </div>
        </section>

        {/* Why Perenne Section */}
        <section className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-sm overflow-hidden relative">
          {/* Decorative background blur */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-foreground leading-snug">
                Built for how UK students <span className="text-primary">actually study.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Perenne is designed specifically around the KS3 to A-Level curriculum — not a generic study app repurposed for a different system. Every feature, from essay structure (PEE, PEEL, TEEL) to subject coverage, reflects what you're actually being marked on.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-serif font-semibold text-foreground text-lg">Built for your curriculum</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-1">Not adapted from someone else's system.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-serif font-semibold text-foreground text-lg">Genuinely affordable</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-1">Pay for what you use, not a bloated subscription.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-serif font-semibold text-foreground text-lg">Real, specific feedback</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-1">Not vague encouragement — actual marks and improvements.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border mt-12 bg-card/50">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-5 h-5 opacity-70" />
              <span className="font-serif font-semibold text-foreground/80 tracking-wide">Perenne</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 Perenne.</p>
            <p className="text-sm text-muted-foreground">Built for students who'd rather understand it than just get through it.</p>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
