import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export async function KnowledgeWeb({ userId }: { userId?: string }) {
  if (!userId) return null;

  const daysToTrack = 84; // 12 weeks * 7 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToTrack + 1);
  const cutoff = startDate.toISOString();

  const [qRes, fRes, eRes, exRes] = await Promise.all([
    supabase.from("quiz_history").select("created_at").eq("user_id", userId).gte("created_at", cutoff),
    supabase.from("flashcards_history").select("created_at").eq("user_id", userId).gte("created_at", cutoff),
    supabase.from("essay_history").select("created_at").eq("user_id", userId).gte("created_at", cutoff),
    supabase.from("explore_history").select("created_at").eq("user_id", userId).gte("created_at", cutoff),
  ]);

  const counts: Record<string, number> = {};
  
  const processDates = (res: any) => {
    if (res.data) {
      res.data.forEach((row: any) => {
        // Simple local date conversion (assuming UTC is close enough to avoid complex timezone math for a heatmap)
        const d = new Date(row.created_at).toISOString().split("T")[0];
        counts[d] = (counts[d] || 0) + 1;
      });
    }
  };

  processDates(qRes);
  processDates(fRes);
  processDates(eRes);
  processDates(exRes);

  const totalActivity = Object.values(counts).reduce((a, b) => a + b, 0);

  const daysArray = [];
  for (let i = daysToTrack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateString = d.toISOString().split("T")[0];
    const count = counts[dateString] || 0;
    daysArray.push({ date: dateString, count });
  }

  // Determine color intensity
  const getColor = (count: number) => {
    if (count === 0) return "bg-white/5 border border-white/5";
    if (count <= 2) return "bg-amber-500/20 border border-amber-500/20";
    if (count <= 5) return "bg-amber-500/50 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]";
    return "bg-amber-500 border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)] text-white";
  };

  return (
    <div className="mb-8 pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            The Knowledge Web
          </h3>
          <p className="text-xs text-slate-400 mt-1">Your neural activity over the last 12 weeks.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-serif text-amber-500 leading-none">{totalActivity}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Interactions</p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-sm overflow-x-auto">
        {/* Heatmap Grid */}
        <div className="inline-grid grid-flow-col grid-rows-7 gap-1.5">
          {daysArray.map((day, i) => (
            <div 
              key={day.date} 
              title={`${day.count} interactions on ${day.date}`}
              className={cn(
                "w-3.5 h-3.5 rounded-[3px] transition-all duration-300 hover:scale-125 cursor-crosshair",
                getColor(day.count)
              )}
            />
          ))}
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          <span>Less</span>
          <div className="w-3 h-3 rounded-[2px] bg-white/5 border border-white/5" />
          <div className="w-3 h-3 rounded-[2px] bg-amber-500/20" />
          <div className="w-3 h-3 rounded-[2px] bg-amber-500/50" />
          <div className="w-3 h-3 rounded-[2px] bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
