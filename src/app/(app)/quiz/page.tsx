"use client";
import { toast } from "sonner";
import { usePersistentState } from "@/hooks/use-persistent-state";

import { useState, useEffect } from "react";

import { useUser } from "@clerk/nextjs";
import { useCurriculum } from "@/hooks/use-curriculum";
import { insertFeatureAction, deleteFeatureAction, fetchFeatureAction, upsertChatAction } from "@/actions/supabase";
import { useSubscription, TIER_RANK } from "@/hooks/use-subscription";
import { Sparkles, Brain, Clock, ChevronRight, CheckCircle2, XCircle, FileText, Zap, BookOpen, AlertCircle, AlertTriangle, RefreshCw, ArrowLeft, Calculator, GraduationCap, ListChecks, BarChart, Settings2, Loader2, Save, Target } from "lucide-react";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { MemoizedQuestionText } from "@/components/memoized-question-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";


type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type QuizType = "Word-Heavy" | null;
type QuizMode = "setup" | "taking" | "grading" | "results";

const years: { label: string; value: string }[] = [
  { label: "Year 7", value: "7" },
  { label: "Year 8", value: "8" },
  { label: "Year 9", value: "9" },
  { label: "GCSE", value: "GCSE" },
  { label: "A-Level", value: "A-Level" },
];
const allSubjects = ["Biology", "Chemistry", "Physics", "Geography"];
const difficulties = ["Easy", "Medium", "Hard", "Impossible"];

const questionDefinitions: Record<string, string> = {
  "Multiple Choice": "Which statement or definition is correct",
  "Short Answer": "A quick answer without a full sentence",
  "Long Answer": "A few sentences of explanation",
  "Definition": "A word and its definition",
  "Calculation": "A numerical or multi-step calculation question",
  "True/False": "Is a given statement correct?",
};

export default function QuizPage() {
  const { openUpgradeModal } = useUpgradeModal();
  const { user } = useUser();
  const { curriculumLevel } = useCurriculum();
  const { tier, deductCredits, canAfford, isLoaded, assistant, heavy, judge, grading } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;

  // Setup State
const [step, setStep] = usePersistentState<Step>("quiz_step", 1);
const [year, setYear] = usePersistentState<string | null>("quiz_year", null);
const [quizType, setQuizType] = usePersistentState<QuizType>("quiz_type", null);
const [subject, setSubject] = usePersistentState<string | null>("quiz_subject", null);
const [questionTypes, setQuestionTypes] = usePersistentState<string[]>("quiz_qtypes", []);
const [difficulty, setDifficulty] = usePersistentState<string | null>("quiz_diff", null);
const [questionCount, setQuestionCount] = usePersistentState<number>("quiz_count", 10);
const [topic, setTopic] = usePersistentState<string>("quiz_topic", "");
const [imageContext, setImageContext] = usePersistentState<string | null>("quiz_img", null);
const [usePremiumModel, setUsePremiumModel] = usePersistentState<boolean>("quiz_premium_model", false);
  const [aqaStatus, setAqaStatus] = useState<"checking" | "found" | "not_found" | null>(null);
  const [matchedSubject, setMatchedSubject] = useState<string | null>(null);
  const [subjectMismatch, setSubjectMismatch] = useState<boolean | null>(null);
  const [subjectMismatchOverridden, setSubjectMismatchOverridden] = useState(false);

  useEffect(() => {
    if (!topic.trim()) {
      setAqaStatus(null);
      setMatchedSubject(null);
      return;
    }

    setAqaStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/check-syllabus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, subject, curriculumLevel: year })
        });
        const data = await res.json();
        if (data.existsInAqa) {
          setAqaStatus("found");
          setMatchedSubject(data.matchedSubject || null);
          if (data.isSubjectMatch === false) {
            setSubjectMismatch(true);
          } else {
            setSubjectMismatch(false);
          }
        } else {
          setAqaStatus("not_found");
          setMatchedSubject(null);
          setSubjectMismatch(false);
        }
      } catch (e) {
        setAqaStatus(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [topic, subject, year]);

  // Subject mismatch check via GPT 5.4 Nano
  useEffect(() => {
    if (!topic.trim() || !subject) {
      setSubjectMismatch(null);
      setSubjectMismatchOverridden(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "GPT 5.4 Nano",
            systemPrompt: "You are a subject classifier. Reply only with 'yes' or 'no'.",
            messages: [{ role: "user", content: `Is the topic "${topic}" directly part of or clearly related to the school subject "${subject}"? Reply with only 'yes' or 'no'.` }],
            chatMode: "Standard",
          })
        });
        const data = await res.json();
        const answer = (data.text || "").toLowerCase().trim();
        setSubjectMismatch(answer.startsWith("no"));
      } catch (e) {
        setSubjectMismatch(null);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [topic, subject]);
  
const [quizMode, setQuizMode, quizModeLoaded] = usePersistentState<QuizMode>("quiz_mode", "setup");
  const [isGenerating, setIsGenerating] = useState(false);
const [generatedQuiz, setGeneratedQuiz] = usePersistentState<any[]>("quiz_generated", []);
  
  // Advanced Retake State
const [quizRedoMode, setQuizRedoMode] = usePersistentState<"new" | "exact" | null>("quiz_redo_mode", null);
const [quizOldQuestions, setQuizOldQuestions] = usePersistentState<any[] | null>("quiz_old_questions", null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Quiz Taking State
const [currentQuestionIndex, setCurrentQuestionIndex] = usePersistentState("quiz_index", 0);
const [userAnswers, setUserAnswers] = usePersistentState<Record<number, { skipped: boolean, text: string }>>("quiz_answers", {});
const [currentInput, setCurrentInput] = usePersistentState<string>("quiz_input", "");

  // Grading State
const [gradingResults, setGradingResults] = usePersistentState<Record<number, any>>("quiz_results", {});

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("topic");
    const retest = params.get("retest");

    if (t && retest === "true") {
      fetchFeatureAction("quizzes", "data", 1, { topic: t }).then((data: any) => {
        if (data && data.length > 0 && data[0].data && data[0].data.length > 0) {
          const settings = data[0].data[0]._quizSettings;
          if (settings) {
            setTopic(t);
            if (settings.year) setYear(settings.year);
            if (settings.subject) setSubject(settings.subject);
            if (settings.quizType) setQuizType(settings.quizType);
            if (settings.difficulty) setDifficulty(settings.difficulty);
            if (settings.questionCount) setQuestionCount(settings.questionCount);
            if (settings.questionTypes) setQuestionTypes(settings.questionTypes);
            setStep(7);
          }
        }
      });
    }
  }, [user]);

  const resetQuiz = () => {
    setQuizMode("setup");
    setStep(1);
    setYear(null);
    setQuizType("Word-Heavy"); // fixed type
    setSubject(null);
    setQuestionTypes([]);
    setDifficulty(null);
    setQuestionCount(10);
    setTopic("");
    setImageContext(null);
    setQuizRedoMode(null);
    setQuizOldQuestions(null);
    setGeneratedQuiz([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setCurrentInput("");
    setGradingResults({});
    setHasSaved(false);
    setSubjectMismatch(null);
    setSubjectMismatchOverridden(false);
  };

  const saveToHistory = async (scorePct: number, freshResults?: Record<number, any>) => {
    if (!user || generatedQuiz.length === 0 || hasSaved) return;
    const resultsToSave = freshResults ?? gradingResults;
    setIsSaving(true);
    try {
      const res = await insertFeatureAction("quizzes", {
        user_id: user.id,
        topic: topic || "Untitled Quiz",
        data: generatedQuiz.map((q, i) => {
          const res = {
            ...q,
            user_answer: userAnswers[i]?.text || "Skipped",
            grading: resultsToSave[i]
          };
          if (i === 0) {
            res._quizSettings = {
              year,
              subject,
              quizType,
              difficulty,
              questionCount,
              questionTypes
            };
          }
          return res;
        }),
        score: scorePct
      });
      
      if (res.ok) {
        setHasSaved(true);
        toast.success("Quiz saved to your account history!");
      } else {
        toast.error("Couldn't save quiz to history.");
      }
    } catch (e) {
      console.error("Error saving quiz history:", e);
      toast.error("Couldn't save quiz to history.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextStep = () => setStep((s) => (s + 1) as Step);
  const handlePrevStep = () => setStep((s) => (s - 1) as Step);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageContext(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleQuestionType = (type: string) => {
    setQuestionTypes((prev) => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    const selectedDefinitions = questionTypes.reduce((acc, type) => {
      acc[type] = questionDefinitions[type];
      return acc;
    }, {} as Record<string, string>);

    const payload = {
      academicYear: year,
      quizStyle: quizType,
      subject: subject,
      topic: topic,
      imageContext: imageContext,
      difficulty: difficulty,
      numberOfQuestions: questionCount,
      questionTypes: questionTypes,
      questionDefinitions: selectedDefinitions,
      quizRedoMode: quizRedoMode,
      oldQuestions: quizRedoMode === "exact" ? quizOldQuestions : null,
      curriculumLevel: curriculumLevel,
      heavyModel: heavy,
      judgeModel: grading
    };

    if (!isLoaded) return;
    if (!canAfford(3000, "Deepseek-V4-Flash")) {
      openUpgradeModal("You do not have enough daily credits to generate a quiz. Please try again tomorrow or upgrade your plan.", "Upgrade Plan", "/subscriptions");
      return;
    }

    setIsGenerating(true);
    try {
      let pastQuestionsList: string[] = [];
      if (quizRedoMode !== "exact") {
        try {
          const pastQuizzes = await fetchFeatureAction("quizzes", "data", 50, { topic: topic });

          if (pastQuizzes && pastQuizzes.length > 0) {
            pastQuizzes.forEach(quiz => {
              if (Array.isArray(quiz.data)) {
                quiz.data.forEach((q: any) => {
                  if (q.question) pastQuestionsList.push(q.question);
                });
              }
            });
          }
        } catch (e) {
          console.error("Failed to fetch past questions", e);
        }
      }

      const payloadWithPast = { ...payload, pastQuestions: pastQuestionsList };

      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadWithPast)
      });
      const data = await res.json();
      if (res.status === 400 && data.status === "flagged") {
        toast.error("Logic Review Flagged: " + data.message);
      } else if (data.status === "success") {
        if (data.usage) deductCredits(data.usage.inputTokens, data.usage.outputTokens, heavy);
        setGeneratedQuiz(data.data);
        setQuizMode("taking");
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setCurrentInput("");
      } else {
        toast.error("Error: " + data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Quiz Taking Handlers ---

  const handleSkipQuestion = () => {
    const updated = { ...userAnswers, [currentQuestionIndex]: { skipped: true, text: "" } };
    setUserAnswers(updated);
    advanceQuestion(updated);
  };

  const handleNextQuestion = () => {
    const updated = { ...userAnswers, [currentQuestionIndex]: { skipped: false, text: currentInput } };
    setUserAnswers(updated);
    advanceQuestion(updated);
  };

  const advanceQuestion = (updatedAnswers: Record<number, { skipped: boolean, text: string }>) => {
    if (currentQuestionIndex < generatedQuiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentInput(updatedAnswers[currentQuestionIndex + 1]?.text || "");
    } else {
      submitQuizForGrading(updatedAnswers);
    }
  };

  const submitQuizForGrading = async (answers: Record<number, { skipped: boolean, text: string }>) => {
    setQuizMode("grading");
    const results: Record<number, any> = {};

    for (let i = 0; i < generatedQuiz.length; i++) {
      const q = generatedQuiz[i];
      const ans = answers[i];

      if (!ans || ans.skipped) {
        results[i] = { correct: false, feedback: "Question was skipped.", model_answer: "" };
        continue;
      }

      // MCQ / True-False / Matching: fast string comparison
      if (q.answer && q.answer.trim() !== "" && (q.type === "mcq" || q.type === "Multiple Choice" || q.type === "True/False" || q.type === "Matching")) {
        const isCorrect = ans.text.toLowerCase().trim() === q.answer.toLowerCase().trim();
        results[i] = {
          correct: isCorrect,
          feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer was: ${q.answer}`,
          model_answer: isCorrect ? "" : q.answer,
        };
      } else {
        // AI semantic grading via Gemini Flash
        try {
          const res = await fetch("/api/grade-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: q.question,
              userAnswer: ans.text,
              subject,
              topic,
            })
          });
          const data = await res.json();
          if (data.status === "success") {
            if (data.usage) deductCredits(data.usage.inputTokens ?? data.usage.promptTokens ?? 0, data.usage.outputTokens ?? data.usage.completionTokens ?? 0, "Gemini 3.6 Flash");
            results[i] = data.data;
          } else {
            results[i] = { correct: false, feedback: "Grading failed for this question.", model_answer: "" };
          }
        } catch (e) {
          results[i] = { correct: false, feedback: "Grading API error.", model_answer: "" };
        }
      }
    }

    setGradingResults(results);
    setQuizMode("results");

    const totalCorrect = Object.values(results).filter((r: any) => r.correct).length;
    const scorePct = Math.round((totalCorrect / generatedQuiz.length) * 100) || 0;
    saveToHistory(scorePct, results).catch(console.error);
  };

  // --- Renderers ---
  if (!isLoaded) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (quizMode === "taking") {
    if (!generatedQuiz || generatedQuiz.length === 0) {
      return (
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }
    
    const q = generatedQuiz[currentQuestionIndex];
    if (!q) return null;
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in relative">
        {/* Start Over Button - Top Right */}
        <div className="absolute -top-4 right-0">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={resetQuiz}>
            <XCircle className="w-4 h-4" /> Exit Quiz
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="label-title">Question {currentQuestionIndex + 1} of {generatedQuiz.length}</p>
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{q.type}</span>
        </div>

        <div className="p-8 rounded-xl border border-border bg-card shadow-sm">
          <MemoizedQuestionText text={q.question} id={`quiz-test-q-${currentQuestionIndex}`} className="text-xl font-semibold text-foreground mb-6 leading-relaxed" />

          {q.options && q.options.length > 0 ? (
            <div className="space-y-3">
              {q.options.map((opt: string, idx: number) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentInput(opt)}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-xl border transition-all text-sm font-medium",
                    currentInput === opt ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="w-full rounded-xl border border-border bg-transparent px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none min-h-[160px]"
              placeholder="Type your answer here..."
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={handleSkipQuestion}>
            Skip Question
          </Button>
          <Button onClick={handleNextQuestion} disabled={!currentInput.trim()}>
            {currentQuestionIndex === generatedQuiz.length - 1 ? "Submit & Grade" : "Next Question"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (quizMode === "grading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Grading your answers</h2>
          <p className="text-muted-foreground">Our AI is analyzing your responses and generating feedback...</p>
        </div>
      </div>
    );
  }

  if (quizMode === "results") {
    const totalCorrect = Object.values(gradingResults).filter((r: any) => r.correct).length;
    const totalQuestions = generatedQuiz.length;
    const scorePct = Math.round((totalCorrect / totalQuestions) * 100) || 0;

    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Quiz Results</h1>
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-primary/20 relative">
            <span className="text-3xl font-bold text-primary">{scorePct}%</span>
          </div>
          <p className="mt-4 text-muted-foreground font-medium">You got {totalCorrect} out of {totalQuestions} questions correct.</p>
        </div>

        <div className="space-y-6">
          {generatedQuiz.map((q, i) => {
            const res = gradingResults[i];
            const ans = userAnswers[i];
            return (
              <div key={i} className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-sm font-semibold text-muted-foreground">Question {i + 1}</span>
                  <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", res.correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                    {res.correct ? "Correct ✓" : "Incorrect ✗"}
                  </div>
                </div>
                
                <MemoizedQuestionText text={q.question} id={`quiz-res-q-${i}`} className="font-medium text-foreground mb-4" />
                
                <div className="space-y-4 text-sm">
                  <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border border-border/50">
                    <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Your Answer:</span>
                    <span className={ans?.skipped ? "italic text-muted-foreground" : "text-foreground"}>
                      {ans?.skipped ? "Skipped" : ans?.text}
                    </span>
                  </div>

                  <div className={cn("p-4 rounded-lg border", res.correct ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900" : "bg-red-50/50 border-red-100 dark:bg-red-950/30 dark:border-red-900")}>
                    <span className="block text-xs font-semibold uppercase mb-1 text-foreground/70">Feedback:</span>
                    <p className="text-foreground leading-relaxed">{res.feedback}</p>
                    
                    {!res.correct && (res.model_answer || q.answer) && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <span className="block text-xs font-semibold uppercase mb-1 text-foreground/70">Correct Answer:</span>
                        <p className="text-foreground/90 italic leading-relaxed text-sm">{res.model_answer || q.answer}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 mt-8">
          <Button className="w-full flex-1" variant="outline" size="lg" onClick={resetQuiz}>
            Take Another Quiz
          </Button>
          <Button 
            className="w-full flex-1 gap-2" 
            size="lg" 
            onClick={() => saveToHistory(scorePct)}
            disabled={isSaving || hasSaved}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {hasSaved ? "Saved to History" : "Save to History"}
          </Button>
        </div>
      </div>
    );
  }

  // --- Setup Mode Renderers ---
  const renderSetupContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Select your Year</h2>
                <p className="text-sm text-muted-foreground">What academic year are you currently in?</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {years.map((y) => (
                <button
                  key={y.value}
                  onClick={() => { setYear(y.value); handleNextStep(); }}
                  className={cn("p-4 rounded-xl border text-center transition-all hover:border-primary hover:bg-primary/5", year === y.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card")}
                >
                  <span className="font-medium">{y.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4" /></Button>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Select Subject</h2>
                <p className="text-sm text-muted-foreground">Choose the specific subject for your quiz.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {allSubjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => { setSubject(sub); handleNextStep(); }}
                  className={cn("p-4 rounded-xl border text-center transition-all hover:border-primary hover:bg-primary/5", subject === sub ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card")}
                >
                  <span className="font-medium">{sub}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        const allQTypes = Object.keys(questionDefinitions);
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4" /></Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><ListChecks className="w-5 h-5 text-primary" /></div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Question Types</h2>
                  <p className="text-sm text-muted-foreground">Select multiple types for your quiz.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {allQTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleQuestionType(type)}
                  className={cn("p-4 rounded-xl border text-left transition-all hover:border-primary flex flex-col gap-1", questionTypes.includes(type) ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card")}
                >
                  <span className="font-semibold text-sm">{type}</span>
                  <span className="text-xs text-muted-foreground">{questionDefinitions[type]}</span>
                </button>
              ))}
            </div>
            <div className="mt-auto flex justify-end">
              <Button onClick={handleNextStep} disabled={questionTypes.length === 0} className="w-full sm:w-auto">Continue</Button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4" /></Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><BarChart className="w-5 h-5 text-primary" /></div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Difficulty Level</h2>
                  <p className="text-sm text-muted-foreground">How challenging should this quiz be?</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {difficulties.map((diff) => (
                <button
                  key={diff}
                  onClick={() => { setDifficulty(diff); handleNextStep(); }}
                  className={cn("p-4 rounded-xl border text-center transition-all hover:border-primary hover:bg-primary/5", difficulty === diff ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card")}
                >
                  <span className="font-medium">{diff}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4" /></Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Settings2 className="w-5 h-5 text-primary" /></div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Number of Questions</h2>
                  <p className="text-sm text-muted-foreground">Choose between 5 and 20 questions.</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-12 flex flex-col items-center">
              <span className="text-5xl font-bold text-foreground mb-8">{questionCount}</span>
              <input type="range" min="5" max="20" step="1" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value))} className="w-full max-w-sm accent-primary" />
              <div className="w-full max-w-sm flex justify-between mt-3 text-xs text-muted-foreground font-medium">
                <span>5</span>
                <span>20</span>
              </div>
            </div>
            <div className="mt-auto flex justify-end">
              <Button onClick={handleNextStep} className="w-full sm:w-auto">Continue</Button>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
             <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4" /></Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-primary" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">Specific Topic</h2>
                    {subject && (
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {subject}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">What exactly are we studying today?</p>
                </div>
              </div>
            </div>
            <div className="mb-8">
              <label htmlFor="topic" className="block text-sm font-medium text-foreground mb-2">Enter your topic below</label>
              <textarea 
                id="topic" 
                value={topic} 
                onChange={(e) => {
                  setTopic(e.target.value);
                  setSubjectMismatchOverridden(false);
                }} 
                placeholder="e.g. The Krebs Cycle, Quadratic Equations..." 
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all mb-2" 
                rows={4} 
              />
              
              <div className="flex flex-col gap-2 mb-6">
                {subjectMismatch && !subjectMismatchOverridden && aqaStatus !== "not_found" && (
                  <div className="bg-orange-500/20 px-4 py-3 rounded-lg text-sm font-bold text-orange-500 flex items-center justify-between gap-2 border border-orange-500/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Subject Mismatch {matchedSubject ? `(Found under AQA ${matchedSubject})` : ""}</span>
                    </div>
                    <button onClick={() => setSubjectMismatchOverridden(true)} className="text-orange-500 hover:underline text-xs font-bold uppercase ml-4 whitespace-nowrap">Override</button>
                  </div>
                )}
                {aqaStatus === "not_found" && (
                  <div className="bg-red-500/20 px-4 py-3 rounded-lg text-sm font-bold text-red-500 flex items-center gap-2 border border-red-500/20">
                    <XCircle className="w-5 h-5" />
                    Not found in Database
                  </div>
                )}
                {aqaStatus === "found" && (!subjectMismatch || subjectMismatchOverridden) && (
                  <div className="bg-emerald-500/20 px-4 py-3 rounded-lg text-sm font-bold text-emerald-500 flex items-center gap-2 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                    Found in Database
                  </div>
                )}
              </div>

              <label className="block text-sm font-medium text-foreground mb-2">Attach Reference Image (Optional)</label>
              <div className="flex items-center gap-4">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
                {imageContext && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md"><CheckCircle2 className="w-3.5 h-3.5"/> Attached</span>}
              </div>
            </div>
            <div className="mt-auto flex justify-end">
              <Button onClick={handleNextStep} disabled={!topic.trim()} className="w-full sm:w-auto">Review Summary</Button>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4" /></Button>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Ready to go!</h2>
                <p className="text-sm text-muted-foreground">Review your settings before generating.</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden mb-8">
              <div className="p-4 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-foreground">Quiz Summary</h3>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Level:</span><span className="font-medium">{year}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subject:</span><span className="font-medium">{subject}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Difficulty:</span><span className="font-medium">{difficulty}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Length:</span><span className="font-medium">{questionCount} Questions</span></div>
                <div className="flex justify-between border-t border-border pt-3 mt-3"><span className="text-muted-foreground shrink-0 pr-4">Topic:</span><span className="font-medium text-right break-words">{topic}</span></div>
                <div className="border-t border-border pt-3 mt-3">
                  <span className="text-muted-foreground block mb-2">Question Types:</span>
                  <div className="flex flex-wrap gap-2">
                    {questionTypes.map((qt) => <span key={qt} className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium tracking-wide uppercase">{qt}</span>)}
                  </div>
                </div>
              </div>
            </div>

            {/* HIDDEN FOR TESTING STAGE: Will reveal when payment plans launch */}
            {/* <PremiumGate featureName="Claude Haiku Generation">
              <div className="flex items-center justify-between p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 mb-8">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-500" /> Premium AI Model
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">Use Claude Haiku for ultra-accurate question generation.</p>
                </div>
                <button
                  onClick={() => setUsePremiumModel(!usePremiumModel)}
                  className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", usePremiumModel ? "bg-cyan-500" : "bg-muted")}
                >
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", usePremiumModel ? "translate-x-6" : "translate-x-1")} />
                </button>
              </div>
            </PremiumGate> */}

            <Button className="w-full gap-2" size="lg" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "AI is processing (this may take a moment)..." : <><Sparkles className="w-4 h-4" /> Generate Quiz via AI</>}
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-title mb-1.5 flex items-center gap-2">
            Study tools
            {quizMode === "setup" && step > 1 && <span className="text-muted-foreground/50 text-[10px] font-medium tracking-wider uppercase">• Step {step} of 7</span>}
          </p>
          <div className="flex items-center gap-3">
          <h1 className="page-title m-0">Quiz Maker</h1>
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1">AQA Syllabus</span>
        </div>
          <p className="text-sm text-muted-foreground mt-1">
            {quizMode === "setup" ? "Customise your quiz settings below to get started." : "Good luck!"}
          </p>
        </div>

        {quizMode === "setup" && step > 1 && (
          <Button variant="ghost" size="sm" onClick={resetQuiz} className="text-muted-foreground hover:text-foreground shrink-0 mt-1">
            New Quiz
          </Button>
        )}
      </div>


      {quizMode === "setup" && step < 7 && (
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-6">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(step / 7) * 100}%` }} />
        </div>
      )}
      <div className="min-h-[400px]">
        {quizMode === "setup" && renderSetupContent()}
      </div>
    </div>
  );
}
