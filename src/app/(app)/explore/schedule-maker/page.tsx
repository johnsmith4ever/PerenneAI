"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Clock, Sparkles, Loader2, BookOpen, Sunrise, Sunset, Flame, Calendar, Save, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription, ModelType } from "@/hooks/use-subscription";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

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
  const { deductCredits, tier } = useSubscription();
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
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Explore
          </Link>
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
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold font-serif mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
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
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Routine Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Early Bird", "Balanced", "Night Owl"].map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={cn(
                        "py-2 px-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-all flex flex-col items-center gap-1",
                        style === s ? getStyleColor(s) : "bg-background border-border text-muted-foreground hover:bg-muted"
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
                  className="w-full py-6 text-sm font-bold shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0 text-white"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Crafting Routine...</>
                  ) : (
                    <><Clock className="w-5 h-5 mr-2" /> Generate Schedule</>
                  )}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground mt-3 font-medium uppercase tracking-widest">
                  Uses DeepSeek Flash • Costs Credits
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SCHEDULE PANEL (Right) */}
        <div className="lg:col-span-8">
          {!schedule ? (
            <div className="h-full min-h-[500px] border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-card/30">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-serif mb-2">Ready to plan?</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Fill out your parameters on the left and our AI will build a comprehensive, realistic, and highly effective 7-day schedule for you.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
              
              {/* Output Header */}
              <div className="flex items-start justify-between bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -z-10 blur-2xl" />
                <div>
                  <h2 className="text-2xl font-bold font-serif mb-2">{schedule.title}</h2>
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className={cn("px-2 py-0.5 rounded-full border", getStyleColor(style))}>{style}</span>
                    <span>•</span>
                    <span>{hours} hrs/day</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/calendar">
                    <Button variant="secondary" size="sm" className="hidden sm:flex gap-2">
                      <Calendar className="w-4 h-4" /> Open in Calendar
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsSaved(true)}
                    disabled={isSaved}
                    className={cn("hidden sm:flex gap-2 transition-all", isSaved && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20")}
                  >
                    {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} 
                    {isSaved ? "Saved" : "Save"}
                  </Button>
                </div>
              </div>

              {/* Tips */}
              <div className="grid sm:grid-cols-3 gap-3">
                {schedule.tips.slice(0, 3).map((tip, i) => (
                  <div key={i} className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mb-2">
                      {i + 1}
                    </div>
                    <p className="text-xs font-medium leading-relaxed">{tip}</p>
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
                      "px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 border",
                      selectedDay === i 
                        ? "bg-foreground text-background border-foreground shadow-md" 
                        : "bg-card border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {day.day}
                  </button>
                ))}
              </div>

              {/* Daily Timeline View */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative">
                
                {/* Timeline Line */}
                <div className="absolute left-[88px] top-8 bottom-8 w-px bg-border hidden sm:block" />

                <div className="space-y-6">
                  {schedule.days[selectedDay].blocks.map((block, i) => (
                    <div key={block.id} className="relative flex flex-col sm:flex-row gap-4 sm:gap-8 group animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                      
                      {/* Time */}
                      <div className="sm:w-16 shrink-0 pt-1">
                        <p className="text-sm font-bold text-foreground tabular-nums">{block.startTime}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{block.endTime}</p>
                      </div>

                      {/* Timeline Dot */}
                      <div className="hidden sm:flex absolute left-[56px] top-2 w-2 h-2 rounded-full bg-background border-2 border-primary z-10 group-hover:scale-150 transition-transform" />

                      {/* Content Card */}
                      <div className={cn("flex-1 p-4 rounded-xl border transition-all hover:shadow-md", getBlockColor(block.type))}>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-sm">{block.title}</h4>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            {block.type}
                          </span>
                        </div>
                        <p className="text-xs opacity-80 leading-relaxed font-medium">
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
  );
}
