"use client";

import React, { useState, useEffect, memo } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { Brain, Loader2, ArrowLeft, CheckCircle2, Save, Sparkles, Sigma, PenTool, BookOpenCheck, Upload, ArrowRight, Target, Clock, AlertTriangle } from "lucide-react";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useUser } from "@clerk/nextjs";

import ReactMarkdown from "react-markdown";
import { insertHistoryAction } from "@/actions/supabase";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { value?: string, onInput?: (e: any) => void };
    }
  }
}

import { MemoizedQuestionText } from "@/components/memoized-question-text";

export default function MathSolverPage() {
  const { openUpgradeModal } = useUpgradeModal();
  const { canAfford, deductCredits, heavy, judge, assistant, grading } = useSubscription();
  const [topic, setTopic] = usePersistentState("math_topic", "");
  const [difficulty, setDifficulty] = usePersistentState("math_diff", "Intermediate");
  const [questionType, setQuestionType] = usePersistentState("math_exam_type", "AQA Based Sim");
  const [year, setYear] = usePersistentState("math_year", "GCSE");
  const [testSize, setTestSize] = usePersistentState("math_size", "Medium");
  const [timeLeft, setTimeLeft] = usePersistentState<number | null>("math_time", null);
  const isAQA = questionType === "AQA Based Sim";
  const [aqaStatus, setAqaStatus] = useState<"checking" | "found" | "not_found" | null>(null);

  useEffect(() => {
    if (!isAQA || !topic.trim()) {
      setAqaStatus(null);
      return;
    }

    setAqaStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/search-aqa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: topic, subject: "Maths" })
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
  }, [topic, isAQA]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("topic");
      if (t) setTopic(t);
    }
  }, []);


  const [role, setRole, roleLoaded] = usePersistentState<"practice" | "grading" | null>("math_role", null);
  const [examState, setExamState, examStateLoaded] = usePersistentState<"setup" | "generating" | "taking" | "grading" | "results" | "forfeited">("math_examstate", "setup");
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (examState === "taking" && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (examState === "taking" && timeLeft === 0) {
      handleSubmit(); // Auto-submit when time is up
    }
    return () => clearInterval(timer);
  }, [examState, timeLeft]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.hidden && examState === "taking") {
        timeoutId = setTimeout(() => setExamState("forfeited"), 10000);
      } else {
        clearTimeout(timeoutId);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [examState, setExamState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Grading Mode State
  const [gradingImage, setGradingImage] = useState<string | null>(null);
  const [gradingQuestion, setGradingQuestion] = useState("");
  const [gradingFeedback, setGradingFeedback] = useState<any>(null);
  
  const handleStartOver = () => {
    setRole(null);
    setExamState("setup");
    setQuestions([]);
    setAnswers([]);
    setResults([]);
    setHasSaved(false);
    setGradingImage(null);
    setGradingQuestion("");
    setGradingFeedback(null);
  };
  const [questions, setQuestions] = usePersistentState<{text: string, marks: number, parts?: string[] | null}[] | any[]>("math_questions", []);
  const [answers, setAnswers] = usePersistentState<any[]>("math_answers", []);
  const [results, setResults] = usePersistentState<{marks: number, feedback: string, max_marks?: number}[]>("math_results", []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ((window as any).mathVirtualKeyboard) {
        (window as any).mathVirtualKeyboard.layouts = ["default"];
      }
    }
  }, [examState, questions]);
  
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = usePersistentState("math_saved", false);

  const saveToHistory = async (latestResults: any[] = results) => {
    if (!user || questions.length === 0 || latestResults.length === 0) return;
    setIsSaving(true);
    try {
      const scorePct = Math.round((latestResults.reduce((acc, curr) => acc + curr.marks, 0) / (latestResults.reduce((acc, curr) => acc + (curr.max_marks || 10), 0) || 1)) * 100) || 0;
      /* Removed history save per user request
      await insertHistoryAction("quiz_history", {
        user_id: user.id,
        topic: `Maths: ${topic || "Mixed"}`,
        questions: questions.map((q, i) => {
          const maxMarks = latestResults[i].max_marks || 10;
          return {
            question: typeof q === "string" ? q : q.text,
            user_answer: Array.isArray(answers[i]) ? answers[i].flat(Infinity).filter(Boolean).join(" | ") || "Skipped" : (answers[i] || "Skipped"),
            grading: {
              marks_awarded: latestResults[i].marks,
              marks_available: maxMarks,
              feedback: latestResults[i].feedback,
              correct: latestResults[i].marks >= (maxMarks / 2)
            }
          };
        }),
        score: scorePct
      });
      */
      setHasSaved(true);
    } catch (e) {
      console.error("Error saving math history:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart = async () => {
    if (!topic.trim()) return;
    if (!canAfford(1000, "Deepseek-V4-Flash")) {
      openUpgradeModal("Insufficient credits.", "Upgrade Plan", "/subscriptions");
      return;
    }

    if (isAQA && year !== "KS3") {
      setExamState("generating");
      try {
        const checkRes = await fetch("/api/check-aqa-topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, subject: "Maths" })
        });
        const checkData = await checkRes.json();
        if (checkData.status === "error") {
          setExamState("setup");
          alert("Error verifying syllabus: " + checkData.message);
          return;
        }
        if (!checkData.exists) {
          setExamState("setup");
          alert("This topic does not exist in the AQA syllabus database. Please try a different topic.");
          return;
        }
      } catch (e: any) {
        setExamState("setup");
        alert("Failed to connect to syllabus database: " + e.message);
        console.error("Failed to check AQA topic", e);
        return;
      }
    }

    setExamState("generating");
    try {
      const body = { action: "generate_questions", topic, difficulty, questionType, isAQA: year !== "KS3", testSize, year, heavyModel: heavy, judgeModel: grading };
      const res = await fetch("/api/math-solver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.status === "success") {
        // Ensure questions are strings in case LLM returned objects
        const parsedQuestions = data.questions.map((q: any) => {
          let textStr = "";
          if (typeof q === "string") textStr = q;
          else if (typeof q.question === "string") textStr = q.question;
          else if (typeof q.text === "string") textStr = q.text;
          else textStr = JSON.stringify(q);

          // Force newlines before part letters/roman numerals
          textStr = textStr.replace(/([^\n])\s*(\([a-e]\)|[a-e]\)|\([ivx]+\)|[ivx]+\))\s+/gi, '$1\n\n$2 ');
          
          const partsMatch = [...textStr.matchAll(/(?:\n|^)\s*(\([a-e]\)|[a-e]\)|\([ivx]+\)|[ivx]+\))\s+/gi)];
          const parts = partsMatch.map(m => m[1].replace(/[()\s]/g, '').toUpperCase());

          return {
            text: textStr,
            marks: typeof q === "string" ? 3 : (q.marks || 3),
            parts: parts.length > 1 ? parts : null
          };
        });
        setQuestions(parsedQuestions);
        setAnswers(parsedQuestions.map((q: any) => {
          const marks = q.marks || 3;
          if (q.parts && q.parts.length > 1) {
            // Multi-part question: one box per part, but last part gets 2 boxes
            return q.parts.map((_: any, i: number) => i === q.parts!.length - 1 ? ["", ""] : [""]);
          } else if (marks <= 1) {
            // 1 mark: single box
            return [[""]];
          } else if (marks <= 3) {
            // 3 marks: 2 working steps + 1 final answer
            return [["", "", ""]];
          } else {
            // 5+ marks (no explicit parts)
            const partCount = marks;
            return Array.from({ length: partCount }, (_, i) => i === partCount - 1 ? ["", ""] : [""]);
          }
        }));
        // Set Timer
        const timeLimit = testSize === "Small" ? 15 : testSize === "Medium" ? 30 : testSize === "Big" ? 45 : 60;
        setTimeLeft(timeLimit * 60);

        setExamState("taking");
        if (data.usage) deductCredits(data.usage.inputTokens ?? data.usage.promptTokens, data.usage.outputTokens ?? data.usage.completionTokens, heavy);
      } else {
        alert("Failed to generate math problems.");
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
      const res = await fetch("/api/math-solver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "grade_answers", 
          topic, 
          difficulty, 
          questions: questions.map((q: any) => typeof q === "string" ? q : q.text),
          marks: questions.map((q: any) => typeof q === "string" ? 3 : (q.marks || 3)),
          answers: answers.map((ans, qIdx) => {
            if (Array.isArray(ans) && Array.isArray(ans[0])) {
              return ans.map((partSteps: string[], pIdx: number) => {
                const pName = questions[qIdx]?.parts?.[pIdx] || String.fromCharCode(65 + pIdx);
                return `Part ${pName}:\n` + partSteps.filter(s => typeof s === "string" && s.trim() !== "").join("\n");
              }).join("\n\n");
            } else if (Array.isArray(ans)) {
              return ans.filter((s: string) => typeof s === "string" && s.trim() !== "").join("\n");
            }
            return (ans || "").trim();
          }),
          judgeModel: grading
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setResults(data.results);
        setExamState("results");
        saveToHistory(data.results); // Automatically save to history
        if (data.usage) deductCredits(data.usage.inputTokens ?? data.usage.promptTokens, data.usage.outputTokens ?? data.usage.completionTokens, grading);
      } else {
        alert("Failed to grade.");
        setExamState("taking");
      }
    } catch (e) {
      console.error(e);
      setExamState("taking");
    }
  };

  const handleGrade = async () => {
    if (!canAfford(3000, "Gemini 3.6 Flash")) {
      openUpgradeModal("Insufficient credits to grade this math problem.", "Upgrade Plan", "/subscriptions");
      return;
    }
    setExamState("grading");
    try {
      let extractedText = "";
      
      // Step 1: OCR the image
      const ocrRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ 
            role: "user", 
            content: [
              { type: "text", text: "Extract all the mathematical working out and text from this image exactly as written. Do not add any commentary." },
              { type: "image", image: gradingImage }
            ] 
          }],
          model: "Gemini 3.6 Flash",
        }),
      });
      const ocrData = await ocrRes.json();
      if (ocrData.usage) deductCredits(ocrData.usage.inputTokens, ocrData.usage.outputTokens, "Gemini 3.6 Flash");
      if (ocrData.text) extractedText = ocrData.text;

      // Step 2: Grade the working out
      const gradingSystemPrompt = `You are an expert Math teacher grading a student's handwritten working out for the following problem:
Original Question: ${gradingQuestion}

The student's transcribed working out is below:
${extractedText}

Evaluate their working step-by-step. Identify any mistakes.
You MUST reply with ONLY a raw JSON object (no markdown, no backticks). Format:
{
  "marks": <integer out of 10>,
  "maxMarks": 10,
  "correctWorking": "<Show the ideal step-by-step working to solve the problem>",
  "feedback": "<Point out exactly where they went wrong, or praise their method if correct>"
}`;

      const gradeRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: gradingSystemPrompt }],
          model: grading,
        }),
      });
      const gradeData = await gradeRes.json();
      if (gradeData.usage) deductCredits(gradeData.usage.inputTokens, gradeData.usage.outputTokens, grading);
      
      const parsed = JSON.parse(gradeData.text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());
      setGradingFeedback(parsed);
      setExamState("results");
    } catch (e) {
      console.error(e);
      alert("Error grading.");
      setExamState("setup");
    }
  };

  if (!roleLoaded || !examStateLoaded) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto pb-12">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title m-0 flex items-center gap-2"><Sigma className="w-8 h-8 text-primary" /> Maths</h1>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1">AQA Syllabus</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            How will you be using Maths today?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
          <button 
            onClick={() => setRole("practice")}
            className="flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group relative overflow-hidden shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-primary/20">
              <PenTool className="w-7 h-7" />
            </div>
            <p className="section-title mb-2 relative z-10">Practice problems</p>
            <p className="text-sm text-muted-foreground relative z-10">
              Generate custom math problems and practice solving them.
            </p>
          </button>

          <button 
            onClick={() => setRole("grading")}
            className="flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group relative overflow-hidden shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-primary/20">
              <BookOpenCheck className="w-7 h-7" />
            </div>
            <p className="section-title mb-2 relative z-10">Grade my working out</p>
            <p className="text-sm text-muted-foreground relative z-10">
              Upload a picture of your handwritten working out for step-by-step AI feedback.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (role === "grading") {
    return (
      <div className="max-w-4xl mx-auto pb-12 animate-in fade-in">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title m-0 flex items-center gap-2"><Sigma className="w-8 h-8 text-primary" /> Maths</h1>
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1">AQA Syllabus</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Upload your working out for detailed feedback.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setRole("practice")} className="gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              Switch to Practice
            </Button>
            <Button variant="ghost" size="sm" onClick={handleStartOver} className="text-muted-foreground hover:text-foreground">
              Start Over
            </Button>
          </div>
        </div>

        {examState === "setup" && (
          <div className="mt-8 space-y-8 animate-in slide-in-from-bottom-4 fade-in">
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Original Question</h3>
              <textarea
                className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-inner min-h-[100px] resize-y"
                placeholder="e.g. Solve 2x^2 + 5x - 3 = 0"
                value={gradingQuestion}
                onChange={(e) => setGradingQuestion(e.target.value)}
              />
              {gradingQuestion.trim() && (
                <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Question Preview</h4>
                  <MemoizedQuestionText text={gradingQuestion} id="grading-question-preview" />
                </div>
              )}

              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Working Out</h3>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center flex flex-col items-center justify-center hover:bg-muted/50 transition-colors">
                {gradingImage ? (
                  <img src={gradingImage} alt="Uploaded working out" className="max-h-48 object-contain rounded-lg mb-4 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-4">
                    <Upload className="w-5 h-5" />
                  </div>
                )}
                <p className="text-sm font-medium text-foreground mb-4">
                  {gradingImage ? "Image uploaded" : "Upload an image of your handwritten working out"}
                </p>
                <input 
                  type="file" 
                  id="gradingImageUpload" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => setGradingImage(e.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} 
                />
                <Button variant="outline" size="sm" onClick={() => document.getElementById('gradingImageUpload')?.click()}>
                  {gradingImage ? "Change Image" : "Select Image"}
                </Button>
              </div>
            </div>
            
            <Button size="lg" className="w-full" disabled={!gradingImage || !gradingQuestion.trim()} onClick={handleGrade}>
              Grade My Working Out
            </Button>
          </div>
        )}
        
        {examState === "grading" && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <h2 className="text-xl font-bold">Grading your working out...</h2>
            <p className="text-muted-foreground">The AI is analyzing your steps line-by-line.</p>
          </div>
        )}
        
        {examState === "results" && gradingFeedback && (
          <div className="mt-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold">Grading Complete</h2>
            
            <div className="p-8 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-lg shadow-xl space-y-6">
               <div className="flex justify-between items-start">
                 <h3 className="font-bold text-xl leading-relaxed">Evaluation</h3>
                 <div className={cn("px-4 py-2 rounded-2xl text-lg font-bold shrink-0 shadow-inner backdrop-blur-md border", gradingFeedback.marks >= (gradingFeedback.maxMarks * 0.7) ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : gradingFeedback.marks >= (gradingFeedback.maxMarks * 0.4) ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                    {gradingFeedback.marks} / {gradingFeedback.maxMarks}
                 </div>
               </div>
               
               <div className="bg-muted/30 p-5 rounded-2xl text-[15px] italic border border-border/50 shadow-inner">
                  <span className="block not-italic font-semibold text-xs uppercase text-muted-foreground mb-2 tracking-wider">Correct Working Out:</span>
                  <p className="leading-relaxed whitespace-pre-wrap">{gradingFeedback.correctWorking}</p>
               </div>

               <div className={cn("p-6 rounded-2xl text-[15px] border shadow-sm", gradingFeedback.marks >= (gradingFeedback.maxMarks * 0.7) ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-100" : "bg-red-500/5 border-red-500/20 text-red-900 dark:text-red-100")}>
                  <span className="block font-semibold text-xs uppercase opacity-70 mb-2 tracking-wider">Feedback & Corrections:</span>
                  <div className="leading-relaxed [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>li]:mb-1 [&>strong]:font-bold [&>strong]:text-current">
                     <ReactMarkdown>{gradingFeedback.feedback}</ReactMarkdown>
                  </div>
               </div>
            </div>

            <Button onClick={handleStartOver} size="lg" className="w-full">Grade Another</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title m-0 flex items-center gap-2"><Sigma className="w-8 h-8 text-primary" /> Maths</h1>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1">AQA Syllabus</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Generate custom math problems and practice solving them.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {examState !== "taking" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setRole("grading")} className="gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                Switch to Grading
              </Button>
              <Button variant="ghost" size="sm" onClick={handleStartOver} className="text-muted-foreground hover:text-foreground">
                Start Over
              </Button>
            </>
          )}
        </div>
      </div>

      {examState === "setup" && (
        <div className="p-8 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl space-y-8 mt-8">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 uppercase tracking-wider opacity-70">
              Math Topic
            </label>
            <input
              type="text"
              className="w-full rounded-2xl border border-border bg-background/50 backdrop-blur-sm px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-inner"
              placeholder="e.g. Circle Theorems, Integration..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            {isAQA && year !== "KS3" && aqaStatus === "not_found" && (
              <div className="bg-red-500/20 px-4 py-2 mt-3 rounded-lg text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2 border border-red-500/20">
                <Target className="w-4 h-4" />
                Not in official AQA database
              </div>
            )}
            {isAQA && year !== "KS3" && aqaStatus === "found" && (
              <div className="bg-emerald-500/20 px-4 py-2 mt-3 rounded-lg text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                AQA Database Clearance: Found
              </div>
            )}
            {year === "KS3" && (
              <div className="bg-amber-500/20 px-4 py-2 mt-3 rounded-lg text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
                * KS3 is not strictly AQA-based.
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Exercise Parameters</h3>
            <div className="grid md:grid-cols-2 gap-6">

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Year Group</label>
                <select 
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  <option>KS3</option>
                  <option>GCSE</option>
                  <option>A-Level</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Difficulty</label>
                <select 
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option>Foundation</option>
                  <option>Higher</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Test Size</label>
                <select 
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={testSize}
                  onChange={(e) => setTestSize(e.target.value)}
                >
                  <option value="Small">Small (15 mins)</option>
                  <option value="Medium">Medium (30 mins)</option>
                  <option value="Big">Big (45 mins)</option>
                  <option value="Large">Large (60 mins)</option>
                </select>
              </div>
            </div>
          </div>
          
          <Button className="w-full gap-2 py-6 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all rounded-2xl mt-4" size="lg" onClick={handleStart} disabled={!topic.trim()}>
            <Sparkles className="w-5 h-5" /> Generate Math Practice
          </Button>
        </div>
      )}

      {examState === "generating" && (
        <div className="py-32 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
            <Sigma className="w-16 h-16 text-primary animate-bounce relative z-10" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-foreground">Generating Math Problems...</h2>
        </div>
      )}

      {examState === "taking" && (
        <div className="space-y-8 mt-8 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-foreground">Exam: {topic || "Mixed"} ({difficulty})</h2>
                  <div className={cn("px-4 py-2 rounded-full font-mono font-bold border shadow-sm flex items-center gap-2", timeLeft && timeLeft < 300 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-primary/10 text-primary border-primary/20")}>
                    <Clock className="w-4 h-4" />
                    {timeLeft !== null ? formatTime(timeLeft) : "Untimed"}
                  </div>
                </div>
              </div>
          <div className="p-8 rounded-3xl border border-border bg-card/50 shadow-xl relative overflow-hidden">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Sigma className="w-6 h-6 text-primary" /> Practice Session</h2>
             <div id="math-questions-container" className="space-y-10">
               {questions.map((q, idx) => (
                 <div key={idx} className="space-y-4">
                   <h3 className="font-semibold text-lg text-foreground flex gap-3 items-start">
                     <span className="shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm border border-primary/20">{idx + 1}</span>
                      <div className="pt-1 flex-1">
                        <MemoizedQuestionText text={typeof q === "string" ? q : q.text} id={`math-q-${idx}`} />
                        {q.marks && <div className="text-muted-foreground font-normal text-sm mt-2">[{q.marks} marks]</div>}
                      </div>
                   </h3>
                    <div className="pl-11 space-y-8">
                      {(() => {
                        const marks = q.marks || 3;
                        // 5+ marks OR existing parts: render as labeled parts a, b, c...
                        if (marks >= 5 || (q.parts && q.parts.length > 1)) {
                          const partLabels = q.parts && q.parts.length > 1
                            ? q.parts
                            : Array.from({ length: answers[idx]?.length || marks }, (_, i) => String.fromCharCode(97 + i));
                          return (answers[idx] || []).map((partSteps: string[], partIdx: number) => (
                            <div key={partIdx} className="space-y-3 bg-background/30 p-4 rounded-2xl border border-border/40">
                              <div className="font-bold text-sm text-primary uppercase tracking-wider">
                                Part {(partLabels[partIdx] || String.fromCharCode(97 + partIdx)).toUpperCase()}
                              </div>
                              {Array.isArray(partSteps) && partSteps.map((stepVal, stepIdx) => {
                                const isLastPart = partIdx === (answers[idx] || []).length - 1;
                                const isLastStep = stepIdx === partSteps.length - 1;
                                const showAsAnswer = isLastPart && isLastStep;
                                
                                return (
                                <div key={stepIdx} className="space-y-1">
                                  {isLastPart && (
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                      {showAsAnswer ? "Answer" : "Working Out"}
                                    </div>
                                  )}
                                  {/* @ts-ignore */}
                                  <math-field
                                    id={`math-field-${idx}-${partIdx}-${stepIdx}`}
                                    className={cn("w-full rounded-xl border shadow-sm block text-lg p-2 min-h-[70px]",
                                      showAsAnswer ? "border-primary/40 bg-primary/5" : "border-border bg-background"
                                    )}
                                    style={{ '--keyboard-zindex': '100', color: 'var(--foreground)' } as React.CSSProperties}
                                    value={stepVal}
                                    onInput={(e: any) => {
                                      const copy = [...answers];
                                      copy[idx][partIdx][stepIdx] = e.target.value;
                                      setAnswers(copy);
                                    }}
                                  />
                                  <Button variant="outline" size="sm" className="font-bold text-sm px-3 border-border/60 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => {
                                      const fieldId = `math-field-${idx}-${partIdx}-${stepIdx}`;
                                      const field = document.getElementById(fieldId) as any;
                                      if (field) { field.focus(); field.executeCommand(["insert", "\\frac{#@}{#?}"]); }
                                    }}>½ Fraction</Button>
                                </div>
                                );
                              })}
                            </div>
                          ));
                        }
                        // 3 marks: Steps + Answer
                        if (marks <= 3 && marks > 1) {
                          const partSteps: string[] = answers[idx]?.[0] || ["", "", ""];
                          return (
                            <div className="space-y-4">
                              {partSteps.map((stepVal, stepIdx) => (
                                <div key={stepIdx} className="space-y-1">
                                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    {stepIdx === partSteps.length - 1 ? "Answer" : `Step ${stepIdx + 1}`}
                                  </div>
                                  {/* @ts-ignore */}
                                  <math-field
                                    id={`math-field-${idx}-0-${stepIdx}`}
                                    className={cn("w-full rounded-xl border bg-background shadow-sm block text-lg p-2 min-h-[70px]",
                                      stepIdx === partSteps.length - 1 ? "border-primary/40 bg-primary/5" : "border-border"
                                    )}
                                    style={{ '--keyboard-zindex': '100', color: 'var(--foreground)' } as React.CSSProperties}
                                    value={stepVal}
                                    onInput={(e: any) => {
                                      const copy = [...answers];
                                      if (!copy[idx]) copy[idx] = [["", "", ""]];
                                      if (!copy[idx][0]) copy[idx][0] = ["", "", ""];
                                      copy[idx][0][stepIdx] = e.target.value;
                                      setAnswers(copy);
                                    }}
                                  />
                                  <Button variant="outline" size="sm" className="font-bold text-sm px-3 border-border/60 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => {
                                      const fieldId = `math-field-${idx}-0-${stepIdx}`;
                                      const field = document.getElementById(fieldId) as any;
                                      if (field) { field.focus(); field.executeCommand(["insert", "\\frac{#@}{#?}"]); }
                                    }}>½ Fraction</Button>
                                </div>
                              ))}
                              <Button variant="default" size="sm" onClick={() => {
                                const copy = [...answers];
                                if (!copy[idx]) copy[idx] = [["", "", ""]];
                                if (!copy[idx][0]) copy[idx][0] = ["", "", ""];
                                // Insert a new step before the answer box
                                copy[idx][0].splice(copy[idx][0].length - 1, 0, "");
                                setAnswers(copy);
                              }} className="w-full font-bold gap-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20">
                                + Add Next Step
                              </Button>
                            </div>
                          );
                        }
                        // 1 mark: single Answer box
                        const answerVal: string = answers[idx]?.[0]?.[0] || "";
                        return (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Answer</div>
                            {/* @ts-ignore */}
                            <math-field
                              id={`math-field-${idx}-0-0`}
                              className="w-full rounded-xl border border-primary/40 bg-primary/5 shadow-sm block text-lg p-2 min-h-[60px]"
                              style={{ '--keyboard-zindex': '100', color: 'var(--foreground)' } as React.CSSProperties}
                              value={answerVal}
                              onInput={(e: any) => {
                                const copy = [...answers];
                                if (!copy[idx]) copy[idx] = [[""]];
                                if (!copy[idx][0]) copy[idx][0] = [""];
                                copy[idx][0][0] = e.target.value;
                                setAnswers(copy);
                              }}
                            />
                            <Button variant="outline" size="sm" className="font-bold text-sm px-3 border-border/60 hover:bg-primary/10 hover:text-primary mt-1"
                              onClick={() => {
                                const field = document.getElementById(`math-field-${idx}-0-0`) as any;
                                if (field) { field.focus(); field.executeCommand(["insert", "\\frac{#@}{#?}"]); }
                              }}>½ Fraction</Button>
                          </div>
                        );
                      })()}
                    </div>
                 </div>
               ))}
             </div>
          </div>
          <div className="flex justify-end pt-4 pb-20">
            <Button size="lg" className="px-10 py-6 text-lg font-bold shadow-lg" onClick={handleSubmit}>
               Submit for Marking
            </Button>
          </div>
        </div>
      )}

      {examState === "grading" && (
        <div className="py-32 flex flex-col items-center justify-center space-y-6">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <h2 className="text-2xl font-bold font-serif text-foreground text-center">Checking your working out...</h2>
          <p className="text-muted-foreground">The AI examiner is grading your logic step-by-step.</p>
        </div>
      )}

      {examState === "results" && (
        <div className="space-y-8 mt-8 animate-in slide-in-from-bottom-4 pb-20">
          <div className="p-8 rounded-3xl border border-border bg-card/50 shadow-xl overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold font-serif text-foreground flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" /> Math Results
              </h2>
              <div className="text-right">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Score</p>
                <p className="text-4xl font-black text-primary">
                  {Math.round((results.reduce((acc, curr) => acc + curr.marks, 0) / (results.reduce((acc, curr) => acc + (curr.max_marks || 10), 0) || 1)) * 100)}%
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => {
                const marks = results[idx].marks;
                const maxMarks = results[idx].max_marks || 10;
                const pct = maxMarks > 0 ? marks / maxMarks : 0;
                return (
                <div key={idx} className="p-6 rounded-2xl border border-border bg-background/50 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-lg text-foreground flex gap-3 items-start">
                      <span className="shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm border border-primary/20">{idx + 1}</span>
                      <div className="pt-1 flex-1">
                        <div className="prose dark:prose-invert max-w-none prose-p:my-1 prose-p:leading-relaxed">
                          <ReactMarkdown>
                            {typeof q === "string" ? q : q.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </h3>
                    <div className={cn("px-3 py-1.5 rounded-lg font-bold text-sm whitespace-nowrap", pct >= 0.7 ? "bg-emerald-500/10 text-emerald-600" : pct >= 0.4 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600")}>
                      {marks} / {maxMarks} marks
                    </div>
                  </div>
                  <div className="pl-11 grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border/50 bg-card font-mono text-sm whitespace-pre-wrap opacity-70">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground font-sans">Your Working:</p>
                      {(() => {
                        const raw = answers[idx];
                        const flattened = Array.isArray(raw)
                          ? raw.flat(Infinity).map(s => String(s || "")).filter(s => s.trim() !== "")
                          : typeof raw === "string" && raw.trim() !== "" ? [raw] : [];

                        if (flattened.length === 0) return <span className="text-muted-foreground italic">No working provided.</span>;

                        return flattened.map((step: string, i: number) => (
                          <div key={i} className="mb-2 pb-2 border-b border-border/30 last:border-0 last:mb-0 last:pb-0">
                            <span className="text-muted-foreground mr-2">{i + 1}.</span> 
                            <span dangerouslySetInnerHTML={{__html: typeof window !== "undefined" && (window as any).katex ? (window as any).katex.renderToString(step, {throwOnError: false}) : step}} />
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm whitespace-pre-wrap font-medium">
                       <p className="text-xs font-bold uppercase tracking-wider mb-2 text-primary font-sans">Examiner Feedback:</p>
                       <div className="leading-relaxed [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>li]:mb-1 [&>strong]:font-bold [&>strong]:text-current">
                         <MemoizedQuestionText text={results[idx].feedback} id={`math-feedback-${idx}`} />
                       </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>

            <div className="flex justify-end pt-8 mt-8 border-t border-border/50 gap-4">
              <Button variant="outline" size="lg" onClick={() => {
                setExamState("setup");
                setTopic("");
                setQuestions([]);
                setAnswers([]);
                setResults([]);
                setHasSaved(false);
              }}>Start New Practice</Button>
              <Button size="lg" onClick={() => saveToHistory()} disabled={isSaving || hasSaved} className="flex gap-2">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {hasSaved ? "Saved to History" : "Save Results"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {examState === "forfeited" && (
        <div className="flex flex-col items-center text-center max-w-lg mx-auto py-20 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold font-serif mb-4 text-foreground">Exam Forfeited</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            You left the exam tab during a timed session. In a real exam, this is strictly prohibited. Your current session has been terminated.
          </p>
          <Button size="lg" onClick={handleStartOver} className="w-full">
            Return to Setup
          </Button>
        </div>
      )}
    </div>
  );
}
