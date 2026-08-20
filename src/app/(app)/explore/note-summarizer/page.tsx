"use client";

import { useState, useEffect } from "react";
import { BookOpen, Sparkles, Loader2, ArrowLeft, Brain, Zap, Target, Lock, Mail, Save, CheckCircle2 } from "lucide-react";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription, ModelType, TIER_RANK, FREE_ACCESS_MODE } from "@/hooks/use-subscription";

import { ApiErrorFallback } from "@/components/ui/api-error-fallback";
import { useLocalStorage } from "@/hooks/use-local-storage";

import { useUser } from "@clerk/nextjs";

type SummarizerData = {
  tldr?: string;
  keyConcepts?: { title: string; explanation: string }[];
  actionableTakeaways?: string[];
  eli10?: string;
  pureSummary?: string;
};

export default function NoteSummarizerPage() {
  const { openUpgradeModal } = useUpgradeModal();
  const { tier, canAfford, deductCredits, isLoaded: subLoaded , assistant } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;

  const [understandInput, setUnderstandInput] = useLocalStorage("ns_input_understand", "");
  const [eli10Input, setEli10Input] = useLocalStorage("ns_input_eli10", "");
  const [pureInput, setPureInput] = useLocalStorage("ns_input_pure", "");
  const [loading, setLoading] = useState(false);
  const [summarizerError, setSummarizerError] = useState(false);
  const [understandResult, setUnderstandResult] = useLocalStorage<SummarizerData | null>("ns_result_understand", null);
  const [eli10Result, setEli10Result] = useLocalStorage<SummarizerData | null>("ns_result_eli10", null);
  const [pureResult, setPureResult] = useLocalStorage<SummarizerData | null>("ns_result_pure", null);
  
  const [aqaStatus, setAqaStatus] = useState<"checking" | "found" | "not_found" | null>(null);

  const [mode, setMode] = useLocalStorage<"understand" | "pure" | "eli10">("ns_mode", "understand");
  const [format, setFormat] = useLocalStorage<"paragraph" | "bullets">("ns_format", "paragraph");
  const [length, setLength] = useLocalStorage<"mini" | "short" | "medium">("ns_length", "short");

  const currentInput = mode === "understand" ? understandInput : mode === "eli10" ? eli10Input : pureInput;
  const setCurrentInput = mode === "understand" ? setUnderstandInput : mode === "eli10" ? setEli10Input : setPureInput;

  useEffect(() => {
    if (mode !== "eli10" || !eli10Input.trim()) {
      setAqaStatus(null);
      return;
    }

    setAqaStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/search-aqa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: eli10Input })
        });
        const data = await res.json();
        if (data.status === "success" && data.results && data.results.length === 0) {
          setAqaStatus("not_found");
        } else {
          setAqaStatus("found");
        }
      } catch (e) {
        setAqaStatus(null);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [eli10Input, mode]);

  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isPromptingName, setIsPromptingName] = useState(false);
  const [saveName, setSaveName] = useState("");

  const handleSaveClick = () => {
    setSaveName("Note Summary - " + new Date().toLocaleDateString());
    setIsPromptingName(true);
  };

  const confirmSaveToHistory = async () => {
    if (!user) return;
    const result = mode === "understand" ? understandResult : mode === "eli10" ? eli10Result : pureResult;
    const input = currentInput;
    if (!result) return;
    setIsSaving(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.from("explore").insert({
        user_id: user.id,
        type: "note_summary_saved",
        topic: saveName || "Note Summary",
        data: result
      });
      if (error) throw error;
      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 3000);
    } catch (e) {
      console.error("Error saving note summary:", e);
    } finally {
      setIsSaving(false);
      setIsPromptingName(false);
    }
  };

  const handleSummarize = async () => {
    if (!currentInput.trim()) return;
    if (!subLoaded) return;
    
    const isProPlus = tierRank >= TIER_RANK.Pro;
    const modelUsed: ModelType = assistant;

    if (!canAfford(1500, modelUsed)) {
      openUpgradeModal("You do not have enough daily credits to summarize these notes. Please try again tomorrow or upgrade your plan.", "Upgrade Plan", "/subscriptions");
      return;
    }

    setLoading(true);
    setSummarizerError(false);
    try {
      const res = await fetch("/api/summarize-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentInput, mode, format, length, model: modelUsed }),
      });
      const data = await res.json();
      if (data.status === "success") {
        if (data.usage) deductCredits(data.usage.promptTokens || data.usage.inputTokens, data.usage.completionTokens || data.usage.outputTokens, modelUsed, "other");
        if (mode === "understand") setUnderstandResult(data.data);
        else if (mode === "eli10") setEli10Result(data.data);
        else setPureResult(data.data);
      } else {
        console.error("Error summarizing notes:", data.message);
        setSummarizerError(true);
      }
    } catch (e) {
      console.error(e);
      setSummarizerError(true);
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in relative">
      <div className="w-full">
      
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="label-title m-0">Productivity Tool</p>
          {subLoaded && tierRank < TIER_RANK.Pro && !FREE_ACCESS_MODE && (
            <span className="ml-auto px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-[11px] font-bold uppercase tracking-wider">
              Free Limit: 1 / Day
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <h1 className="page-title font-serif m-0" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Understand</h1>
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1">AQA Syllabus</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>
          Powered by AI. Paste your chaotic notes or just a topic, and we'll break it down so simply even a 5-year-old could pass the test.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
        {/* INPUT */}
        <div className="space-y-4 sticky top-6">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button 
                  className={cn("py-3 px-2 text-sm font-bold rounded-xl transition-all border shadow-sm flex flex-col items-center justify-center gap-1", mode === "understand" ? "bg-blue-600 text-white border-blue-600" : "bg-card border-border text-muted-foreground hover:bg-muted/50")} 
                  onClick={() => setMode("understand")}
                >
                  <span>Understand</span>
                </button>
                <button 
                  className={cn("py-3 px-2 text-sm font-bold rounded-xl transition-all border shadow-sm flex flex-col items-center justify-center gap-1", mode === "pure" ? "bg-blue-600 text-white border-blue-600" : "bg-card border-border text-muted-foreground hover:bg-muted/50")} 
                  onClick={() => setMode("pure")}
                >
                  <span>Pure Summary</span>
                </button>
                <button 
                  className={cn("py-3 px-2 text-sm font-bold rounded-xl transition-all border shadow-sm flex flex-col items-center justify-center gap-1", mode === "eli10" ? "bg-blue-600 text-white border-blue-600" : "bg-card border-border text-muted-foreground hover:bg-muted/50")} 
                  onClick={() => setMode("eli10")}
                >
                  <span>AQA Based Explanation</span>
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

          <div className="relative">
            <div className="p-1 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/5">
              <div className="bg-card rounded-xl border border-amber-500/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {mode === "eli10" ? "Your Topic" : "Your Messy Notes"}
                  </span>
                  <span className="text-xs text-muted-foreground">{currentInput.length} chars</span>
                </div>
                {mode === "eli10" ? (
                  <input
                    value={eli10Input}
                    onChange={(e) => setEli10Input(e.target.value)}
                    placeholder="e.g. Quantum mechanics, cell division, the cold war..."
                    className="w-full bg-transparent border-none focus:ring-0 p-4 text-base font-medium focus:outline-none font-sans"
                  />
                ) : (
                  <textarea
                    value={mode === "understand" ? understandInput : pureInput}
                    onChange={(e) => mode === "understand" ? setUnderstandInput(e.target.value) : setPureInput(e.target.value)}
                    placeholder="Paste your lecture notes, article text, or random thoughts here..."
                    className="w-full h-[500px] bg-transparent border-none focus:ring-0 p-4 text-sm leading-relaxed resize-none focus:outline-none font-sans"
                  />
                )}
                {mode === "eli10" && aqaStatus === "not_found" && (
                  <div className="bg-red-500/20 px-4 py-2 text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2 border-t border-red-500/20">
                    <Target className="w-3 h-3" />
                    Not in official AQA database
                  </div>
                )}
                {mode === "eli10" && aqaStatus === "found" && (
                  <div className="bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2 border-t border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    AQA Database Clearance: Found
                  </div>
                )}
              </div>
            </div>
            <Button className="w-full gap-2 py-6 text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all rounded-xl mt-4" onClick={handleSummarize} disabled={loading || !currentInput.trim()}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {loading ? "Summarizing..." : "Summarize"}
            </Button>
          </div>
        </div>

        {/* OUTPUT */}
        <div className="space-y-6 transition-all duration-500">
          {(mode === "understand" ? understandResult : mode === "eli10" ? eli10Result : pureResult) && !summarizerError && (
            <div className="flex justify-end mb-4 animate-in fade-in">
              {isPromptingName ? (
                <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-lg shadow-sm">
                  <input
                    autoFocus
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Enter summary name..."
                    className="bg-transparent border-none text-sm px-2 py-1 outline-none focus:ring-0 text-foreground w-[200px]"
                    onKeyDown={(e) => e.key === "Enter" && confirmSaveToHistory()}
                  />
                  <Button size="sm" onClick={confirmSaveToHistory} disabled={isSaving} className="h-7 px-3">
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsPromptingName(false)} className="h-7 px-2 text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSaveClick} disabled={hasSaved} className="gap-2">
                  {hasSaved ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Saved to History</> : <><Save className="w-4 h-4" /> Save Summary</>}
                </Button>
              )}
            </div>
          )}
          
          {summarizerError ? (
            <div className="h-full min-h-[500px] flex items-center justify-center">
              <ApiErrorFallback message="Failed to summarize your notes." onRetry={handleSummarize} />
            </div>
          ) : !(mode === "understand" ? understandResult : mode === "eli10" ? eli10Result : pureResult) && !loading ? (
             <div className="h-full min-h-[500px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-card/50">
               <Brain className="w-12 h-12 text-muted-foreground/30 mb-4" />
               <h3 className="font-semibold text-foreground mb-1 font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Awaiting Notes</h3>
               <p className="text-sm text-muted-foreground max-w-sm font-sans">Hit summarize and watch your chaotic text transform into a beautiful, structured study guide.</p>
             </div>
          ) : null}

          {pureResult && mode === "pure" && pureResult.pureSummary && (
             <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>
               <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                 <h3 className="font-bold text-foreground text-xl font-serif mb-4" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Summary</h3>
                 <div className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                   {pureResult.pureSummary}
                 </div>
               </div>
             </div>
          )}

          {eli10Result && mode === "eli10" && eli10Result.tldr && (
             <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>
               <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                 <div className="flex items-center gap-2 mb-3">
                   <Zap className="w-5 h-5 text-blue-500" />
                   <h3 className="font-bold text-blue-500 text-lg tracking-tight font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Definition</h3>
                 </div>
                 <p className="text-foreground leading-relaxed font-medium text-[15px]">{eli10Result.tldr}</p>
               </div>

               <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg">💡</div>
                   <h3 className="font-bold text-emerald-600 text-lg tracking-tight font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Simple Explanation</h3>
                 </div>
                 <p className="text-foreground leading-relaxed text-[15px]">{eli10Result.eli10}</p>
               </div>

               {eli10Result.keyConcepts && eli10Result.keyConcepts.length > 0 && (
                 <div className="space-y-4 mt-2">
                   <h3 className="font-bold flex items-center gap-2 text-foreground text-xl font-serif mb-4" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>
                     <Brain className="w-6 h-6 text-purple-500" /> Core Concepts
                   </h3>
                   {eli10Result.keyConcepts.map((concept, i) => (
                     <div key={i} className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                       <h4 className="font-bold text-foreground mb-3 text-lg font-serif tracking-tight" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>{concept.title}</h4>
                       <p className="text-[15px] text-muted-foreground leading-relaxed">{concept.explanation}</p>
                     </div>
                   ))}
                 </div>
               )}

               {eli10Result.actionableTakeaways && eli10Result.actionableTakeaways.length > 0 && (
                 <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 mt-2">
                   <div className="flex items-center gap-2 mb-4">
                     <Target className="w-5 h-5 text-amber-600" />
                     <h3 className="font-bold text-amber-600 text-lg font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Actionable Takeaways</h3>
                   </div>
                   <ul className="space-y-3">
                     {eli10Result.actionableTakeaways.map((takeaway, i) => (
                       <li key={i} className="flex items-start gap-3 text-[15px] text-foreground bg-amber-500/10 p-3 rounded-lg border border-amber-500/10">
                         <span className="text-amber-500 font-bold shrink-0">{i + 1}.</span>
                         <span className="leading-relaxed">{takeaway}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
             </div>
          )}

          {understandResult && mode === "understand" && understandResult.tldr && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 font-sans" style={{ fontFamily: 'Anthropic Sans, var(--font-inter), sans-serif' }}>
              <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-blue-500 text-lg tracking-tight font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Definition</h3>
                </div>
                <p className="text-foreground leading-relaxed font-medium text-[15px]">{understandResult.tldr}</p>
              </div>

              <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg">💡</div>
                  <h3 className="font-bold text-emerald-600 text-lg tracking-tight font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Explain Like I'm 10</h3>
                </div>
                <p className="text-foreground leading-relaxed text-[15px]">{understandResult.eli10}</p>
              </div>

              <div className="space-y-4 mt-8">
                <h3 className="font-bold flex items-center gap-2 text-foreground text-xl font-serif mb-6" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>
                  <Brain className="w-6 h-6 text-purple-500" /> Core Concepts
                </h3>
                {understandResult.keyConcepts?.map((concept, i) => (
                  <div key={i} className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-foreground mb-3 text-lg font-serif tracking-tight" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>{concept.title}</h4>
                    <p className="text-[15px] text-muted-foreground leading-relaxed">{concept.explanation}</p>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-amber-600 text-lg font-serif" style={{ fontFamily: 'Anthropic Serif, var(--font-merriweather), serif' }}>Actionable Takeaways</h3>
                </div>
                <ul className="space-y-3">
                  {understandResult.actionableTakeaways?.map((takeaway, i) => (
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
    </div>

  );
}
