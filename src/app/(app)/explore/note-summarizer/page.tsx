"use client";

import { useState } from "react";
import { BookOpen, Sparkles, Loader2, ArrowLeft, Brain, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription, ModelType, TIER_RANK } from "@/hooks/use-subscription";

import { useLocalStorage } from "@/hooks/use-local-storage";

type SummarizerData = {
  tldr?: string;
  keyConcepts?: { title: string; explanation: string; analogy: string }[];
  actionableTakeaways?: string[];
  eli10?: string;
  pureSummary?: string;
};

export default function NoteSummarizerPage() {
  const { tier, canAfford, deductCredits, isLoaded: subLoaded } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;

  const [input, setInput] = useLocalStorage("ns_input", "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useLocalStorage<SummarizerData | null>("ns_result", null);
  
  const [mode, setMode] = useLocalStorage<"understand" | "pure">("ns_mode", "understand");
  const [format, setFormat] = useLocalStorage<"paragraph" | "bullets">("ns_format", "paragraph");
  const [length, setLength] = useLocalStorage<"mini" | "short" | "medium">("ns_length", "short");

  const handleSummarize = async () => {
    if (!input.trim()) return;
    if (!subLoaded) return;
    
    const isPremiumPlus = tierRank >= TIER_RANK.Premium;
    const modelUsed: ModelType = isPremiumPlus ? "Apollo V4 Flash" : "Polaris 1";

    if (!canAfford(1500, modelUsed)) {
      alert("You do not have enough daily credits to summarize these notes. Please try again tomorrow or upgrade your plan.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/summarize-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, mode, format, length }),
      });
      const data = await res.json();
      if (data.status === "success") {
        if (data.usage) deductCredits(data.usage.promptTokens || data.usage.inputTokens, data.usage.completionTokens || data.usage.outputTokens, modelUsed, "other");
        setResult(data.data);
      } else {
        alert("Error: " + data.message);
      }
    } catch (e) {
      alert("Failed to summarize notes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in">
      <Link href="/explore" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Explore
      </Link>
      
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="label-title m-0">Productivity Tool</p>
        </div>
        <h1 className="page-title font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Note Summarizer</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>
          Powered by Deepseek. Paste your chaotic, messy lecture notes below. We'll extract the core concepts, give you memorable analogies, and break it down so simply even a 5-year-old could pass the test.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
        {/* INPUT */}
        <div className="space-y-4 sticky top-6">
          <div className="flex flex-col gap-3">
            <div className="flex p-1 bg-muted/50 rounded-xl border border-border">
              <button 
                className={cn("flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all", mode === "understand" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")} 
                onClick={() => setMode("understand")}
              >
                Understand Mode
              </button>
              <button 
                className={cn("flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all", mode === "pure" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")} 
                onClick={() => setMode("pure")}
              >
                Pure Summary
              </button>
            </div>
            
            {mode === "pure" && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-sans font-medium text-foreground cursor-pointer">
                  <option value="paragraph">Paragraph</option>
                  <option value="bullets">Bullet Points</option>
                </select>
                <select value={length} onChange={(e) => setLength(e.target.value as any)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-sans font-medium text-foreground cursor-pointer">
                  <option value="mini">Mini Length</option>
                  <option value="short">Short Length</option>
                  <option value="medium">Medium Length</option>
                </select>
              </div>
            )}
          </div>

          <div className="p-1 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/5">
            <div className="bg-card rounded-xl border border-amber-500/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Messy Notes</span>
                <span className="text-xs text-muted-foreground">{input.length} chars</span>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your lecture notes, article text, or random thoughts here..."
                className="w-full h-[500px] bg-transparent border-none focus:ring-0 p-4 text-sm leading-relaxed resize-none focus:outline-none font-sans"
              />
            </div>
          </div>
          <Button 
            className="w-full gap-2 h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all rounded-xl font-bold" 
            onClick={handleSummarize}
            disabled={loading || input.trim().length < 10}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "Deepseek is analyzing..." : "Summarize & Clarify"}
          </Button>
        </div>

        {/* OUTPUT */}
        <div className={cn("space-y-6 transition-all duration-500", !result ? "opacity-50 grayscale pointer-events-none" : "")}>
          {!result && !loading && (
             <div className="h-full min-h-[500px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-card/50">
               <Brain className="w-12 h-12 text-muted-foreground/30 mb-4" />
               <h3 className="font-semibold text-foreground mb-1 font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Awaiting Notes</h3>
               <p className="text-sm text-muted-foreground max-w-sm font-sans">Hit summarize and watch your chaotic text transform into a beautiful, structured study guide.</p>
             </div>
          )}

          {result && mode === "pure" && result.pureSummary && (
             <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>
               <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                 <h3 className="font-bold text-foreground text-xl font-serif mb-4" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Summary</h3>
                 <div className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                   {result.pureSummary}
                 </div>
               </div>
             </div>
          )}

          {result && mode === "understand" && result.tldr && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>
              {/* TLDR */}
              <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-blue-500 text-lg tracking-tight font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>TL;DR</h3>
                </div>
                <p className="text-foreground leading-relaxed font-medium text-[15px]">{result.tldr}</p>
              </div>

              {/* ELI10 */}
              <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg">💡</div>
                  <h3 className="font-bold text-emerald-600 text-lg tracking-tight font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Explain Like I'm 10</h3>
                </div>
                <p className="text-foreground leading-relaxed text-[15px]">{result.eli10}</p>
              </div>

              {/* Key Concepts */}
              <div className="space-y-4 mt-8">
                <h3 className="font-bold flex items-center gap-2 text-foreground text-xl font-serif mb-6" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>
                  <Brain className="w-6 h-6 text-purple-500" /> Core Concepts
                </h3>
                {result.keyConcepts?.map((concept, i) => (
                  <div key={i} className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-foreground mb-3 text-lg font-serif tracking-tight" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>{concept.title}</h4>
                    <p className="text-[15px] text-muted-foreground mb-5 leading-relaxed">{concept.explanation}</p>
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💡</span>
                        <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Memory Analogy</p>
                      </div>
                      <p className="text-[14px] text-foreground leading-relaxed italic">{concept.analogy}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actionable Takeaways */}
              <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-amber-600 text-lg font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Actionable Takeaways</h3>
                </div>
                <ul className="space-y-3">
                  {result.actionableTakeaways?.map((takeaway, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] text-foreground bg-amber-500/10 p-3 rounded-lg border border-amber-500/10">
                      <span className="text-amber-500 font-bold shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
