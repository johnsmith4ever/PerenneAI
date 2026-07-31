"use client";

import { useState } from "react";
import { Loader2, Calendar, Send, Sparkles, Plus, X, Pencil, Trash, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useSubscription, ModelType } from "@/hooks/use-subscription";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Block = {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  type: string;
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

export default function CalendarPage() {
  const { deductCredits, canAfford, isLoaded: subLoaded } = useSubscription();
  const [schedule, setSchedule] = useLocalStorage<Schedule | null>("sm_schedule", null);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  
  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // Manual Add/Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBlockId, setEditBlockId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    title: "",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    day: "Monday",
    type: "study"
  });

  const timeOptions: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (let m of ["00", "30"]) {
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      timeOptions.push(`${displayH}:${m} ${ampm}`);
    }
  }

  const colorOptions = [
    { value: "study", label: "Study (Blue)", className: "bg-blue-500" },
    { value: "break", label: "Break (Emerald)", className: "bg-emerald-500" },
    { value: "sleep", label: "Sleep (Indigo)", className: "bg-indigo-500" },
    { value: "red", label: "Red", className: "bg-red-500" },
    { value: "orange", label: "Orange", className: "bg-orange-500" },
    { value: "amber", label: "Amber", className: "bg-amber-500" },
    { value: "green", label: "Green", className: "bg-green-500" },
    { value: "purple", label: "Purple", className: "bg-purple-500" },
    { value: "pink", label: "Pink", className: "bg-pink-500" },
  ];

  const getBlockColor = (type: string) => {
    switch (type) {
      case "study": return "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300";
      case "break": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300";
      case "sleep": return "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300";
      case "red": return "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300";
      case "orange": return "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-300";
      case "amber": return "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300";
      case "green": return "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300";
      case "purple": return "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300";
      case "pink": return "bg-pink-500/10 border-pink-500/20 text-pink-700 dark:text-pink-300";
      default: return "bg-muted/50 border-border text-muted-foreground";
    }
  };

  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 8;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const p = match[3].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h + m / 60;
  };

  const getLayoutBlocks = (blocks: Block[]) => {
    if (!blocks || blocks.length === 0) return [];
    
    const parsed = blocks.map(b => ({
      ...b,
      start: parseTime(b.startTime),
      end: parseTime(b.endTime)
    })).filter(b => b.start < 24 && b.end >= 6);
    
    parsed.sort((a, b) => a.start - b.start || a.end - b.end);

    const groups: Array<typeof parsed> = [];
    let currentGroup: typeof parsed = [];
    let currentGroupEnd = -1;

    for (const b of parsed) {
      if (b.start >= currentGroupEnd) {
        if (currentGroup.length > 0) groups.push(currentGroup);
        currentGroup = [b];
        currentGroupEnd = b.end;
      } else {
        currentGroup.push(b);
        currentGroupEnd = Math.max(currentGroupEnd, b.end);
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    const layoutBlocks = [];

    for (const group of groups) {
      const cols: Array<typeof parsed> = [];
      for (const b of group) {
        let placed = false;
        for (let i = 0; i < cols.length; i++) {
          if (b.start >= cols[i][cols[i].length - 1].end) {
            cols[i].push(b);
            (b as any).col = i;
            placed = true;
            break;
          }
        }
        if (!placed) {
          (b as any).col = cols.length;
          cols.push([b]);
        }
      }
      
      const numCols = cols.length;
      for (const b of group) {
        const top = Math.max(0, ((b.start - 6) / 18) * 100);
        const height = Math.min(100 - top, ((b.end - b.start) / 18) * 100);
        const width = 100 / numCols;
        const left = width * (b as any).col;
        
        layoutBlocks.push({
          ...b,
          top: `${top}%`,
          height: `${height}%`,
          width: `${width}%`,
          left: `${left}%`
        });
      }
    }
    
    return layoutBlocks;
  };

  const getEmptySchedule = (): Schedule => ({
    title: "My Calendar",
    tips: [],
    days: [
      { day: "Monday", blocks: [] },
      { day: "Tuesday", blocks: [] },
      { day: "Wednesday", blocks: [] },
      { day: "Thursday", blocks: [] },
      { day: "Friday", blocks: [] },
      { day: "Saturday", blocks: [] },
      { day: "Sunday", blocks: [] }
    ]
  });

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPrompt || !subLoaded) return;
    
    if (!canAfford(200, "Bastion 3.5 Flash")) {
      alert("You do not have enough daily credits to redesign your schedule. Please try again tomorrow or upgrade your plan.");
      return;
    }
    
    const currentSchedule = schedule || getEmptySchedule();
    setAgentLoading(true);
    try {
      const res = await fetch("/api/calendar-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: agentPrompt, scheduleDays: currentSchedule.days }),
      });
      const data = await res.json();
      if (data.status === "success") {
        deductCredits(100, 300, "Bastion 3.5 Flash", "other");
        setSchedule({ ...currentSchedule, days: data.data });
        setAgentPrompt("");
      } else {
        alert("Failed to redesign: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred");
    } finally {
      setAgentLoading(false);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.title) return;

    const currentSchedule = schedule || getEmptySchedule();
    const dayIndex = currentSchedule.days.findIndex(d => d.day === addForm.day);
    if (dayIndex === -1) return;

    const newDays = [...currentSchedule.days];

    if (editBlockId) {
      // Edit existing
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        blocks: newDays[dayIndex].blocks.map(b => b.id === editBlockId ? {
          ...b,
          title: addForm.title,
          startTime: addForm.startTime,
          endTime: addForm.endTime,
          type: addForm.type
        } : b)
      };
      
      // If day was changed during edit, we need to move it
      const originalDayIndex = currentSchedule.days.findIndex(d => d.blocks.some(b => b.id === editBlockId));
      if (originalDayIndex !== -1 && originalDayIndex !== dayIndex) {
        const blockToMove = newDays[originalDayIndex].blocks.find(b => b.id === editBlockId);
        newDays[originalDayIndex] = {
          ...newDays[originalDayIndex],
          blocks: newDays[originalDayIndex].blocks.filter(b => b.id !== editBlockId)
        };
        if (blockToMove) {
          newDays[dayIndex].blocks.push(blockToMove);
        }
      }
    } else {
      // Add new
      const newBlock: Block = {
        id: "man_" + Math.random().toString(36).substring(2, 9),
        title: addForm.title,
        startTime: addForm.startTime,
        endTime: addForm.endTime,
        type: addForm.type,
        details: "Manually added event"
      };
      newDays[dayIndex] = { 
        ...newDays[dayIndex], 
        blocks: [...newDays[dayIndex].blocks, newBlock] 
      };
    }
    
    setSchedule({ ...currentSchedule, days: newDays });
    setShowAddModal(false);
    setEditBlockId(null);
    setAddForm(prev => ({ ...prev, title: "" }));
  };

  const handleDelete = () => {
    if (!editBlockId) return;
    const currentSchedule = schedule || getEmptySchedule();
    const newDays = currentSchedule.days.map(d => ({
      ...d,
      blocks: d.blocks.filter(b => b.id !== editBlockId)
    }));
    setSchedule({ ...currentSchedule, days: newDays });
    setShowAddModal(false);
    setEditBlockId(null);
  };

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>, dayStr: string) => {
    // Only in edit mode, when clicking the background
    if (e.target !== e.currentTarget) return; 

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percent = y / rect.height;
    
    // Grid goes from 6:00 to 24:00 (18 hours)
    const hoursFrom6 = percent * 18;
    const rawHour = 6 + hoursFrom6;
    
    const isHalfPast = (rawHour % 1) >= 0.5;
    const hour = Math.floor(rawHour);
    
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayH = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const mStr = isHalfPast ? "30" : "00";
    const startTime = `${displayH}:${mStr} ${ampm}`;
    
    const endHour = hour + 1;
    const endAmpm = endHour >= 24 ? "AM" : (endHour >= 12 ? "PM" : "AM");
    const endDisplayH = endHour > 12 ? endHour - 12 : (endHour === 0 ? 12 : endHour);
    const endTime = `${endDisplayH}:${mStr} ${endAmpm}`;

    setAddForm({ title: "", type: "study", day: dayStr, startTime, endTime });
    setEditBlockId(null);
    setShowAddModal(true);
  };

  const handleBlockClick = (block: Block, dayStr: string) => {
    if (!isEditMode) return;
    setAddForm({
      title: block.title,
      type: block.type,
      day: dayStr,
      startTime: block.startTime,
      endTime: block.endTime
    });
    setEditBlockId(block.id);
    setShowAddModal(true);
  };

  const currentSchedule = schedule || getEmptySchedule();

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in relative">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="label-title mb-1.5 font-sans flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Productivity Hub
          </p>
          <h1 className="page-title font-serif">Your Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              if (window.confirm("Are you sure you want to clear your current schedule? This cannot be undone.")) {
                setSchedule(getEmptySchedule());
                setSelectedDayIndex(0);
              }
            }}
            variant="outline"
            className="gap-2 hidden sm:flex text-red-500 border-red-500/20 hover:bg-red-500/10"
          >
            <Trash className="w-4 h-4" /> Clear Schedule
          </Button>
          <Button 
            onClick={() => setIsEditMode(!isEditMode)} 
            variant={isEditMode ? "default" : "outline"}
            className={cn("gap-2", isEditMode && "bg-purple-600 hover:bg-purple-700 text-white")}
          >
            <Pencil className="w-4 h-4" /> {isEditMode ? "Done Editing" : "Edit Mode"}
          </Button>
          {!isEditMode && (
            <Link href="/explore/schedule-maker">
              <Button variant="outline" className="gap-2 hidden sm:flex">
                <Calendar className="w-4 h-4" /> Import Week
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Command & Manual Entry Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <form onSubmit={handleAgentSubmit} className="relative flex-1">
            <input 
              type="text"
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              placeholder="Ask Gemini to redesign... e.g., 'Move all Math to mornings'"
              disabled={agentLoading}
              className="w-full bg-card border border-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm disabled:opacity-50 font-medium"
            />
            <button 
              type="submit" 
              disabled={agentLoading || !agentPrompt}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-lg disabled:opacity-50 transition-all hover:scale-105"
            >
              {agentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Day Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {currentSchedule.days.map((day, i) => (
            <button
              key={day.day}
              onClick={() => setSelectedDayIndex(i)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 border",
                selectedDayIndex === i 
                  ? "bg-foreground text-background border-foreground shadow-md" 
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {day.day}
            </button>
          ))}
        </div>

        {/* --- VIEW MODE: TIMELINE --- */}
        {!isEditMode && (
          <div className={cn("bg-card border border-border rounded-2xl p-6 shadow-sm relative transition-opacity", agentLoading && "opacity-50 pointer-events-none")}>
            <div className="absolute left-[88px] top-8 bottom-8 w-px bg-border hidden sm:block" />

            <div className="space-y-6">
              {currentSchedule.days[selectedDayIndex].blocks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No events scheduled for {currentSchedule.days[selectedDayIndex].day}.</p>
                  <p className="text-sm mt-1">Click "Edit Mode" or use the AI bar to get started!</p>
                </div>
              ) : (
                currentSchedule.days[selectedDayIndex].blocks
                  .slice()
                  .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime))
                  .map((block, i) => (
                  <div key={block.id} className="relative flex flex-col sm:flex-row gap-4 sm:gap-8 group animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
                    <div className="sm:w-16 shrink-0 pt-1">
                      <p className="text-sm font-bold text-foreground tabular-nums">{block.startTime}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{block.endTime}</p>
                    </div>
                    <div className="hidden sm:flex absolute left-[56px] top-2 w-2 h-2 rounded-full bg-background border-2 border-primary z-10 group-hover:scale-150 transition-transform" />
                    <div className={cn("flex-1 p-4 rounded-xl border transition-all hover:shadow-md", getBlockColor(block.type))}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm">{block.title}</h4>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{block.type}</span>
                      </div>
                      <p className="text-xs opacity-80 leading-relaxed font-medium">{block.details}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- EDIT MODE: OUTLOOK GRID --- */}
        {isEditMode && (
          <div className="bg-card border-2 border-purple-500/30 rounded-2xl p-4 pl-10 shadow-lg overflow-x-auto relative ring-4 ring-purple-500/10">
            <div className="absolute top-4 right-6 z-20 pointer-events-none">
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse border border-purple-200 shadow-sm">
                Click empty space to add
              </span>
            </div>
            
            <div className="min-w-[800px]">
              {/* Grid Header (All 7 Days) */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {currentSchedule.days.map(d => (
                  <div key={d.day} className="text-center font-bold text-xs uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
                    {d.day.slice(0, 3)}
                  </div>
                ))}
              </div>
              
              {/* Grid Body */}
              <div className="grid grid-cols-7 gap-2 h-[800px] relative">
                {/* Hour Lines (Background) */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-0">
                  {Array.from({ length: 19 }).map((_, i) => (
                    <div key={i} className="w-full border-t border-border/30 h-0 relative">
                      <span className="absolute -top-2 -left-8 text-[9px] text-muted-foreground bg-card pr-1 font-mono">{i + 6}:00</span>
                    </div>
                  ))}
                </div>

                {currentSchedule.days.map((d, colIndex) => {
                  const layoutBlocks = getLayoutBlocks(d.blocks);
                  return (
                    <div 
                      key={colIndex} 
                      className="relative h-full z-10 cursor-crosshair hover:bg-muted/30 transition-colors rounded-lg border border-transparent hover:border-border/50"
                      onClick={(e) => handleGridClick(e, d.day)}
                    >
                      {layoutBlocks.map(b => (
                        <div 
                          key={b.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBlockClick(b as Block, d.day);
                          }}
                          className={cn(
                            "absolute rounded-lg border p-2 overflow-hidden flex flex-col transition-all cursor-pointer shadow-sm hover:z-20 hover:scale-105 hover:shadow-xl ring-2 ring-transparent hover:ring-purple-500/50", 
                            getBlockColor(b.type), 
                            agentLoading && "opacity-50 grayscale"
                          )}
                          style={{ top: b.top, height: b.height, width: `calc(${b.width} - 4px)`, left: b.left }}
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5 block truncate pointer-events-none">{b.startTime} - {b.endTime}</span>
                          <span className="font-bold text-xs leading-tight pointer-events-none">{b.title}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-serif">{editBlockId ? "Edit Event" : "Add Event"}</h2>
              <button onClick={() => { setShowAddModal(false); setEditBlockId(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Subject / Title</label>
                <input 
                  type="text" 
                  value={addForm.title}
                  onChange={e => setAddForm({...addForm, title: e.target.value})}
                  placeholder="e.g. Biology Revision" 
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Day</label>
                  <select 
                    value={addForm.day}
                    onChange={e => setAddForm({...addForm, day: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Color Label</label>
                  <select 
                    value={addForm.type}
                    onChange={e => setAddForm({...addForm, type: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {colorOptions.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Start Time</label>
                  <select 
                    value={addForm.startTime}
                    onChange={e => setAddForm({...addForm, startTime: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">End Time</label>
                  <select 
                    value={addForm.endTime}
                    onChange={e => setAddForm({...addForm, endTime: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-2">
                {editBlockId && (
                  <Button type="button" variant="outline" onClick={handleDelete} className="flex-1 gap-2 text-red-500 border-red-500/20 hover:bg-red-500/10">
                    <Trash className="w-4 h-4" /> Delete
                  </Button>
                )}
                <Button type="submit" className={cn("gap-2", editBlockId ? "flex-1" : "w-full")}>
                  <Check className="w-4 h-4" /> {editBlockId ? "Save Changes" : "Add to Calendar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
