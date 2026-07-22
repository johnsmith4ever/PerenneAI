"use client";

import { useState, useEffect } from "react";
import { Clock, BookOpen, PenLine, FileText, ChevronRight, Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSubscription, TIER_RANK } from "@/hooks/use-subscription";
import { Lock } from "lucide-react";

type Tab = "quizzes" | "flashcards" | "essays";

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useUser();
  const { tier, isLoaded: subLoaded } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;
  const [activeTab, setActiveTab] = useState<Tab>("quizzes");
  const [selectedQuizForRetake, setSelectedQuizForRetake] = useState<any | null>(null);
  
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [essays, setEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchHistory = async () => {
      setLoading(true);
      
      const [quizRes, flashRes, essayRes] = await Promise.all([
        supabase.from("quiz_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("flashcards_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("essay_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      
      if (quizRes.data) setQuizzes(quizRes.data);
      if (flashRes.data) setFlashcards(flashRes.data);
      if (essayRes.data) setEssays(essayRes.data);
      
      setLoading(false);
    };
    
    fetchHistory();
  }, [user]);

  const handleDelete = async (table: string, id: string) => {
    await supabase.from(table).delete().eq("id", id);
    if (table === "quiz_history") setQuizzes(prev => prev.filter(q => q.id !== id));
    if (table === "flashcards_history") setFlashcards(prev => prev.filter(f => f.id !== id));
    if (table === "essay_history") setEssays(prev => prev.filter(e => e.id !== id));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
    });
  };

  const handleRetakeFlashcards = (f: any) => {
    localStorage.setItem("flashcards_all", JSON.stringify(f.cards || []));
    localStorage.setItem("flashcards_study", JSON.stringify(f.cards || []));
    localStorage.setItem("flashcards_title", JSON.stringify(f.title || f.topic || "Untitled Deck"));
    localStorage.setItem("flashcards_topic", JSON.stringify(f.topic || ""));
    localStorage.setItem("flashcards_mode", JSON.stringify("studying"));
    localStorage.setItem("flashcards_index", JSON.stringify(0));
    localStorage.setItem("flashcards_correct", JSON.stringify([]));
    localStorage.setItem("flashcards_wrong", JSON.stringify([]));
    localStorage.setItem("flashcards_round", JSON.stringify(1));
    localStorage.setItem("flashcards_track", JSON.stringify(true));
    router.push("/flashcards");
  };

  const handleRetakeQuiz = (q: any) => {
    setSelectedQuizForRetake(q);
  };

  const proceedWithQuizRetake = (mode: "exact" | "new") => {
    if (!selectedQuizForRetake) return;
    const q = selectedQuizForRetake;
    localStorage.setItem("quiz_redo_mode", JSON.stringify(mode));
    if (mode === "exact") {
      localStorage.setItem("quiz_old_questions", JSON.stringify(q.questions || []));
    } else {
      localStorage.setItem("quiz_old_questions", JSON.stringify([]));
    }
    localStorage.setItem("quiz_mode", JSON.stringify("setup"));
    localStorage.setItem("quiz_step", JSON.stringify(4));
    localStorage.setItem("quiz_topic", JSON.stringify(q.topic || "Untitled Quiz"));
    
    // Default reasonable settings for older quizzes without full metadata
    localStorage.setItem("quiz_year", JSON.stringify(10));
    localStorage.setItem("quiz_type", JSON.stringify("Word-Heavy"));
    localStorage.setItem("quiz_subject", JSON.stringify("Biology"));
    localStorage.setItem("quiz_diff", JSON.stringify("Medium"));
    localStorage.setItem("quiz_count", JSON.stringify(q.questions?.length || 10));
    
    router.push("/quiz");
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in relative">
      {subLoaded && tierRank < TIER_RANK.Core && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center rounded-2xl">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">History Locked</h2>
          <p className="text-muted-foreground mb-6 max-w-md">Upgrade to the Core plan to view your past study sessions, generated quizzes, and graded essays.</p>
          <Button size="lg" onClick={() => router.push("/subscriptions")}>Upgrade to Core</Button>
        </div>
      )}
      
      <div className={cn("mb-8", tierRank < TIER_RANK.Core && "opacity-50 pointer-events-none")}>
        <p className="label-title mb-1.5 flex items-center gap-2">
          Account
        </p>
        <h1 className="page-title flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your past study sessions, generated quizzes, and graded essays.
        </p>
      </div>

      <div className={cn("flex items-center gap-6 border-b border-border mb-8", tierRank < TIER_RANK.Core && "opacity-50 pointer-events-none")}>
        <button
          onClick={() => setActiveTab("quizzes")}
          className={cn(
            "pb-3 text-sm font-medium transition-colors relative",
            activeTab === "quizzes" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Quizzes
          {activeTab === "quizzes" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("flashcards")}
          className={cn(
            "pb-3 text-sm font-medium transition-colors relative",
            activeTab === "flashcards" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Flashcards
          {activeTab === "flashcards" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("essays")}
          className={cn(
            "pb-3 text-sm font-medium transition-colors relative",
            activeTab === "essays" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Essays
          {activeTab === "essays" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div className={cn("mt-8", tierRank < TIER_RANK.Core && "opacity-50 pointer-events-none")}>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === "quizzes" && (
            quizzes.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-border bg-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <PenLine className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No quizzes taken yet</h3>
                <p className="text-sm text-muted-foreground">When you save a quiz, it will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {quizzes.map((q) => (
                  <div key={q.id} onClick={() => handleRetakeQuiz(q)} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between hover:shadow-md transition-shadow group cursor-pointer">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg mb-1">{q.topic || "Untitled Quiz"}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatDate(q.created_at)}</span>
                        <span>•</span>
                        <span>{q.questions?.length || 0} Questions</span>
                        {q.score !== null && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-primary">Score: {q.score}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete("quiz_history", q.id); }} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* FLASHCARDS */}
          {activeTab === "flashcards" && (
            flashcards.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-border bg-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No flashcards saved</h3>
                <p className="text-sm text-muted-foreground">Your saved flashcard decks will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {flashcards.map((f) => (
                  <div key={f.id} onClick={() => handleRetakeFlashcards(f)} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between hover:shadow-md transition-shadow group cursor-pointer">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg mb-1">{f.title || f.topic || "Untitled Deck"}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatDate(f.created_at)}</span>
                        <span>•</span>
                        <span>{f.cards?.length || 0} Cards</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete("flashcards_history", f.id); }} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ESSAYS */}
          {activeTab === "essays" && (
            essays.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-border bg-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No essays graded</h3>
                <p className="text-sm text-muted-foreground">Your saved essay feedback and scores will be stored here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {essays.map((e) => (
                  <div key={e.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-2xl font-black text-primary leading-none">{e.grade_letter}</span>
                          <div className="h-4 w-px bg-border"></div>
                          <h3 className="font-semibold text-foreground text-lg leading-none">Score: {e.final_score}/100</h3>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                          <span>{formatDate(e.created_at)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete("essay_history", e.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-destructive mb-2">Key Issues</p>
                        <ul className="space-y-1">
                          {e.key_issues?.map((issue: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground truncate flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-destructive shrink-0"></span> {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-2">Improvements</p>
                        <ul className="space-y-1">
                          {e.improvement_points?.map((point: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground truncate flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-green-600 shrink-0"></span> {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      )}
      </div>


      {selectedQuizForRetake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border shadow-lg rounded-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setSelectedQuizForRetake(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-2 text-foreground">Retake Quiz</h2>
            <p className="text-sm text-muted-foreground mb-6">How would you like to retake "{selectedQuizForRetake.topic}"?</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => proceedWithQuizRetake("exact")}
                className="w-full p-4 rounded-xl border border-border text-left hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <span className="block font-semibold text-foreground mb-1 group-hover:text-primary">Redo Exact Quiz</span>
                <span className="block text-xs text-muted-foreground">Keep the exact same questions, but choose new formats (e.g. MC, Long Answer).</span>
              </button>
              
              <button 
                onClick={() => proceedWithQuizRetake("new")}
                className="w-full p-4 rounded-xl border border-border text-left hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <span className="block font-semibold text-foreground mb-1 group-hover:text-primary">Create New Quiz</span>
                <span className="block text-xs text-muted-foreground">Generate brand new questions on the same topic and choose your formats.</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
