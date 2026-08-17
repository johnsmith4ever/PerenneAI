"use client";

import { useEffect, useState } from "react";
import { Target, Brain, BookOpen, AlertTriangle, ArrowRight, Loader2, PlayCircle, Zap, CheckCircle2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { insertHistoryAction, deleteHistoryAction, fetchUserHistoryAction, upsertChatAction } from "@/actions/supabase";
import { cn } from "@/lib/utils";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

import { MemoizedQuestionText } from "@/components/memoized-question-text";

type WeakArea = {
  topic: string;
  subject: string;
  source: "Exam Sim" | "Quiz" | "Flashcards" | "Maths Solver";
  failedCount: number;
  totalCount: number;
  errorRate: number;
  details: any[];
};

const inferSubject = (topic: string) => {
  const t = topic.toLowerCase();
  if (t.includes("math") || t.includes("algebra") || t.includes("calc") || t.includes("number")) return "Maths";
  if (t.includes("bio") || t.includes("cell") || t.includes("mitosis") || t.includes("heart") || t.includes("plant") || t.includes("dna")) return "Biology";
  if (t.includes("chem") || t.includes("atom") || t.includes("bond") || t.includes("acid")) return "Chemistry";
  if (t.includes("phys") || t.includes("force") || t.includes("energy") || t.includes("wave")) return "Physics";
  if (t.includes("geo") || t.includes("tectonic") || t.includes("plate") || t.includes("river") || t.includes("coast")) return "Geography";
  if (t.includes("hist") || t.includes("war") || t.includes("king") || t.includes("empire")) return "History";
  if (t.includes("eng") || t.includes("lit") || t.includes("shakespeare") || t.includes("poem")) return "English";
  return "Other";
};

export default function WeakAreasPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [essayStats, setEssayStats] = useState<{ averageScore: number; commonIssues: string[]; commonImprovements: string[] } | null>(null);
  const [retestModal, setRetestModal] = useState<WeakArea | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const subjects = ["Overview", "Biology", "Chemistry", "Physics", "Geography", "Maths", "Essay Writing", "Other"];

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [quizRes, essayRes] = await Promise.all([
          fetchUserHistoryAction("quiz_history"),
          fetchUserHistoryAction("essay_history")
        ]);

        const topicMap = new Map<string, WeakArea>();

        if (quizRes) {
          quizRes.forEach(q => {
            // Determine source — Maths prefix is definitive; otherwise check _quizSettings;
            // if neither, default to "Quiz" (NOT "Exam Sim") since most saved quizzes come from the quiz page
            let source: "Exam Sim" | "Quiz" | "Maths Solver" | "Flashcards" = "Quiz";
            const settings = q.questions?.[0]?._quizSettings;
            if (q.topic?.startsWith("Maths: ")) {
              source = "Maths Solver";
            } else if (settings) {
              source = settings.quizType !== undefined ? "Quiz" : settings.testSize !== undefined ? "Exam Sim" : "Quiz";
            }

            // Determine subject — _quizSettings.subject is most reliable when present
            let parsedSubject = "Other";
            if (q.topic?.startsWith("Maths: ")) {
              parsedSubject = "Maths";
            } else if (settings?.subject) {
              parsedSubject = settings.subject;
            } else {
              parsedSubject = inferSubject(q.topic);
            }

            const key = `${source}-${q.topic}`;
            if (!topicMap.has(key)) {
              topicMap.set(key, { topic: q.topic, subject: parsedSubject, source, failedCount: 0, totalCount: 0, errorRate: 0, details: [] });
            }
            
            const area = topicMap.get(key)!;
            
            if (source === "Maths Solver") {
              const quizErrorRate = 100 - (q.score || 0);
              area.failedCount += quizErrorRate;
              area.totalCount += 1;
              
              q.questions?.forEach((qq: any) => {
                const grading = qq.grading || {};
                const max = grading.marks_available || 1;
                const awarded = grading.marks_awarded ?? (grading.correct ? max : 0);
                const lost = Math.max(0, max - awarded);
                
                if (lost > 0) {
                  area.details.push({ question: qq.question, feedback: grading.feedback || "Lost marks on this question." });
                }
              });
            } else {
              q.questions?.forEach((qq: any) => {
                // Only count graded questions — skip ungraded ones
                if (!qq.grading) return;
                area.totalCount++;
                if (!qq.grading.correct) {
                  area.failedCount++;
                  area.details.push({ question: qq.question, feedback: qq.grading.feedback });
                }
              });
            }
          });
        }



        const calculated = Array.from(topicMap.values())
          .filter(a => a.totalCount > 0)
          .map(a => ({ 
            ...a, 
            errorRate: a.source === "Maths Solver" 
              ? Math.round(a.failedCount / a.totalCount) 
              : Math.round((a.failedCount / a.totalCount) * 100) 
          }))
          .sort((a, b) => b.errorRate - a.errorRate);

        setWeakAreas(calculated);

        if (essayRes && essayRes.length > 0) {
          let totalScore = 0;
          const issueCounts = new Map<string, number>();
          const improvementCounts = new Map<string, number>();
          
          essayRes.forEach(e => {
            totalScore += e.final_score || 0;
            if (Array.isArray(e.key_issues)) {
              e.key_issues.forEach((issue: string) => {
                issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
              });
            }
            if (Array.isArray(e.improvement_points)) {
              e.improvement_points.forEach((point: string) => {
                improvementCounts.set(point, (improvementCounts.get(point) || 0) + 1);
              });
            }
          });

          const averageScore = Math.round(totalScore / essayRes.length);
          const commonIssues = Array.from(issueCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
          const commonImprovements = Array.from(improvementCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

          setEssayStats({ averageScore, commonIssues, commonImprovements });
        }

      } catch (e) {
        console.error("Failed to load weak areas", e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isLoaded]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-serif">Analyzing your performance...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <p className="label-title m-0">Performance Analytics</p>
        </div>
        <h1 className="page-title font-serif m-0">Weak Areas</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Review the topics and questions you've struggled with across Exam Sim, Flashcards, and Maths Solver. 
          Focus your revision here to improve your grades.
        </p>
      </div>

      {!user ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6 animate-in fade-in">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
            <Target className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-3">Sign In Required</h1>
          <p className="text-muted-foreground max-w-sm mb-8">Your weak areas and performance data are tracked to your account. Sign in to see where to focus your revision.</p>
          <Link href="/sign-in" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-lg">
            Sign In to View Weak Areas
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => setActiveTab(sub)}
                className={cn("px-4 py-2 rounded-full text-sm font-bold transition-all", activeTab === sub ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted")}
              >
                {sub}
              </button>
            ))}
          </div>
          
          {activeTab === "Essay Writing" ? (
            <div className="animate-in fade-in space-y-6">
              {!essayStats ? (
                <div className="p-12 border-2 border-dashed border-border rounded-3xl bg-card/50 text-center">
                  <PenLine className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                  <h2 className="text-xl font-bold font-serif mb-2">No Essays Graded Yet</h2>
                  <p className="text-muted-foreground">Start using the Essay tool to get detailed feedback and track your writing progress.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-8 rounded-3xl border border-border bg-card/50 hover:shadow-xl transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none"></div>
                    <h3 className="text-lg font-bold font-serif text-foreground mb-4">Average Score</h3>
                    <div className="text-5xl font-bold text-primary mb-2">{essayStats.averageScore}<span className="text-2xl text-muted-foreground">/100</span></div>
                    <p className="text-sm text-muted-foreground">Across all graded essays</p>
                  </div>
                  
                  <div className="p-8 rounded-3xl border border-border bg-card/50 hover:shadow-xl transition-all relative overflow-hidden group">
                    <h3 className="text-lg font-bold font-serif text-foreground mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Common Issues</h3>
                    <ul className="space-y-3">
                      {essayStats.commonIssues.map((issue, i) => (
                        <li key={i} className="text-sm text-muted-foreground bg-background p-3 rounded-xl border border-border/50">{issue}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="p-8 rounded-3xl border border-border bg-card/50 hover:shadow-xl transition-all relative overflow-hidden group md:col-span-2">
                    <h3 className="text-lg font-bold font-serif text-foreground mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Actionable Improvements</h3>
                    <ul className="grid md:grid-cols-2 gap-4">
                      {essayStats.commonImprovements.map((point, i) => (
                        <li key={i} className="text-sm text-foreground bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 text-xs font-bold">{i+1}</span>
                          <span className="pt-0.5">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in space-y-12">
              {(() => {
                const filteredAreas = activeTab === "Overview" 
                  ? weakAreas 
                  : weakAreas.filter(a => a.subject === activeTab || (activeTab === "Other" && !["Biology", "Chemistry", "Physics", "Geography", "Maths", "Essay Writing"].includes(a.subject)));
                
                if (filteredAreas.length === 0) {
                  return (
                    <div className="p-12 border-2 border-dashed border-border rounded-3xl bg-card/50 text-center">
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                      <h2 className="text-xl font-bold font-serif mb-2">You're doing great!</h2>
                      <p className="text-muted-foreground">We couldn't find any significant weak areas for {activeTab}.</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-12">
                    {activeTab === "Overview" && (
                      <div className="p-8 rounded-3xl border border-border bg-card/50 shadow-sm overflow-hidden flex flex-col items-center">
                        <h3 className="text-xl font-bold font-serif mb-6 text-foreground w-full text-center">Error Percentage Heat Map</h3>
                        <div className="w-full max-w-2xl h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={
                              ["Biology", "Chemistry", "Physics", "Geography", "Maths", "Essay Writing"].map(sub => {
                                if (sub === "Essay Writing") {
                                  return { subject: sub, errorRate: essayStats ? Math.max(0, 100 - (essayStats.averageScore || 0)) : 0 };
                                }
                                const subAreas = weakAreas.filter(a => a.subject === sub || (sub === "Other" && !["Biology", "Chemistry", "Physics", "Geography", "Maths", "Essay Writing"].includes(a.subject)));
                                if (subAreas.length === 0) return { subject: sub, errorRate: 0 };
                                const avgError = subAreas.reduce((acc, a) => acc + a.errorRate, 0) / subAreas.length;
                                return { subject: sub, errorRate: Math.round(avgError) };
                              })
                            }>
                              <PolarGrid stroke="rgba(255,255,255,0.1)" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.3)" }} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
                                itemStyle={{ color: "#ef4444" }}
                                formatter={(value: any) => [`${value}%`, 'Error Rate']}
                              />
                              <Radar name="Error %" dataKey="errorRate" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 text-center">Topics further out from the center indicate a higher error percentage.</p>
                      </div>
                    )}
                    <div className="grid gap-6">
                      {filteredAreas.map((area, i) => (
                    <div key={i} className="p-6 md:p-8 rounded-3xl border border-border bg-card/50 hover:shadow-xl transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-500/5 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none"></div>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-background border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            {area.source === "Exam Sim" ? <Brain className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                            {area.source}
                          </span>
                          <span className="text-sm font-semibold text-red-500">
                            {area.errorRate}% Error Rate
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold font-serif text-foreground capitalize">
                          {area.topic.replace("Maths: ", "")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {area.source === "Maths Solver"
                            ? `Your average error rate is ${area.errorRate}% across ${area.totalCount} attempt${area.totalCount === 1 ? '' : 's'}.`
                            : `You got ${area.failedCount} out of ${area.totalCount} questions wrong in this topic.`
                          }
                        </p>
                      </div>

                      <div className="flex-shrink-0 w-full md:w-auto">
                        {area.source === "Maths Solver" ? (
                          <Link href={`/math-solver?topic=${encodeURIComponent(area.topic.replace("Maths: ", ""))}`}>
                            <Button className="w-full md:w-auto gap-2 rounded-xl" size="lg">
                              <PlayCircle className="w-5 h-5" /> Re-test Weak Points
                            </Button>
                          </Link>
                        ) : (
                          <Button className="w-full md:w-auto gap-2 rounded-xl" size="lg" onClick={() => setRetestModal(area)}>
                            <PlayCircle className="w-5 h-5" /> Re-test Weak Points
                          </Button>
                        )}
                      </div>
                    </div>

                    {area.details.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-border/50">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">Specific Mistakes:</h4>
                        <ul className="space-y-3">
                          {area.details.slice(0, 3).map((d, idx) => (
                            <li key={idx} className="p-4 rounded-xl bg-background border border-border/50 text-sm">
                              <MemoizedQuestionText text={d.question} id={`weak-area-q-${i}-${idx}`} className="font-semibold text-foreground" />
                              {d.feedback && (
                                <span className="block mt-1 text-muted-foreground opacity-80">{d.feedback}</span>
                              )}
                            </li>
                          ))}
                          {area.details.length > 3 && (
                            <li className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center pt-2">
                              + {area.details.length - 3} more mistakes
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  )}

  {/* Re-test Modal */}
      {retestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold font-serif text-foreground">Choose Re-test Format</h2>
              <p className="text-sm text-muted-foreground mt-1">Select how you want to be tested on <strong>{retestModal.topic}</strong></p>
            </div>
            <div className="p-6 space-y-4">
              <Link href={`/quiz?topic=${encodeURIComponent(retestModal.topic)}&retest=true`}>
                <div className="p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Quiz Maker</h3>
                    <p className="text-sm text-muted-foreground mt-1">Re-do this topic with new questions using the exact same settings you used previously (e.g. GCSE, 5 questions).</p>
                  </div>
                </div>
              </Link>
              
              <Link href={`/quiz/exam-sim?topic=${encodeURIComponent(retestModal.topic)}&mode=aqa`}>
                <div className="p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Exam Sim (AQA Styled)</h3>
                    <p className="text-sm text-muted-foreground mt-1">Take a strict, timed exam simulator following official AQA standards.</p>
                  </div>
                </div>
              </Link>

              <Link href={`/quiz/exam-sim?topic=${encodeURIComponent(retestModal.topic)}&mode=freestyle`}>
                <div className="p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Exam Sim (Freestyle)</h3>
                    <p className="text-sm text-muted-foreground mt-1">Take a flexible, general knowledge exam simulator.</p>
                  </div>
                </div>
              </Link>
            </div>
            <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
              <Button variant="ghost" onClick={() => setRetestModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
