"use client";

import { useState, useEffect } from "react";
import { Clock, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Save, Target, X, Check } from "lucide-react";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useUser } from "@clerk/nextjs";
import { insertFeatureAction, deleteFeatureAction, fetchFeatureAction, upsertChatAction } from "@/actions/supabase";
import ReactMarkdown from "react-markdown";
import { MemoizedQuestionText } from "@/components/memoized-question-text";

export default function ExamSimPage() {
  const { openUpgradeModal } = useUpgradeModal();
  const { canAfford, deductCredits, isLoaded, heavy, judge, assistant, grading } = useSubscription();
  const [isAQA, setIsAQA] = useState(true);
  const [subject, setSubject] = useState("Biology");
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("GCSE");
  const [difficulty, setDifficulty] = useState("Foundation");
  const [testSize, setTestSize] = useState("Medium");
  const [weakPoints, setWeakPoints] = useState<any[]>([]);
  const [showQuitModal, setShowQuitModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("topic");
      const m = params.get("mode");
      if (t) setTopic(t);
      if (m === "aqa") setIsAQA(true);
      else if (m === "freestyle") setIsAQA(false);
    }
  }, []);

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
          body: JSON.stringify({ query: topic, subject })
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
  }, [topic, subject, isAQA]);
  
  const [examState, setExamState] = useState<"setup" | "generating" | "taking" | "grading" | "results" | "forfeited">("setup");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<{marks: number, feedback: string, max_marks?: number}[]>([]);
  
  const [timeLeft, setTimeLeft] = useState(0);

  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFeatureAction("exam_sims").then((data) => {
        if (data) {
          const wp: any[] = [];
          data.forEach((exam: any) => {
            if (exam.questions) {
              exam.questions.forEach((q: any) => {
                if (q.grading && !q.grading.correct) wp.push({ topic: exam.topic, question: q.question, feedback: q.grading.feedback });
              });
            }
          });
          setWeakPoints(wp);
        }
      });
    }
  }, [user]);

  const saveToHistory = async (latestResults: any[] = results) => {
    if (!user || questions.length === 0 || latestResults.length === 0) return;
    setIsSaving(true);
    try {
      const scorePct = Math.round((latestResults.reduce((acc, curr) => acc + curr.marks, 0) / (latestResults.reduce((acc, curr) => acc + (curr.max_marks || 10), 0) || 1)) * 100) || 0;
      await insertFeatureAction("exam_sims", {
        user_id: user.id,
        topic: topic || "Exam Simulator",
        questions: questions.map((q, i) => {
          const maxMarks = latestResults[i].max_marks || 10;
          const res: any = {
            question: q,
            user_answer: answers[i] || "Skipped",
            grading: {
              marks_awarded: latestResults[i].marks,
              marks_available: maxMarks,
              feedback: latestResults[i].feedback,
              correct: latestResults[i].marks >= (maxMarks / 2)
            }
          };
          if (i === 0) {
            res._quizSettings = { subject, difficulty, testSize, isAQA };
          }
          return res;
        }),
        score: scorePct
      });
      
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
    if (!canAfford(1000, "Deepseek-V4-Flash")) {
      openUpgradeModal("Insufficient credits.", "Upgrade Plan", "/subscriptions");
      return;
    }

    if (isAQA && topic !== "My Past Weak Points") {
      setExamState("generating");
      try {
        const checkRes = await fetch("/api/check-aqa-topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, subject })
        });
        const checkData = await checkRes.json();
        if (!checkData.exists) {
          setExamState("setup");
          alert("This topic does not exist in the AQA syllabus database. Please try a different topic or use Freestyle Mode.");
          return;
        }
      } catch (e) {
        console.error("Failed to check AQA topic", e);
      }
    }

    setExamState("generating");
    try {
      const body: any = { action: "generate_questions", topic, difficulty, isAQA, testSize, subject, year, heavyModel: heavy, judgeModel: grading };
      if (topic === "My Past Weak Points") {
        body.weakPoints = weakPoints.map(wp => `Topic: ${wp.topic}. Q: ${wp.question}. Failed because: ${wp.feedback}`).join("\n");
      }

      const res = await fetch("/api/exam-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.status === "success") {
        const stringifiedQuestions = data.questions.map((q: any) => {
          let str = typeof q === "string" ? q : (q.question ? `${q.question}${q.marks ? ` [${q.marks} marks]` : ''}` : JSON.stringify(q));
          str = str.replace(/([^\n])\s*(\([a-e]\)|[a-e]\)|\([ivx]+\)|[ivx]+\))\s+/gi, '$1\n$2 ');
          return str.trim();
        });
        setQuestions(stringifiedQuestions);
        setAnswers(new Array(stringifiedQuestions.length).fill(""));
        const timeLimit = testSize === "Small" ? 15 : testSize === "Medium" ? 30 : 60;
        setTimeLeft(timeLimit * 60);
        setExamState("taking");
        if (data.usage) deductCredits(data.usage.inputTokens ?? data.usage.promptTokens, data.usage.outputTokens ?? data.usage.completionTokens, heavy);
      } else {
        alert("Exam generation failed: " + (data.message || "Unknown error"));
        setExamState("setup");
      }
    } catch (e: any) {
      alert("Exam generation crashed: " + (e.message || "Network error"));
      setExamState("setup");
    }
  };

  const handleSubmit = async () => {
    setShowQuitModal(false);
    setExamState("grading");
    try {
      const res = await fetch("/api/exam-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grade_answers", topic, difficulty, questions, answers, judgeModel: grading })
      });
      const data = await res.json();
      if (data.status === "success") {
        setResults(data.results);
        setExamState("results");
        saveToHistory(data.results); // Automatically save to history
        if (data.usage) deductCredits(data.usage.inputTokens ?? data.usage.promptTokens, data.usage.outputTokens ?? data.usage.completionTokens, grading);
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
          {examState === "taking" && (
            <Button variant="ghost" size="icon" onClick={() => setShowQuitModal(true)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <p className="label-title">Study Tools</p>
          <div className="flex items-center gap-3">
            <h1 className="page-title m-0">Exam Simulator</h1>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1">AQA Syllabus</span>
          </div>
          </div>
        </div>
        {examState === "taking" && (
          <div className="fixed top-24 right-8 z-50 flex items-center gap-3 bg-background/40 backdrop-blur-xl px-6 py-3 rounded-full border border-border/50 font-bold tabular-nums tracking-widest text-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <Clock className={cn("w-6 h-6", timeLeft < 60 ? "text-red-500 animate-pulse" : "text-primary")} />
            <span className={cn(timeLeft < 60 ? "text-red-500" : "text-foreground")}>
              {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        )}
      </div>


      {examState === "setup" && (
        <div className="p-8 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500"></div>
          
          <div className="flex bg-muted/50 p-1 rounded-2xl border border-border">
            <button 
              className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all", isAQA ? "bg-background shadow-sm text-blue-500" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setIsAQA(true)}
            >
              AQA Standards Mode
            </button>
            <button 
              className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all", !isAQA ? "bg-background shadow-sm text-amber-500" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setIsAQA(false)}
            >
              General / Freestyle Mode
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 uppercase tracking-wider opacity-70">
              Exam Topic
            </label>
            <div className="flex flex-col md:flex-row gap-4">
              {isAQA && (
                <select 
                  className="w-full md:w-1/3 rounded-2xl border border-border bg-background/50 backdrop-blur-sm px-6 py-4 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-inner font-medium text-foreground cursor-pointer"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option>Biology</option>
                  <option>Chemistry</option>
                  <option>Physics</option>
                  <option>Geography</option>
                </select>
              )}
              <input
                type="text"
                className="w-full flex-1 rounded-2xl border border-border bg-background/50 backdrop-blur-sm px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-inner"
                placeholder={isAQA ? "e.g. Cell Division, Poetry..." : "e.g. Thermodynamics..."}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            {isAQA && aqaStatus === "not_found" && (
              <div className="bg-red-500/20 px-4 py-2 mt-3 rounded-lg text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2 border border-red-500/20">
                <Target className="w-4 h-4" />
                Not in official AQA database
              </div>
            )}
            {isAQA && aqaStatus === "found" && (
              <div className="bg-emerald-500/20 px-4 py-2 mt-3 rounded-lg text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                AQA Database Clearance: Found
              </div>
            )}
            {!isAQA && <p className="text-xs text-amber-500 mt-2 font-medium tracking-wide">* Does not follow official AQA standards.</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3 uppercase tracking-wider opacity-70">Year</label>
              <select 
                className="w-full rounded-2xl border border-border bg-background/50 backdrop-blur-sm px-6 py-4 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-inner font-medium text-foreground cursor-pointer"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option>KS3</option>
                <option>GCSE</option>
                <option>A-Level</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3 uppercase tracking-wider opacity-70">Difficulty</label>
              <select 
                className="w-full rounded-2xl border border-border bg-background/50 backdrop-blur-sm px-6 py-4 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-inner font-medium text-foreground cursor-pointer"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option>Foundation</option>
                <option>Higher</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3 uppercase tracking-wider opacity-70">Test Size</label>
              <select 
                className="w-full rounded-2xl border border-border bg-background/50 backdrop-blur-sm px-6 py-4 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-inner font-medium text-foreground cursor-pointer"
                value={testSize}
                onChange={(e) => setTestSize(e.target.value)}
              >
                <option value="Small">Small (15 mins)</option>
                <option value="Medium">Medium (30 mins)</option>
                <option value="Large">Large (60 mins)</option>
              </select>
            </div>
          </div>
          <Button className="w-full gap-2 py-6 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all rounded-2xl mt-4" size="lg" onClick={handleStart} disabled={!topic.trim()}>
            <AlertTriangle className="w-5 h-5" /> Start Strict Exam
          </Button>

          {weakPoints.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border/50">
               <h3 className="text-lg font-bold text-foreground mb-4 font-serif flex items-center gap-2">
                 <AlertTriangle className="w-5 h-5 text-red-500" />
                 Target Weak Points
               </h3>
               <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                 We've analyzed your past exam history and identified <strong className="text-foreground">{weakPoints.length}</strong> concepts you previously struggled with. 
                 Taking a targeted exam will force the AI to grill you exclusively on these exact weak points.
               </p>
               <Link href="/weak-areas" className="block w-full">
                 <Button variant="secondary" className="w-full gap-2 py-5 font-bold rounded-2xl">
                   Go to Weak Areas
                 </Button>
               </Link>
            </div>
          )}
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
            {questions.map((q, i) => {
              const mcqRegex = /(^\s*[A-Da-d][\)\.])|(^\s*\|\s*[A-Da-d]\s*\|)/m;
              const isMCQ = mcqRegex.test(q);

              return (
              <div key={i} className="p-8 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-lg shadow-xl space-y-6 relative group hover:border-primary/30 transition-colors">
                <div className="absolute -left-px top-8 w-2 h-12 bg-primary rounded-r-full shadow-[0_0_15px_rgba(var(--primary),0.5)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="font-bold text-xl leading-relaxed pl-2 font-serif flex gap-3">
                  <span className="text-primary text-2xl font-sans opacity-50 shrink-0">Q{i+1}</span>
                  <MemoizedQuestionText text={q} id={`exam-sim-test-q-${i}`} />
                </div>
                
                {isMCQ ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {["A", "B", "C", "D"].map((letter) => {
                      const isSelected = answers[i] === letter;
                      return (
                        <button
                          key={letter}
                          onClick={() => {
                            const newAns = [...answers];
                            newAns[i] = letter;
                            setAnswers(newAns);
                          }}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 font-bold text-lg",
                            isSelected 
                              ? "bg-primary/10 border-primary text-foreground shadow-sm" 
                              : "bg-background/40 border-border/50 hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-background" />}
                          </div>
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    className="w-full rounded-2xl border border-border/50 bg-background/40 backdrop-blur-md px-6 py-5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none min-h-[180px] text-base leading-relaxed shadow-inner"
                    placeholder="Draft your brilliant response here..."
                    value={answers[i]}
                    onChange={(e) => {
                      const newAns = [...answers];
                      newAns[i] = e.target.value;
                      setAnswers(newAns);
                    }}
                  />
                )}
              </div>
            )})}
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
              Total Score: {results.reduce((acc, curr) => acc + curr.marks, 0)} / {results.reduce((acc, curr) => acc + (curr.max_marks || 10), 0)}
            </p>
          </div>

          <div className="space-y-6">
            {questions.map((q, i) => {
              const marks = results[i].marks;
              const maxMarks = results[i].max_marks || 10;
              const pct = maxMarks > 0 ? marks / maxMarks : 0;
              return (
              <div key={i} className="p-8 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-lg shadow-xl space-y-6">
                <div className="flex justify-between items-start gap-6">
                  <div className="font-bold text-xl leading-relaxed font-serif flex gap-3">
                    <span className="text-primary text-2xl font-sans opacity-50 shrink-0">Q{i+1}</span>
                    <MemoizedQuestionText text={q} id={`exam-sim-res-q-${i}`} />
                  </div>
                  <div className={cn("px-4 py-2 rounded-2xl text-lg font-bold shrink-0 shadow-inner backdrop-blur-md border", pct >= 0.7 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : pct >= 0.4 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                    {marks} / {maxMarks}
                  </div>
                </div>
                
                <div className="bg-muted/30 p-5 rounded-2xl text-[15px] italic border border-border/50 shadow-inner">
                  <span className="block not-italic font-semibold text-xs uppercase text-muted-foreground mb-2 tracking-wider">Your Answer:</span>
                  {answers[i] || "Skipped."}
                </div>

                <div className={cn("p-6 rounded-2xl text-[15px] border shadow-sm", pct >= 0.7 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-100" : "bg-red-500/5 border-red-500/20 text-red-900 dark:text-red-100")}>
                  <span className="block font-semibold text-xs uppercase opacity-70 mb-2 tracking-wider">Examiner Feedback:</span>
                  <div className="leading-relaxed [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>li]:mb-1 [&>strong]:font-bold [&>strong]:text-current">
                    <ReactMarkdown>{results[i].feedback}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )})}
          </div>

          <div className="flex gap-4 mt-8">
            <Button size="lg" className="w-full flex-1" onClick={() => { setExamState("setup"); setHasSaved(false); }} variant="outline">
              Take Another Exam
            </Button>
            <Button 
              className="w-full flex-1 gap-2" 
              size="lg" 
              onClick={() => saveToHistory()}
              disabled={isSaving || hasSaved}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {hasSaved ? "Saved to History" : "Save to History"}
            </Button>
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
          <Button size="lg" onClick={() => setExamState("setup")} className="w-full">
            Return to Setup
          </Button>
        </div>
      )}
      {showQuitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden relative p-6">
            <Button variant="ghost" size="icon" onClick={() => setShowQuitModal(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </Button>
            <h3 className="text-xl font-bold text-foreground mb-2 font-serif flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Leave Exam?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">You are currently taking a strict exam. Do you want to submit your answers early for grading, or quit without saving?</p>
            
            <div className="space-y-3">
              <Button size="lg" className="w-full justify-between" onClick={handleSubmit}>
                <span>Submit & Grade Early</span>
                <CheckCircle2 className="w-4 h-4 opacity-70" />
              </Button>
              <Button size="lg" variant="outline" className="w-full justify-between text-red-500" onClick={() => { setShowQuitModal(false); setExamState("setup"); }}>
                <span>Quit without saving</span>
                <ArrowLeft className="w-4 h-4 opacity-70" />
              </Button>
              <Button size="lg" variant="ghost" className="w-full" onClick={() => setShowQuitModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
