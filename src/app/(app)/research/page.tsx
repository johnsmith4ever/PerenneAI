"use client";

import { useState } from "react";
import { Search, Loader2, ArrowLeft, ExternalLink, Sparkles, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSubscription } from "@/hooks/use-subscription";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { ProGate } from "@/components/pro-gate";

export default function ResearchPage() {
  const { canAfford, deductCredits, isLoaded } = useSubscription();
  const [topic, setTopic] = usePersistentState("research_topic", "");
  const [focusArea, setFocusArea] = usePersistentState("research_focus", "");
  const [domains, setDomains] = usePersistentState("research_domains", "");
  const [isSearching, setIsSearching] = useState(false);
  
  const [report, setReport] = usePersistentState<string | null>("research_report", null);
  const [modelUsed, setModelUsed] = usePersistentState<string | null>("research_model", null);
  const [sources, setSources] = usePersistentState<{url: string, title: string}[]>("research_sources", []);

  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const saveToHistory = async () => {
    if (!user || !report) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("explore_history").insert({
        user_id: user.id,
        type: "research",
        topic: topic || "Research Topic",
        data: { report, sources, modelUsed }
      });
      if (error) throw error;
      setHasSaved(true);
    } catch (e) {
      console.error("Error saving research history:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!topic.trim()) return;
    if (!canAfford(2000, "Apollo V4 Flash")) {
      alert("Insufficient credits.");
      return;
    }

    setIsSearching(true);
    setReport(null);
    setSources([]);
    setHasSaved(false);
    
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, focusArea, domains })
      });
      const data = await res.json();
      
      if (data.status === "success") {
        setReport(data.text);
        setModelUsed(data.model);
        setSources(data.sources || []);
        if (data.usage) {
          // Deduct credits based on model used (Deepseek or Gemini fallback)
          deductCredits(data.usage.inputTokens ?? data.usage.promptTokens, data.usage.outputTokens ?? data.usage.completionTokens, data.model.includes("Apollo") ? "Apollo V4 Flash" : "Bastion 3.5 Flash");
        }
        if (data.sources && data.sources.length > 0) {
          deductCredits(25, 25, "Tavily Search"); // flat 3500 cost
        }
      } else {
        alert("Search failed: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred");
    } finally {
      setIsSearching(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <p className="label-title">Study Tools</p>
            <h1 className="page-title">Research Assistant</h1>
          </div>
        </div>
        {report && (
          <Button variant="outline" size="sm" className="gap-2" onClick={saveToHistory} disabled={isSaving || hasSaved}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Save className="w-4 h-4" />}
            {hasSaved ? "Saved to History" : "Save Research"}
          </Button>
        )}
      </div>

      <ProGate featureName="Deep Web Research">
      <div className="p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">What do you want to research?</label>
          <div className="relative">
            <input
              type="text"
              className="w-full rounded-xl border border-border bg-transparent pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
              placeholder="e.g. What are the latest advancements in solid-state batteries?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Focus Area (Optional)</label>
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              placeholder="e.g. Company finances, Historical impact"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Specific Websites (Optional)</label>
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              placeholder="e.g. bbc.co.uk, wikipedia.org"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        <Button className="w-full h-14 text-lg gap-2" onClick={handleSearch} disabled={!topic.trim() || isSearching}>
          {isSearching ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Synthesizing Research...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> Start Research</>
          )}
        </Button>
      </div>

      {isSearching && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Search className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-bold">Scouring the web...</h2>
          <p className="text-muted-foreground">Fetching sources and summarizing data.</p>
        </div>
      )}

      {report && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 rounded-2xl border border-border bg-card shadow-sm prose prose-neutral dark:prose-invert max-w-none">
            <div className="flex items-center gap-2 mb-6 pb-6 border-b border-border/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" /> Generated by {modelUsed}
            </div>
            
            <div className="whitespace-pre-wrap leading-relaxed">{report}</div>
          </div>

          {sources.length > 0 && (
            <div className="p-6 rounded-2xl border border-border bg-muted/30">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground/80">Cited Sources</h3>
              <ul className="space-y-3">
                {sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-start gap-2 group">
                      <ExternalLink className="w-4 h-4 mt-0.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                      <span className="line-clamp-1">{s.title || s.url}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      </ProGate>
    </div>
  );
}
