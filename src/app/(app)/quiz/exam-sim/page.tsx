"use client";

import { useState, useEffect } from "react";
import { Clock, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

export default function ExamSimPage() {
  const { canAfford, deductCredits, isLoaded } = useSubscription();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("A-Level");
  const [timeLimit, setTimeLimit] = useState(10); // minutes
  
  const [examState, setExamState] = useState<"setup" | "generating" | "taking" | "grading" | "results">("setup");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<{marks: number, feedback: string}[]>([]);
  
  const [timeLeft, setTimeLeft] = useState(0);

  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const saveToHistory = async () => {
    if (!user || questions.length === 0) return;
    setIsSaving(true);
    try {
      const scorePct = Math.round((results.reduce((acc, curr) => acc + curr.marks, 0) / (questions.length * 10)) * 100) || 0;
      const { error } = await supabase.from("quiz_history").insert({
        user_id: user.id,
        topic: topic || "Exam Simulator",
        questions: questions.map((q, i) => ({
          question: q,
          user_answer: answers[i] || "Skipped",
          grading: {
            marks_awarded: results[i].marks,
            marks_available: 10,
            feedback: results[i].feedback,
            correct: results[i].marks >= 5
          }
        })),
        score: scorePct
      });
      if (error) throw error;
      setHasSaved(true);
    } catch (e) {
      console.error("Error saving exam history:", e);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (examState === "taking" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (examState === "taking" && timeLeft === 0) {
      handleSubmit();
    }
  }, [examState, timeLeft]);

  const handleStart = async () => {
    if (!topic.trim()) return;
    if (!canAfford(1000, "Apollo V4 Flash")) {
      alert("Insufficient credits.");
      return;
    }

    setExamState("generating");
    try {
      const res = await fetch("/api/exam-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_questions", topic, difficulty })
      });
      const data = await res.json();
      if (data.status === "success") {
        setQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(""));
        setTimeLeft(timeLimit * 60);
        setExamState("taking");
        if (data.usage) deductCredits(data.usage.promptTokens, data.usage.completionTokens, "Apollo V4 Flash");
      } else {
        alert("Failed to generate exam.");
        setExamState("setup");
      }
    } catch (e) {
      console.error(e);
      setExamState("setup");
    }
  };

  const handleSubmit = async () => {
    setExamState("grading");
    try {
      const res = await fetch("/api/exam-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grade_answers", topic, difficulty, questions, answers })
      });
      const data = await res.json();
      if (data.status === "success") {
        setResults(data.results);
        setExamState("results");
        if (data.usage) deductCredits(data.usage.promptTokens, data.usage.completionTokens, "Apollo V4 Flash");
      } else {
        alert("Grading failed.");
        setExamState("setup");
      }
    } catch (e) {
      console.error(e);
      setExamState("setup");
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quiz">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <p className="label-title">Study Tools</p>
            <h1 className="page-title">Quiz Maker</h1>
          </div>
        </div>
        {examState === "taking" && (
          <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-2 rounded-xl border border-red-500/20 font-bold tabular-nums tracking-wider text-xl shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <Clock className="w-5 h-5" />
            {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:{(timeLeft % 60).toString().padStart(2, "0")}
          </div>
        )}
      </div>

      {examState === "setup" && (
        <div className="flex p-1 bg-secondary rounded-xl">
          <Link href="/quiz" className="flex-1 py-2 text-sm font-semibold rounded-lg text-muted-foreground hover:text-foreground text-center">
            Standard Quiz
          </Link>
          <button className="flex-1 py-2 text-sm font-semibold rounded-lg bg-background text-foreground shadow-sm">
            Exam Simulator
          </button>
        </div>
      )}

      {examState === "setup" && (
        <div className="p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Exam Topic</label>
            <input
              type="text"
              className="w-full rounded-xl border border-border bg-transparent px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="e.g. Thermodynamics, WW2 History..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Difficulty</label>
              <select 
                className="w-full rounded-xl border border-border bg-card px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option>GCSE</option>
                <option>A-Level</option>
                <option>University Level</option>
                <option>Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Time Limit (Minutes)</label>
              <select 
                className="w-full rounded-xl border border-border bg-card px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
              >
                <option value={5}>5 Minutes (Blitz)</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
              </select>
            </div>
          </div>
          <Button className="w-full gap-2" size="lg" onClick={handleStart} disabled={!topic.trim()}>
            <AlertTriangle className="w-4 h-4" /> Start Strict Exam
          </Button>
        </div>
      )}

      {examState === "generating" && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <h2 className="text-xl font-bold">Generating Curve-ball Questions...</h2>
          <p className="text-muted-foreground">Get ready. The timer will start immediately.</p>
        </div>
      )}

      {examState === "taking" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-amber-500/10 text-amber-600 p-4 rounded-xl text-sm font-medium border border-amber-500/20 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Do not leave this page. Your answers will be automatically submitted when the timer hits zero.
          </div>
          
          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={i} className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                <h3 className="font-bold text-lg leading-relaxed"><span className="text-muted-foreground mr-2">Q{i+1}.</span>{q}</h3>
                <textarea
                  className="w-full rounded-xl border border-border bg-transparent px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none min-h-[150px]"
                  placeholder="Type your answer here..."
                  value={answers[i]}
                  onChange={(e) => {
                    const newAns = [...answers];
                    newAns[i] = e.target.value;
                    setAnswers(newAns);
                  }}
                />
              </div>
            ))}
          </div>

          <Button size="lg" className="w-full" onClick={handleSubmit}>
            Submit Answers Early
          </Button>
        </div>
      )}

      {examState === "grading" && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <h2 className="text-xl font-bold">Grading your answers...</h2>
          <p className="text-muted-foreground">The AI is brutally evaluating your logic.</p>
        </div>
      )}

      {examState === "results" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Exam Results</h2>
            <p className="text-xl font-medium text-muted-foreground">
              Total Score: {results.reduce((acc, curr) => acc + curr.marks, 0)} / {questions.length * 10}
            </p>
          </div>

          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={i} className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-bold text-lg leading-relaxed"><span className="text-muted-foreground mr-2">Q{i+1}.</span>{q}</h3>
                  <div className={cn("px-3 py-1 rounded-full text-sm font-bold shrink-0", results[i].marks >= 7 ? "bg-emerald-500/10 text-emerald-500" : results[i].marks >= 4 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500")}>
                    {results[i].marks} / 10
                  </div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-xl text-sm italic border border-border/50">
                  <span className="block not-italic font-semibold text-xs uppercase text-muted-foreground mb-1">Your Answer:</span>
                  {answers[i] || "Skipped."}
                </div>

                <div className={cn("p-4 rounded-xl text-sm border", results[i].marks >= 7 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-100" : "bg-red-500/5 border-red-500/20 text-red-900 dark:text-red-100")}>
                  <span className="block font-semibold text-xs uppercase opacity-70 mb-1">Examiner Feedback:</span>
                  <p className="leading-relaxed whitespace-pre-wrap">{results[i].feedback}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-8">
            <Button size="lg" className="w-full flex-1" onClick={() => { setExamState("setup"); setHasSaved(false); }} variant="outline">
              Take Another Exam
            </Button>
            <Button 
              className="w-full flex-1 gap-2" 
              size="lg" 
              onClick={saveToHistory}
              disabled={isSaving || hasSaved}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {hasSaved ? "Saved to History" : "Save to History"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
