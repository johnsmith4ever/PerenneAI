"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Clock, Sparkles, Loader2, BookOpen, Sunrise, Sunset, Flame, Calendar, Save, Check, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription, ModelType, TIER_RANK } from "@/hooks/use-subscription";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { PaywallOverlay } from "@/components/ui/paywall";

// ─── TYPES ───────────────────────────────────────────────────────────────────────

type Block = {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  type: "study" | "break" | "sleep" | "other";
  details: string;
};

type Day = {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  blocks: Block[];
};

type Schedule = {
  title: string;
  tips: string[];
  days: Day[];
};

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

export default function ScheduleMakerPage() {
  const { tier, canAfford, deductCredits, isLoaded: subLoaded } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { user } = useUser();
  
  // Form State
  const [goal, setGoal] = useLocalStorage("sm_goal", "");
  const [subjects, setSubjects] = useLocalStorage("sm_subjects", "");
  const [hours, setHours] = useLocalStorage("sm_hours", "4");
  const [style, setStyle] = useLocalStorage("sm_style", "Balanced");
  const [intensity, setIntensity] = useLocalStorage("sm_intensity", "Normal");
  const [targets, setTargets] = useLocalStorage("sm_targets", "");
  const [days, setDays] = useLocalStorage("sm_days", "7");

  // UI State
  const [selectedDay, setSelectedDay] = useLocalStorage("sm_selectedDay", 0);
  const [schedule, setSchedule] = useLocalStorage<Schedule | null>("sm_schedule", null);

  useEffect(() => {
    const savedData = localStorage.getItem("explore_schedule_data");
    const savedTopic = localStorage.getItem("explore_schedule_topic");
    if (savedData && savedTopic) {
      setSchedule(JSON.parse(savedData));
      setGoal(savedTopic);
      localStorage.removeItem("explore_schedule_data");
      localStorage.removeItem("explore_schedule_topic");
    }
  }, []);

  const generateSchedule = async () => {
    if (!goal || !subjects) return;
    setLoading(true);
    setIsSaved(false);
    const model: ModelType = "Apollo V4 Flash";
    
    try {
      const res = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, subjects, hours, style, intensity, targets, days }),
      });
      
      const data = await res.json();
      if (data.status === "success") {
        deductCredits(150, 400, model, "other");
        setSchedule(data.data);
        setSelectedDay(0);
        
        if (user) {
          await supabase.from("explore_history").insert({
            user_id: user.id,
            topic: goal || "Untitled Schedule",
            type: "schedule",
            data: data.data
          });
        }
      } else {
        alert("Failed to generate schedule: " + data.message);
      }
    } catch (e) {
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStyleColor = (s: string) => {
    if (s === "Early Bird") return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    if (s === "Night Owl") return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  };

  const getBlockColor = (type: string) => {
    switch (type) {
      case "study": return "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300";
      case "break": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300";
      case "sleep": return "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300";
      default: return "bg-muted/50 border-border text-muted-foreground";
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in relative">
      {subLoaded && tierRank < TIER_RANK.Core && (
        <PaywallOverlay 
          tierRequired="Core"
          title="Schedule Maker Locked"
          description="Upgrade to the Core plan to auto-generate personalized study schedules."
        />
      )}
      <div className={cn(tierRank < TIER_RANK.Core && "opacity-20 pointer-events-none blur-[2px]")}>
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>

          <p className="label-title mb-1.5 font-sans flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Schedule Maker
          </p>
          <h1 className="page-title font-serif">The Perfect Week</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Let AI craft the ultimate study routine based on your goals, habits, and circadian rhythm.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* SETUP PANEL (Left) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full -z-10 blur-2xl" />
            <h2 className="text-lg font-bold font-serif mb-6 flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Your Parameters
            </h2>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Main Goal</label>
                <input 
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="e.g. A-Level Exams in June"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Subjects / Topics</label>
                <textarea 
                  value={subjects}
                  onChange={e => setSubjects(e.target.value)}
                  placeholder="e.g. Maths (Calculus), Physics (Mechanics), Chemistry (Organic)"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Specific Targets (Optional)</label>
                <textarea 
                  value={targets}
                  onChange={e => setTargets(e.target.value)}
                  placeholder="e.g. Finish past paper 2023, Read chapters 4-6"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Target Study Hours / Day</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" min="1" max="12" step="0.5"
                      value={hours} onChange={e => setHours(e.target.value)}
                      className="flex-1 accent-primary"
                    />
                    <div className="w-16 text-center font-bold text-sm bg-muted rounded-lg py-1 border border-border shrink-0">
                      {hours}h
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">How Many Days?</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" min="1" max="14" step="1"
                      value={days} onChange={e => setDays(e.target.value)}
                      className="flex-1 accent-primary"
                    />
                    <div className="w-16 text-center font-bold text-sm bg-muted rounded-lg py-1 border border-border shrink-0">
                      {days}d
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Intensity (Pacing)</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Chill", "Normal", "Stressed"].map(i => (
                    <button
                      key={i}
                      onClick={() => setIntensity(i)}
                      className={cn(
                        "py-2 px-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-all flex flex-col items-center gap-1",
                        intensity === i 
                          ? "bg-primary/10 border-primary text-primary" 
                          : "bg-background border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span className="text-xl mb-0.5">
                        {i === "Chill" && "🏖️"}
                        {i === "Normal" && "⚖️"}
                        {i === "Stressed" && "🔥"}
                      </span>
                      <span>{i}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Routine Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Early Bird", "Balanced", "Night Owl"].map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={cn(
                        "py-2 px-1 text-[11px] font-bold uppercase tracking-wider rounded-xl border transition-all flex flex-col items-center gap-1",
                        style === s ? getStyleColor(s) : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      {s === "Early Bird" && <Sunrise className="w-4 h-4" />}
                      {s === "Balanced" && <Flame className="w-4 h-4" />}
                      {s === "Night Owl" && <Sunset className="w-4 h-4" />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={generateSchedule} 
                  disabled={loading || !goal || !subjects}
                  className="w-full py-6 text-sm font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0 text-white rounded-xl transition-all hover:scale-[1.02]"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Crafting Routine...</>
                  ) : (
                    <><Clock className="w-5 h-5 mr-2" /> Generate Schedule</>
                  )}
                </Button>
                <p className="text-center text-[10px] text-slate-500 mt-3 font-medium uppercase tracking-widest">
                  Uses DeepSeek Flash • Costs Credits
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SCHEDULE PANEL (Right) */}
        <div className="lg:col-span-8">
          {!schedule ? (
            <div className="h-full min-h-[500px] border border-white/10 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-black/20 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent pointer-events-none" />
              <div className="w-20 h-20 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <Calendar className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold font-serif mb-3 text-white">Ready to plan?</h3>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                Fill out your parameters on the left and our AI will build a comprehensive, realistic, and highly effective 7-day schedule for you.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
              
              {/* Output Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl relative overflow-hidden gap-4">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -z-10 blur-3xl" />
                <div>
                  <h2 className="text-2xl font-bold font-serif mb-2 text-white">{schedule.title}</h2>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <span className={cn("px-2.5 py-1 rounded-full border", getStyleColor(style))}>{style}</span>
                    <span>•</span>
                    <span>{hours} hrs/day</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:self-auto self-stretch">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSchedule(null);
                      setIsSaved(false);
                    }}
                    className="flex-1 sm:flex-none gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4" /> Discard
                  </Button>
                  <Link href="/calendar" className="flex-1 sm:flex-none">
                    <Button variant="secondary" size="sm" className="w-full gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border-0">
                      <Calendar className="w-4 h-4" /> Open
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsSaved(true)}
                    disabled={isSaved}
                    className={cn("flex-1 sm:flex-none gap-2 transition-all rounded-xl border-white/10 bg-black/50 text-white hover:bg-white/10", isSaved && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30")}
                  >
                    {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} 
                    {isSaved ? "Saved" : "Save"}
                  </Button>
                </div>
              </div>

              {/* Tips */}
              <div className="grid sm:grid-cols-3 gap-3">
                {schedule.tips.slice(0, 3).map((tip, i) => (
                  <div key={i} className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 shadow-inner">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold mb-3">
                      {i + 1}
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-slate-300">{tip}</p>
                  </div>
                ))}
              </div>

              {/* Weekly Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {schedule.days.map((day, i) => (
                  <button
                    key={day.day}
                    onClick={() => setSelectedDay(i)}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-sm font-bold transition-all shrink-0 border shadow-sm",
                      selectedDay === i 
                        ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {day.day}
                  </button>
                ))}
              </div>

              {/* Daily Timeline View */}
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                
                {/* Timeline Line */}
                <div className="absolute left-[88px] sm:left-[104px] top-8 bottom-8 w-px bg-white/10 hidden sm:block" />

                <div className="space-y-6">
                  {schedule.days[selectedDay].blocks.map((block, i) => (
                    <div key={block.id} className="relative flex flex-col sm:flex-row gap-4 sm:gap-8 group animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                      
                      {/* Time */}
                      <div className="sm:w-20 shrink-0 pt-1 text-left sm:text-right">
                        <p className="text-sm font-bold text-white tabular-nums">{block.startTime}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{block.endTime}</p>
                      </div>

                      {/* Timeline Dot */}
                      <div className="hidden sm:flex absolute left-[72px] top-2 w-2 h-2 rounded-full bg-[#0a0a0a] border-2 border-blue-500 z-10 group-hover:scale-150 group-hover:bg-blue-500 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-300" />

                      {/* Content Card */}
                      <div className={cn("flex-1 p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1", getBlockColor(block.type))}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-sm text-white">{block.title}</h4>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-80 px-2 py-0.5 rounded-md bg-white/10">
                            {block.type}
                          </span>
                        </div>
                        <p className="text-xs opacity-90 leading-relaxed font-medium">
                          {block.details}
                        </p>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
