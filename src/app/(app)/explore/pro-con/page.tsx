"use client";

import { useState, useEffect } from "react";
import { MousePointerClick, ArrowRight, Loader2, Plus, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSubscription } from "@/hooks/use-subscription";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

type Item = {
  point: string;
  description: string;
};

type ProConData = {
  pros: Item[];
  cons: Item[];
};

export default function ProConPage() {
  const [topic, setTopic] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProConData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { deductCredits } = useSubscription();
  const { user } = useUser();

  useEffect(() => {
    const savedData = localStorage.getItem("explore_procon_data");
    const savedTopic = localStorage.getItem("explore_procon_topic");
    if (savedData && savedTopic) {
      setResult(JSON.parse(savedData));
      setTopic(savedTopic);
      localStorage.removeItem("explore_procon_data");
      localStorage.removeItem("explore_procon_topic");
    }
  }, []);

  const generateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pro-con", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, extraContext }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setResult(data.data);
        deductCredits(100, 300, "Apollo V4 Flash", "other");
        
        if (user) {
          await supabase.from("explore_history").insert({
            user_id: user.id,
            topic: topic,
            type: "pro_con",
            data: data.data
          });
        }
      } else {
        setError(data.message || "Failed to generate.");
      }
    } catch (e: any) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in pb-12">
      {/* Header */}
      <div>
        <Link href="/explore" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to Explore
        </Link>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold font-serif" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
            Pro/Cons Table Maker
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Stuck on a decision? Enter your dilemma and let AI break it down into a clear, detailed pros and cons table to help you decide.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
        <form onSubmit={generateTable} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Should I move to New York City?" 
              className="flex-1 h-14 text-lg rounded-2xl bg-background/50 border-muted-foreground/20 focus-visible:ring-rose-500"
              disabled={loading}
            />
            <Button 
              type="submit" 
              disabled={loading || !topic.trim()} 
              className="h-14 px-8 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg shadow-lg shadow-rose-500/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Analyze"}
            </Button>
          </div>
          <Textarea 
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="Extra details (Optional). e.g., 'I have a job offer there for 100k, but I love the quiet suburbs...'"
            className="min-h-[100px] text-base rounded-2xl bg-background/50 border-muted-foreground/20 focus-visible:ring-rose-500 resize-y"
            disabled={loading}
          />
        </form>
        {error && <p className="text-red-500 mt-4 text-sm font-medium">{error}</p>}
      </div>

      {/* Results Section */}
      {result && (
        <div className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
          {/* Pros */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-emerald-500/20 pb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <ThumbsUp className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Pros</h2>
            </div>
            
            <div className="space-y-4">
              {result.pros.map((pro, i) => (
                <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl hover:border-emerald-500/30 transition-colors">
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-300 text-lg mb-2">{pro.point}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{pro.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cons */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-rose-500/20 pb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ThumbsDown className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-rose-600 dark:text-rose-400">Cons</h2>
            </div>
            
            <div className="space-y-4">
              {result.cons.map((con, i) => (
                <div key={i} className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-2xl hover:border-rose-500/30 transition-colors">
                  <h3 className="font-bold text-rose-700 dark:text-rose-300 text-lg mb-2">{con.point}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{con.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
