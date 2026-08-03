import { CheckCircle2, Gamepad2, Brain, Sparkles, BookOpen, Clock, Bot, Palette, ArrowRight, Mail, Eye, MousePointerClick, MonitorPlay, Headphones, FileSearch, Scale, FileText, Mic, Users, FlaskConical, PenTool, Cat, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ExplorePage() {
  return (
    <div className="space-y-12 animate-in fade-in pb-12">
      {/* Header */}
      <div>
        <p className="label-title mb-1.5 font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>More by us</p>
        <h1 className="page-title font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Explore</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>
          Discover our growing collection of specialized AI tools designed to make your daily life easier and bring a little more joy to your screen.
        </p>
      </div>

      {/* Productivity Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <h2 className="text-2xl font-bold font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Productivity</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <ToolCard 
            title="Ivresse" 
            description="Intelligent email drafting. Type your core message, and let AI craft the perfect professional email." 
            icon={<Mail className="w-6 h-6" />}
            color="bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
            href="https://ivresse-ai.onrender.com"
          />
          <ToolCard 
            title="Optex" 
            description="Advanced image reader. Extract text, data, and context from your photos instantly." 
            icon={<Eye className="w-6 h-6" />}
            color="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            href="https://optex-ai.vercel.app"
          />
          <ToolCard 
            title="Pro & Con Analyzer" 
            description="Weigh out complex decisions with balanced perspectives and insights." 
            icon={<Scale className="w-6 h-6" />}
            color="bg-blue-500/10 text-blue-500 border-blue-500/20"
            href="/explore/pro-con"
          />
          <ToolCard 
            title="Presentation Builder" 
            description="Generate full PowerPoint slides (.pptx) instantly from a simple prompt." 
            icon={<MonitorPlay className="w-6 h-6" />}
            color="bg-purple-500/10 text-purple-500 border-purple-500/20"
            href="/explore/presentation"
          />
        </div>
      </section>

      {/* Experimental Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-2xl font-bold font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Experimental Concepts</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <ToolCard 
            title="Lab Report Alchemist" 
            description="Upload raw lab data and instrument outputs, and the AI automatically structures a rigorous lab report with methodology and error analysis." 
            icon={<FlaskConical className="w-6 h-6" />}
            color="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          />
          <ToolCard 
            title="Grammar & Tone Coach" 
            description="Doesn't just fix typos—it analyzes your writing style and helps you rewrite essays to sound like a PhD scholar, a journalist, or a novelist." 
            icon={<PenTool className="w-6 h-6" />}
            color="bg-purple-500/10 text-purple-500 border-purple-500/20"
          />
          <ToolCard 
            title="Pomodoro Pet" 
            description="A virtual focus pet that levels up and evolves while you study, but loses health if you get distracted by other tabs or close the timer." 
            icon={<Cat className="w-6 h-6" />}
            color="bg-rose-500/10 text-rose-500 border-rose-500/20"
          />
          <ToolCard 
            title="Physics & Circuit Sandbox" 
            description="Describe a physics problem or electronic circuit, and the AI builds an interactive visual simulation to help you understand the forces at play." 
            icon={<Zap className="w-6 h-6" />}
            color="bg-amber-500/10 text-amber-500 border-amber-500/20"
          />
        </div>
      </section>
    </div>
  );
}

function ToolCard({ title, description, icon, color, href }: { title: string, description: string, icon: React.ReactNode, color: string, href?: string }) {
  const CardContent = (
    <>
      <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
        <ArrowRight className="w-5 h-5 text-primary" />
      </div>
      
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border shadow-sm ${color} transition-transform group-hover:scale-110 duration-300`}>
        {icon}
      </div>
      
      <h3 className="text-lg font-bold mb-2 font-serif text-foreground tracking-tight" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1 font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>
        {description}
      </p>
      
      <div className="mt-6 pt-4 border-t border-border/50">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
          {href ? "Open Application" : "Coming Soon"}
        </span>
      </div>
    </>
  );

  const baseClasses = "group relative flex flex-col p-6 rounded-2xl border border-border bg-card hover:shadow-xl transition-all duration-300 hover:border-primary/40 overflow-hidden cursor-pointer";

  if (href) {
    if (href.startsWith("/")) {
      return (
        <Link href={href} className={baseClasses}>
          {CardContent}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={baseClasses}>
        {CardContent}
      </a>
    );
  }

  return (
    <div className={baseClasses}>
      {CardContent}
    </div>
  );
}
