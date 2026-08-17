"use client";

import { useState, useEffect } from "react";
import { Clock, BookOpen, PenLine, FileText, ChevronRight, Loader2, Trash2, X, Globe, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { insertHistoryAction, deleteHistoryAction, fetchUserHistoryAction, upsertChatAction } from "@/actions/supabase";
import { MemoizedQuestionText } from "@/components/memoized-question-text";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSubscription, TIER_RANK } from "@/hooks/use-subscription";
import Link from "next/link";



type Tab = "quizzes" | "flashcards" | "essays" | "presentation" | "math_solver" | "mindmap" | "schedule" | "note_summary" | "debate";

const TABS: { id: Tab, label: string }[] = [
  { id: "quizzes", label: "Quizzes" },
  { id: "flashcards", label: "Flashcards" },
  { id: "essays", label: "Essays" },
  { id: "presentation", label: "Presentations" },
  { id: "math_solver", label: "Maths Solutions" },
  { id: "debate", label: "Debates" },
  { id: "mindmap", label: "Mindmaps" },
  { id: "schedule", label: "Schedules" },
  { id: "note_summary", label: "Note Summaries" }
];

export default function HistoryPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { tier, isLoaded: subLoaded } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;
  void subLoaded; // suppress unused warning

  // Guest block
  const isGuest = userLoaded && !user;

  const [activeTab, setActiveTab] = useState<Tab>("quizzes");
  
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [essays, setEssays] = useState<any[]>([]);
  const [explore, setExplore] = useState<any[]>([]);
  const [exploreFilter, setExploreFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{ type: string; data: any; topic: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchHistory = async () => {
      setLoading(true);
      
      const [quizRes, flashRes, essayRes, exploreRes] = await Promise.all([
        fetchUserHistoryAction("quiz_history"),
        fetchUserHistoryAction("flashcards_history"),
        fetchUserHistoryAction("essay_history"),
        fetchUserHistoryAction("explore_history"),
      ]);
      
      if (quizRes) setQuizzes(quizRes);
      if (flashRes) setFlashcards(flashRes);
      if (essayRes) setEssays(essayRes);
      if (exploreRes) setExplore(exploreRes);
      
      setLoading(false);
    };
    
    fetchHistory();
  }, [user]);

  const handleDelete = async (table: string, id: string) => {
    await deleteHistoryAction(table as any, id);
    if (table === "quiz_history") setQuizzes(prev => prev.filter(q => q.id !== id));
    if (table === "flashcards_history") setFlashcards(prev => prev.filter(f => f.id !== id));
    if (table === "essay_history") setEssays(prev => prev.filter(e => e.id !== id));
    if (table === "explore_history") setExplore(prev => prev.filter(e => e.id !== id));
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

  const handleRetakeExplore = (item: any) => {
    if (item.type === "mindmap") {
      localStorage.setItem("mindmaps_root_v4", JSON.stringify(item.data));
      router.push("/mindmaps");
    } else {
      setSelectedItem({ type: item.type, data: item.data, topic: item.topic });
    }
  };

  // Early return for guests - all hooks already declared above
  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-in fade-in">
        <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20">
          <Lock className="w-10 h-10 text-purple-400" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-3">Sign In Required</h1>
        <p className="text-muted-foreground max-w-sm mb-8">Your study history is saved to your account. Sign in to view your past sessions, quizzes, flashcards, and more.</p>
        <Link href="/sign-in" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold transition-all shadow-lg">
          Sign In to View History
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in relative">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {selectedItem ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 border-b border-border pb-6">
            <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)} className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="label-title capitalize">{selectedItem.type.replace(/_/g, " ")}</p>
              <h1 className="page-title">{selectedItem.topic || "Viewer"}</h1>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6">
            {selectedItem.type === "quiz" && selectedItem.data.questions && (
              <div className="space-y-6">
                {selectedItem.data.questions.map((q: any, i: number) => (
                  <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="font-semibold text-foreground mb-3 flex gap-2">
                      <span className="opacity-50 shrink-0">{i+1}.</span>
                      <MemoizedQuestionText text={q.question} id={`history-q-${i}`} />
                    </div>
                    {q.options && q.options.length > 0 ? (
                      <ul className="space-y-2">
                        {q.options.map((opt: string, j: number) => (
                          <li key={j} className={cn("text-sm p-2 rounded-md", opt === q.answer ? "bg-emerald-500/10 text-emerald-600 font-medium" : "text-muted-foreground")}>
                            {opt} {opt === q.answer && "✓"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      q.answer && (
                        <div className="mt-3 p-3 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Model Answer</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{q.answer}</p>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedItem.type === "essay" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-black text-primary">{selectedItem.data.grade_letter}</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Score</p>
                    <p className="text-xl font-semibold">{selectedItem.data.final_score}/100</p>
                  </div>
                </div>
                {selectedItem.data.key_issues && (
                  <div>
                    <h3 className="font-bold text-destructive mb-2">Key Issues</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                      {selectedItem.data.key_issues.map((iss: string, i: number) => <li key={i}>{iss}</li>)}
                    </ul>
                  </div>
                )}
                {selectedItem.data.improvement_points && (
                  <div>
                    <h3 className="font-bold text-green-600 mb-2">Improvements</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                      {selectedItem.data.improvement_points.map((imp: string, i: number) => <li key={i}>{imp}</li>)}
                    </ul>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-foreground mb-2">Original Essay</h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-4 rounded-lg">
                    {selectedItem.data.original_essay || "N/A"}
                  </div>
                </div>
              </div>
            )}

            {(selectedItem.type === "note_summary_saved" || selectedItem.type === "note_summary") && (
              <div className="space-y-6 font-sans">
                {selectedItem.data.pureSummary ? (
                   <div className="text-sm text-foreground whitespace-pre-wrap">{selectedItem.data.pureSummary}</div>
                ) : (
                  <>
                    {selectedItem.data.tldr && (
                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                        <h3 className="font-bold text-blue-500 mb-2 font-serif">Definition</h3>
                        <p className="text-sm text-foreground">{selectedItem.data.tldr}</p>
                      </div>
                    )}
                    {selectedItem.data.eli10 && (
                      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                        <h3 className="font-bold text-emerald-600 mb-2 font-serif">Simple Explanation</h3>
                        <p className="text-sm text-foreground">{selectedItem.data.eli10}</p>
                      </div>
                    )}
                    {selectedItem.data.keyConcepts && (
                      <div>
                        <h3 className="font-bold text-foreground mb-3 font-serif">Core Concepts</h3>
                        <div className="space-y-3">
                          {selectedItem.data.keyConcepts.map((kc: any, i: number) => (
                            <div key={i} className="p-3 bg-muted/50 rounded-lg">
                              <h4 className="font-semibold text-foreground text-sm">{kc.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{kc.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedItem.data.actionableTakeaways && (
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <h3 className="font-bold text-amber-600 mb-2 font-serif">Actionable Takeaways</h3>
                        <ul className="list-decimal pl-5 space-y-1 text-sm text-foreground">
                          {selectedItem.data.actionableTakeaways.map((t: string, i: number) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedItem.type === "debate" && Array.isArray(selectedItem.data) && (
              <div className="space-y-4">
                {selectedItem.data.map((msg: any, i: number) => (
                  <div key={i} className={cn("p-4 rounded-xl max-w-[85%]", msg.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted text-foreground")}>
                    <p className="text-sm font-bold mb-1 opacity-70">{msg.role === "user" ? "You" : "Debate Partner"}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            {selectedItem.type === "math_solver" && (
              <div className="space-y-6">
                 {selectedItem.data.extractedProblem && (
                   <div className="p-4 bg-muted/50 rounded-xl">
                     <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Problem</p>
                     <p className="text-foreground">{selectedItem.data.extractedProblem}</p>
                   </div>
                 )}
                 {selectedItem.data.finalAnswer && (
                   <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                     <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Final Answer</p>
                     <p className="text-emerald-700 font-bold text-xl">{selectedItem.data.finalAnswer}</p>
                   </div>
                 )}
                 {selectedItem.data.solution && (
                   <div>
                     <h3 className="font-bold text-foreground mb-3">Step-by-Step Solution</h3>
                     {Array.isArray(selectedItem.data.solution) ? (
                       <div className="space-y-4">
                         {selectedItem.data.solution.map((s: any, idx: number) => (
                           <div key={idx} className="bg-card border border-border p-4 rounded-lg">
                             <h4 className="font-bold text-sm text-foreground mb-1">Step {s.step}: {s.title}</h4>
                             <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.content}</p>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-card border border-border p-4 rounded-lg">
                         {selectedItem.data.solution}
                       </div>
                     )}
                   </div>
                 )}
              </div>
            )}

            {selectedItem.type === "presentation" && Array.isArray(selectedItem.data) && (
              <div className="space-y-6">
                {selectedItem.data.map((slide: any, idx: number) => (
                  <div key={idx} className="bg-card border border-border p-6 rounded-xl shadow-sm">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Slide {idx + 1}</p>
                    <h3 className="font-bold text-foreground text-xl mb-4">{slide.title}</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      {slide.bulletPoints?.map((bp: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">{bp}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {selectedItem.type === "schedule" && selectedItem.data.days && (
              <div className="space-y-8">
                {selectedItem.data.days.map((day: any, dIdx: number) => (
                  <div key={dIdx} className="space-y-4">
                    <h3 className="font-bold text-lg text-foreground border-b border-border pb-2">{day.day}</h3>
                    <div className="space-y-3">
                      {day.blocks?.map((block: any, bIdx: number) => (
                        <div key={bIdx} className={cn("p-4 rounded-xl border flex gap-4 relative overflow-hidden", block.type === "study" ? "bg-card border-border" : "bg-muted/50 border-transparent")}>
                          {block.type === "study" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                          <div className="shrink-0 text-right w-16">
                            <p className="text-sm font-bold text-foreground">{block.startTime}</p>
                            <p className="text-xs text-muted-foreground">{block.endTime}</p>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-sm text-foreground mb-1">{block.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{block.details}</p>
                            
                            {block.microTargets && block.microTargets.length > 0 && (
                              <ul className="list-disc pl-5 space-y-1 mt-2">
                                {block.microTargets.map((target: string, tIdx: number) => (
                                  <li key={tIdx} className="text-xs text-muted-foreground">{target}</li>
                                ))}
                              </ul>
                            )}
                            
                            {block.pomodoro && (
                              <div className="mt-3 inline-block px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                                Pomodoro: {block.pomodoro}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback for mindmap that is too complex to render easily */}
            {["mindmap"].includes(selectedItem.type) && (
              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <p className="text-sm font-medium text-muted-foreground mb-4">
                  Visual previews for {selectedItem.type} are limited in history mode. Here is the raw data schema:
                </p>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground overflow-auto max-h-[60vh]">
                  {JSON.stringify(selectedItem.data, null, 2)}
                </pre>
              </div>
            )}

          </div>
        </div>
      ) : (
        <>
      <div className="mb-8">
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

      <div className="flex items-center gap-6 border-b border-border mb-8 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap",
              activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>      <div className="mt-8">
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
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No quizzes generated</h3>
                  <p className="text-sm text-muted-foreground">Your generated quizzes will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {quizzes.map((q) => (
                    <div key={q.id} onClick={() => setSelectedItem({ type: "quiz", data: q, topic: q.topic || "Quiz" })} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between group cursor-pointer hover:shadow-md transition-shadow">
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

            {activeTab === "flashcards" && (
              flashcards.length === 0 ? (
                <div className="p-12 text-center rounded-xl border border-border bg-card">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No flashcards saved</h3>
                  <p className="text-sm text-muted-foreground">Your study sets will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {flashcards.map((f) => (
                    <div key={f.id} onClick={() => handleRetakeFlashcards(f)} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between hover:shadow-md transition-shadow group cursor-pointer">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg mb-1">{f.topic || "Untitled Deck"}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="font-bold text-primary">Flashcards</span>
                          <span>•</span>
                          <span>{f.cards?.length || 0} Cards</span>
                          <span>•</span>
                          <span>{formatDate(f.created_at)}</span>
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
                    <div key={e.id} onClick={() => setSelectedItem({ type: "essay", data: e, topic: "Essay Grading" })} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow group cursor-pointer">
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
                        <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); handleDelete("essay_history", e.id); }} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
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

            {["presentation", "math_solver", "mindmap", "schedule", "note_summary", "debate"].includes(activeTab) && (
              explore.filter((item) => item.type === activeTab || (activeTab === "note_summary" && item.type === "note_summary_saved")).length === 0 ? (
                <div className="p-12 text-center rounded-xl border border-border bg-card">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1 capitalize">No {activeTab.replace("_", " ")} history</h3>
                  <p className="text-sm text-muted-foreground">Generations will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {explore
                    .filter((item) => item.type === activeTab || (activeTab === "note_summary" && item.type === "note_summary_saved"))
                    .map((item) => (
                      <div key={item.id} onClick={() => handleRetakeExplore(item)} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between hover:shadow-md transition-shadow group cursor-pointer">
                        <div>
                          <h3 className="font-semibold text-foreground text-lg mb-1">{item.topic || "Untitled"}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="capitalize font-bold text-primary">{item.type.replace("_", " ")}</span>
                            <span>•</span>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete("explore_history", item.id); }} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
