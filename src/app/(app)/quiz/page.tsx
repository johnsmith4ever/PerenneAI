"use client";

import { useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useSubscription } from "@/hooks/use-subscription";
import { Sparkles, ArrowLeft, Calculator, BookOpen, GraduationCap, CheckCircle2, ListChecks, BarChart, Settings2, FileText, ChevronRight, XCircle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type QuizType = "Calculation" | "Word-Heavy" | null;
type QuizMode = "setup" | "taking" | "grading" | "results";

const years = [7, 8, 9, 10, 11, 12, 13];
const calculationSubjects = ["Maths", "Physics", "Chemistry"];
const wordHeavySubjects = ["Chemistry", "Biology", "Geography", "RE", "Physics"];
const difficulties = ["Easy", "Medium", "Hard", "Challenge"];

const questionDefinitions: Record<string, string> = {
  // Calculation Types
  "Multiple Choice": "Which one is correct",
  "Short Numerical Answer": "Simple straight-forward question with 1 value answer",
  "Long Answer (Multi-step)": "More complex with multiple steps (Answer is also one value)",
  "True/False": "Is equation correct/balanced",
  "Matching": "Equation to answer",
  
  // Word-Heavy Types
  "MC": "Which statement or definition is correct",
  "Short Answer": "A quick answer without a full sentence",
  "Long Answer (Explain)": "A few sentences explain",
  "Case Study": "An example + long/short answer",
  "Definition": "A word and a definition is needed"
};

const calcQTypes = ["Short Numerical Answer", "Long Answer (Multi-step)", "True/False", "Matching", "Multiple Choice"];
const wordQTypes = ["MC", "Short Answer", "Long Answer (Explain)", "Case Study", "Definition"];

export default function QuizPage() {
  // Subscription
  const { canAfford, deductCredits, isLoaded: subLoaded } = useSubscription();

  // Setup State
  const [step, setStep] = usePersistentState<Step>("quiz_step", 1);
  const [year, setYear] = usePersistentState<number | null>("quiz_year", null);
  const [quizType, setQuizType] = usePersistentState<QuizType>("quiz_type", null);
  const [subject, setSubject] = usePersistentState<string | null>("quiz_subject", null);
  const [questionTypes, setQuestionTypes] = usePersistentState<string[]>("quiz_qtypes", []);
  const [difficulty, setDifficulty] = usePersistentState<string | null>("quiz_diff", null);
  const [questionCount, setQuestionCount] = usePersistentState<number>("quiz_count", 10);
  const [topic, setTopic] = usePersistentState<string>("quiz_topic", "");
  const [imageContext, setImageContext] = usePersistentState<string | null>("quiz_img", null);
  
  // App Mode State
  const [quizMode, setQuizMode] = usePersistentState<QuizMode>("quiz_mode", "setup");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = usePersistentState<any[]>("quiz_generated", []);
  
  // Advanced Retake State
  const [quizRedoMode, setQuizRedoMode] = usePersistentState<"new" | "exact" | null>("quiz_redo_mode", null);
  const [quizOldQuestions, setQuizOldQuestions] = usePersistentState<any[] | null>("quiz_old_questions", null);
  
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Quiz Taking State
  const [currentQuestionIndex, setCurrentQuestionIndex] = usePersistentState("quiz_index", 0);
  const [userAnswers, setUserAnswers] = usePersistentState<Record<number, { skipped: boolean, text: string }>>("quiz_answers", {});
  const [currentInput, setCurrentInput] = usePersistentState<string>("quiz_input", "");

  // Grading State
  const [gradingResults, setGradingResults] = usePersistentState<Record<number, any>>("quiz_results", {});

  const resetQuiz = () => {
    setQuizMode("setup");
    setStep(1);
    setGeneratedQuiz([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setCurrentInput("");
    setGradingResults({});
    setHasSaved(false);
  };

  const saveToHistory = async (scorePct: number) => {
    if (!user || generatedQuiz.length === 0) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("quiz_history").insert({
        user_id: user.id,
        topic: topic || "Untitled Quiz",
        questions: generatedQuiz.map((q, i) => ({
          ...q,
          user_answer: userAnswers[i]?.text || "Skipped",
          grading: gradingResults[i]
        })),
        score: scorePct
      });
      if (error) throw error;
      setHasSaved(true);
    } catch (e) {
      console.error("Error saving quiz history:", e);
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
    };

    if (!subLoaded) return;
    if (!canAfford(3000, "Apollo V4 Flash")) {
      alert("You do not have enough daily credits to generate a quiz. Please try again tomorrow or upgrade your plan.");
      return;
    }

    setIsGenerating(true);
    try {
      let pastQuestionsList: string[] = [];
      if (quizRedoMode !== "exact") {
        try {
          const { data: pastQuizzes } = await supabase
            .from("quiz_history")
            .select("questions")
            .eq("user_id", user?.id)
            .eq("topic", topic || "Untitled Quiz");

          if (pastQuizzes && pastQuizzes.length > 0) {
            pastQuizzes.forEach(quiz => {
              if (Array.isArray(quiz.questions)) {
                quiz.questions.forEach((q: any) => {
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
        alert("Logic Review Flagged: " + data.message);
      } else if (data.status === "success") {
        if (data.usage) deductCredits(data.usage.inputTokens, data.usage.outputTokens, "Apollo V4 Flash");
        setGeneratedQuiz(data.data);
        setQuizMode("taking");
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setCurrentInput("");
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate quiz.");
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

  const getMarksAvailable = (qType: string, style: QuizType) => {
    if (style === "Word-Heavy") {
      if (qType === "Short Answer") return 2;
      if (qType === "Long Answer (Explain)") return 3;
    }
    return 1;
  };

  const submitQuizForGrading = async (answers: Record<number, { skipped: boolean, text: string }>) => {
    setQuizMode("grading");
    const results: Record<number, any> = {};

    for (let i = 0; i < generatedQuiz.length; i++) {
      const q = generatedQuiz[i];
      const ans = answers[i];
      const maxMarks = getMarksAvailable(q.type, quizType);

      if (!ans || ans.skipped) {
        results[i] = { correct: false, marks_awarded: 0, marks_available: maxMarks, feedback: "Question was skipped.", missing_points: [] };
        continue;
      }

      // If the question has a strictly generated answer from Deepseek
      if (q.answer && q.answer.trim() !== "") {
        const isCorrect = ans.text.toLowerCase().trim() === q.answer.toLowerCase().trim();
        results[i] = { 
          correct: isCorrect, 
          marks_awarded: isCorrect ? maxMarks : 0, 
          marks_available: maxMarks, 
          feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer was: ${q.answer}`,
          missing_points: []
        };
      } else {
        // Complex AI grading required
        if (!canAfford(1000, "Bastion 3.5 Flash")) {
          results[i] = { correct: false, marks_awarded: 0, marks_available: maxMarks, feedback: "Insufficient credits to grade this answer." };
          continue;
        }

        try {
          const res = await fetch("/api/grade-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: q.question,
              userAnswer: ans.text,
              subject,
              topic
            })
          });
          const data = await res.json();
          if (data.status === "success") {
            if (data.usage) deductCredits(data.usage.inputTokens, data.usage.outputTokens, "Bastion 3.5 Flash");
            results[i] = { ...data.data, marks_available: maxMarks };
            // Ensure marks awarded don't exceed max marks (API might return out of 10)
            if (data.data.marks_awarded > maxMarks) {
              results[i].marks_awarded = Math.round((data.data.marks_awarded / 10) * maxMarks);
            }
          } else {
            results[i] = { correct: false, marks_awarded: 0, marks_available: maxMarks, feedback: "Grading failed for this question." };
          }
        } catch (e) {
          results[i] = { correct: false, marks_awarded: 0, marks_available: maxMarks, feedback: "Grading API error." };
        }
      }
    }

    setGradingResults(results);
    setQuizMode("results");
  };

  // --- Renderers ---

  if (quizMode === "taking") {
    const q = generatedQuiz[currentQuestionIndex];
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
          <h2 className="text-xl font-semibold text-foreground mb-6 leading-relaxed">{q.question}</h2>

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
    let totalAwarded = 0;
    let totalAvailable = 0;
    Object.values(gradingResults).forEach(res => {
      totalAwarded += res.marks_awarded || 0;
      totalAvailable += res.marks_available || 0;
    });
    const scorePct = Math.round((totalAwarded / totalAvailable) * 100) || 0;

    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Quiz Results</h1>
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-primary/20 relative">
            <span className="text-3xl font-bold text-primary">{scorePct}%</span>
          </div>
          <p className="mt-4 text-muted-foreground font-medium">You scored {totalAwarded} out of {totalAvailable} marks.</p>
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
                    {res.marks_awarded} / {res.marks_available} Marks
                  </div>
                </div>
                
                <p className="font-medium text-foreground mb-4">{q.question}</p>
                
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
                    
                    {res.model_answer && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <span className="block text-xs font-semibold uppercase mb-1 text-foreground/70">Model Answer:</span>
                        <p className="text-foreground/90 italic leading-relaxed text-sm">{res.model_answer}</p>
                      </div>
                    )}

                    {res.missing_points && res.missing_points.length > 0 && (
                      <div className="mt-3">
                        <span className="block text-xs font-semibold uppercase mb-1 text-foreground/70">Missing Points:</span>
                        <ul className="list-disc pl-5 space-y-1">
                          {res.missing_points.map((pt: string, idx: number) => <li key={idx} className="text-foreground/80">{pt}</li>)}
                        </ul>
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
                  key={y}
                  onClick={() => { setYear(y); handleNextStep(); }}
                  className={cn("p-4 rounded-xl border text-center transition-all hover:border-primary hover:bg-primary/5", year === y ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card")}
                >
                  <span className="font-medium">Year {y}</span>
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
                <h2 className="text-xl font-semibold text-foreground">Quiz Style</h2>
                <p className="text-sm text-muted-foreground">What kind of subject is this?</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => { setQuizType("Calculation"); setSubject(null); setQuestionTypes([]); handleNextStep(); }}
                className={cn("flex flex-col items-center p-6 rounded-xl border transition-all hover:border-primary hover:bg-primary/5 text-center group", quizType === "Calculation" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card")}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><Calculator className="w-6 h-6" /></div>
                <span className="font-semibold text-foreground mb-1">Calculation</span>
                <span className="text-xs text-muted-foreground">Maths, Physics, etc.</span>
              </button>
              <button
                onClick={() => { setQuizType("Word-Heavy"); setSubject(null); setQuestionTypes([]); handleNextStep(); }}
                className={cn("flex flex-col items-center p-6 rounded-xl border transition-all hover:border-primary hover:bg-primary/5 text-center group", quizType === "Word-Heavy" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card")}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform"><BookOpen className="w-6 h-6" /></div>
                <span className="font-semibold text-foreground mb-1">Word-Heavy</span>
                <span className="text-xs text-muted-foreground">Biology, History, etc.</span>
              </button>
            </div>
          </div>
        );
      case 3:
        const subjectsList = quizType === "Calculation" ? calculationSubjects : wordHeavySubjects;
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4" /></Button>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Select Subject</h2>
                <p className="text-sm text-muted-foreground">Choose the specific subject for your quiz.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {subjectsList.map((sub) => (
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
      case 4:
        const qTypesList = quizType === "Calculation" ? calcQTypes : wordQTypes;
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
              {qTypesList.map((type) => (
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
      case 5:
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
      case 6:
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
                <span>5</span><span>20</span>
              </div>
            </div>
            <div className="mt-auto flex justify-end">
              <Button onClick={handleNextStep} className="w-full sm:w-auto">Continue</Button>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
             <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4" /></Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-primary" /></div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Specific Topic</h2>
                  <p className="text-sm text-muted-foreground">What exactly are we studying today?</p>
                </div>
              </div>
            </div>
            <div className="mb-8">
              <label htmlFor="topic" className="block text-sm font-medium text-foreground mb-2">Enter your topic below</label>
              <textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The Krebs Cycle, Quadratic Equations..." className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all mb-6" rows={4} />
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
      case 8:
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
                <div className="flex justify-between"><span className="text-muted-foreground">Level:</span><span className="font-medium">Year {year}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subject:</span><span className="font-medium">{subject} ({quizType})</span></div>
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
            {quizMode === "setup" && step > 1 && <span className="text-muted-foreground/50 text-[10px] font-medium tracking-wider uppercase">• Step {step} of 8</span>}
          </p>
          <h1 className="page-title">Quiz Maker</h1>
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
      {quizMode === "setup" && step < 8 && (
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(step / 7) * 100}%` }} />
        </div>
      )}
      <div className="min-h-[400px]">
        {quizMode === "setup" && renderSetupContent()}
      </div>
    </div>
  );
}
