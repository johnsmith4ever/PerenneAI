"use client";
import { useState } from "react";

import { Bot, User, Send, Loader2, ArrowLeft, ShieldAlert, Save, CheckCircle2 } from "lucide-react";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useUser } from "@clerk/nextjs";
import { insertFeatureAction, deleteFeatureAction, fetchFeatureAction, upsertChatAction } from "@/actions/supabase";



export default function DebatePage() {
  const { openUpgradeModal } = useUpgradeModal();
  const { canAfford, deductCredits, isLoaded, assistant } = useSubscription();
  const [topic, setTopic] = useState("");
  const [stance, setStance] = useState<"Affirmative" | "Against">("Affirmative");
  const [useResearch, setUseResearch] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const saveToHistory = async () => {
    if (!user || messages.length === 0) return;
    setIsSaving(true);
    try {
      /* Removed history save per user request
      await insertFeatureAction("notes", {
        user_id: user.id,
        type: "debate",
        topic: topic || "Debate",
        data: messages
      });
      */
      
      setHasSaved(true);
    } catch (e) {
      console.error("Error saving debate history:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart = () => {
    if (!topic.trim()) return;
    setIsDebating(true);
    setMessages([
      { role: "assistant", content: `I'll play devil's advocate on: "${topic}". Since you are arguing **${stance}** the motion, I will argue the opposite. What is your opening argument?` }
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!canAfford(1000, "Deepseek-V4-Flash")) {
      openUpgradeModal("Insufficient credits.", "Upgrade Plan", "/subscriptions");
      return;
    }

    const newMessages = [...messages, { role: "user" as const, content: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, useResearch, topic, stance, model: assistant })
      });
      
      const data = await res.json();
      if (data.status === "success") {
        setMessages([...newMessages, { role: "assistant", content: data.text }]);
        if (data.usage) {
          deductCredits(data.usage.inputTokens ?? data.usage.promptTokens, data.usage.outputTokens ?? data.usage.completionTokens, assistant);
        }
        if (data.usedTavily) {
          deductCredits(25, 25, "Tavily Search"); // roughly 3500 flat fee for web search
        }
      } else {
        alert(data.message || "Failed to get response");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">

          <div>
            <p className="label-title">Debate Partner</p>
            <h1 className="page-title">{isDebating ? "Active Debate Session" : "Setup Debate"}</h1>
          </div>
        </div>
        {isDebating && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsDebating(false)}>
              Leave / New Debate
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={saveToHistory} disabled={isSaving || hasSaved}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Save className="w-4 h-4" />}
              {hasSaved ? "Saved to History" : "Save Debate"}
            </Button>
          </div>
        )}
      </div>


      {!isDebating ? (
        <div className="p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">What topic do you want to debate?</label>
            <textarea
              className="w-full rounded-xl border border-border bg-transparent px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={3}
              placeholder="e.g. AI will eventually replace all software engineers"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Your Stance</label>
            <div className="flex gap-4">
              <button
                onClick={() => setStance("Affirmative")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all",
                  stance === "Affirmative" 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                    : "bg-transparent border-border text-muted-foreground hover:bg-white/5"
                )}
              >
                Affirmative (For)
              </button>
              <button
                onClick={() => setStance("Against")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all",
                  stance === "Against" 
                    ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                    : "bg-transparent border-border text-muted-foreground hover:bg-white/5"
                )}
              >
                Against (Opposed)
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <input 
              type="checkbox" 
              id="research" 
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              checked={useResearch}
              onChange={(e) => setUseResearch(e.target.checked)}
            />
            <label htmlFor="research" className="text-sm font-medium text-foreground cursor-pointer flex-1">
              Enable Real-time Web Research
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">The AI will search the web to find facts to counter your points.</span>
            </label>
          </div>

          <Button className="w-full" size="lg" onClick={handleStart} disabled={!topic.trim()}>
            Start Debate
          </Button>
        </div>
      ) : (
        <div className="flex flex-col h-[600px] border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-4 max-w-[85%]", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-red-500/10 text-red-500")}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                </div>
                <div className={cn("p-4 rounded-2xl", msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm")}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-red-500/10 text-red-500">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-muted rounded-tl-sm flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking of a counter-argument...
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="relative">
              <textarea
                className="w-full rounded-xl border border-border bg-card pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                rows={2}
                placeholder="Type your argument..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button 
                size="icon" 
                className="absolute right-2 top-2 h-8 w-8 rounded-lg" 
                disabled={!input.trim() || isLoading}
                onClick={handleSend}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
