"use client";

import { useState, useRef } from "react";
import { Brain, ArrowLeft, Loader2, Image as ImageIcon, Send, X, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useUser } from "@clerk/nextjs";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { ProGate } from "@/components/pro-gate";

export default function MathSolverPage() {
  const { isLoaded, deductCredits, canAfford } = useSubscription();
  const { user } = useUser();
  const [problem, setProblem] = usePersistentState("math_problem", "");
  const [isSolving, setIsSolving] = useState(false);
  const [imageBase64, setImageBase64] = usePersistentState<string | null>("math_image", null);
  
  const [solution, setSolution] = usePersistentState<{ step: number, title: string, content: string }[] | null>("math_solution", null);
  const [finalAnswer, setFinalAnswer] = usePersistentState<string | null>("math_finalAnswer", null);
  const [extractedProblem, setExtractedProblem] = usePersistentState<string | null>("math_extractedProblem", null);
  const [context, setContext] = usePersistentState("math_context", "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const saveToHistory = async () => {
    if (!user || !solution) return;
    setIsSaving(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.from("explore_history").insert({
        user_id: user.id,
        type: "math_solver",
        topic: extractedProblem || problem || "Math Problem",
        data: { solution, finalAnswer, extractedProblem, context }
      });
      if (error) throw error;
      setHasSaved(true);
    } catch (e) {
      console.error("Error saving math solver history:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImageBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSolve = async () => {
    if (!problem.trim() && !imageBase64) return;
    if (!canAfford(2000, "Apollo V4 Flash")) {
      alert("Insufficient credits.");
      return;
    }

    setIsSolving(true);
    setSolution(null);
    setFinalAnswer(null);
    setExtractedProblem(null);
    setHasSaved(false);
    
    try {
      const res = await fetch("/api/math-solver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, imageBase64, context })
      });
      const data = await res.json();
      
      if (data.status === "success") {
        setSolution(data.solution);
        setFinalAnswer(data.finalAnswer);
        setExtractedProblem(data.extractedProblem);
        
        // Deduct DeepSeek usage
        if (data.usage?.deepseek) {
          deductCredits(data.usage.deepseek.inputTokens ?? data.usage.deepseek.promptTokens, data.usage.deepseek.outputTokens ?? data.usage.deepseek.completionTokens, "Apollo V4 Flash");
        }
        // Deduct Gemini usage if image was used
        if (data.usage?.gemini) {
          deductCredits(data.usage.gemini.inputTokens ?? data.usage.gemini.promptTokens, data.usage.gemini.outputTokens ?? data.usage.gemini.completionTokens, "Bastion 3.5 Flash");
        }
      } else {
        alert(data.message || "Failed to solve problem");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while solving.");
    } finally {
      setIsSolving(false);
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
            <h1 className="page-title">Math Step-by-Step Solver</h1>
          </div>
        </div>
        {solution && (
          <Button variant="outline" size="sm" className="gap-2" onClick={saveToHistory} disabled={isSaving || hasSaved}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Save className="w-4 h-4" />}
            {hasSaved ? "Saved to History" : "Save Solution"}
          </Button>
        )}
      </div>

      <ProGate featureName="Math Step-by-Step Solver">
      <div className="p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">What math problem do you need help with?</label>
          <div className="relative">
            <textarea
              className="w-full rounded-xl border border-border bg-transparent p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none min-h-[120px]"
              placeholder="e.g. Solve for x: 2x^2 + 5x - 3 = 0, or paste a word problem..."
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Type of calculation & additional context (Optional)</label>
          <div className="relative">
            <input
              type="text"
              className="w-full rounded-xl border border-border bg-transparent p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              placeholder="e.g. Algebra, Calculus, 'Use the quadratic formula'"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
        </div>
        
        {imageBase64 ? (
          <div className="relative inline-block border border-border rounded-xl p-2 bg-muted/20">
            <img src={imageBase64} alt="Math problem" className="h-32 object-contain rounded-lg" />
            <button 
              onClick={() => setImageBase64(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-4 rounded-xl border border-border border-dashed bg-muted/20 justify-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Upload an image of your problem (Uses Gemini Flash)</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageUpload}
            />
          </div>
        )}

        <Button className="w-full h-14 text-lg gap-2" onClick={handleSolve} disabled={(!problem.trim() && !imageBase64) || isSolving}>
          {isSolving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Solving...</>
          ) : (
            <><Brain className="w-5 h-5" /> Solve Step-by-Step</>
          )}
        </Button>
      </div>

      {isSolving && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <Brain className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold">Breaking down the problem...</h2>
          <p className="text-muted-foreground">Analyzing equations and calculating steps.</p>
        </div>
      )}

      {solution && !isSolving && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold font-serif text-foreground">Step-by-Step Solution</h2>
            </div>

            {extractedProblem && (
              <div className="p-4 rounded-xl border border-border bg-muted/30 text-sm mb-6">
                <span className="font-bold uppercase tracking-wider text-xs text-muted-foreground mb-1 block">Extracted from image:</span>
                <p className="font-mono">{extractedProblem}</p>
              </div>
            )}
            
            {solution.map((step, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {step.step}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap font-mono text-sm bg-muted/30 p-3 rounded-lg border border-border/50">{step.content}</p>
                </div>
              </div>
            ))}
            
            {finalAnswer && (
              <div className="p-6 rounded-2xl border-2 border-primary bg-primary/5 shadow-sm mt-8 flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary uppercase tracking-wider mb-1">Final Answer</h3>
                  <p className="text-foreground font-mono text-xl">{finalAnswer}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </ProGate>
    </div>
  );
}
