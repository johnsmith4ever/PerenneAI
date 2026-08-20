import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowRight, BookOpen, BrainCircuit, Calendar, FileText, FlaskConical, LayoutDashboard, Lightbulb, List, MessageSquare, Network, PenLine, Sparkles, TrendingUp, Zap, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { KnowledgeWeb } from "@/components/knowledge-web";
import { GamificationWrapper } from "@/components/gamification-wrapper";
import { AqaTextbookSearch } from "@/components/aqa-search";

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName || "Student";

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-8 md:p-12 shadow-2xl isolate">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute w-[400px] h-[400px] bg-amber-500/20 rounded-full blur-[100px] animate-[spin_10s_linear_infinite] origin-bottom-right top-[-100px] left-[-100px] pointer-events-none z-0"></div>
        <div className="absolute w-[350px] h-[350px] bg-orange-600/20 rounded-full blur-[90px] animate-[spin_15s_linear_infinite_reverse] origin-top-left bottom-[-100px] right-[-100px] pointer-events-none z-0"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-amber-500 text-xs font-semibold backdrop-blur-md mb-2">
            <Sparkles className="w-3 h-3" /> Welcome Back
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-black text-white tracking-tight">
            Feeling productive, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">{firstName}?</span>
          </h1>
          <p className="text-slate-400 max-w-xl text-lg">Pick up right where you left off, or dive into a new study session. The choice is yours.</p>
        </div>
      </div>

      {/* Bento Box Grid - only shown to signed-in users */}
      {user && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/weak-areas" className="group block rounded-3xl bg-red-500/5 border border-red-500/20 p-8 hover:bg-red-500/10 transition-all backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-48 h-48 text-red-500 transform rotate-12" />
          </div>
          <div className="relative z-10 h-full flex flex-col">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/30 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <TrendingUp className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-white mb-2">Access Weak Points</h2>
            <p className="text-slate-400 text-lg max-w-sm mb-auto">Review your mistakes across Exams, Quizzes, and Math Solver to target your revision.</p>
            
            <div className="mt-8 bg-black/40 border border-white/10 rounded-full p-2 flex items-center gap-4 max-w-sm w-full">
              <div className="flex-1 bg-transparent px-4 text-sm font-semibold text-red-400">Improve your grades</div>
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/history" className="group block rounded-3xl bg-purple-500/5 border border-purple-500/20 p-8 hover:bg-purple-500/10 transition-all backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-48 h-48 text-purple-500 transform -rotate-12" />
          </div>
          <div className="relative z-10 h-full flex flex-col">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Clock className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-white mb-2">View History</h2>
            <p className="text-slate-400 text-lg max-w-sm mb-auto">Look back at all of your past generated flashcards, solved math problems, and essays.</p>
            
            <div className="mt-8 bg-black/40 border border-white/10 rounded-full p-2 flex items-center gap-4 max-w-sm w-full">
              <div className="flex-1 bg-transparent px-4 text-sm font-semibold text-purple-400">View past sessions</div>
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Link>
      </div>
      )}
      
      <AqaTextbookSearch />
      
      <GamificationWrapper>
        <KnowledgeWeb userId={user?.id} />
      </GamificationWrapper>
      
      {/* Recent Activity */}
      <div className="pt-2">
        <h3 className="text-lg font-serif font-bold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <RecentActivitiesList userId={user?.id} />
        </div>
      </div>
      
    </div>
  );
}

async function RecentActivitiesList({ userId }: { userId?: string }) {
  if (!userId) return null;
  
  const [quizRes, flashRes, essayRes, exploreRes] = await Promise.all([
    supabase.from("quizzes").select("id, topic, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
    supabase.from("flashcards").select("id, title, topic, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
    supabase.from("essay_sims").select("id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
    supabase.from("explore").select("id, type, topic, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
  ]);

  const activities: { id: string, title: string, tool_name: string, created_at: string }[] = [];

  if (quizRes.data) {
    quizRes.data.forEach(q => activities.push({
      id: "quiz_" + q.id, title: q.topic || "Untitled Quiz", tool_name: "Adaptive Quizzes", created_at: q.created_at
    }));
  }
  if (flashRes.data) {
    flashRes.data.forEach(f => activities.push({
      id: "flash_" + f.id, title: f.title || f.topic || "Untitled Deck", tool_name: "Flashcards", created_at: f.created_at
    }));
  }
  if (essayRes.data) {
    essayRes.data.forEach(e => activities.push({
      id: "essay_" + e.id, title: "Essay Evaluated", tool_name: "Essay Grader", created_at: e.created_at
    }));
  }
  if (exploreRes.data) {
    exploreRes.data.forEach(e => {
      let toolName = e.type || "Explore Tool";
      if (e.type === "schedule") toolName = "Schedule Maker";
      if (e.type === "note_summary") toolName = "Note Summarizer";
      if (e.type === "pro_con") toolName = "Pro / Con";
      if (e.type === "presentation") toolName = "Presentation Builder";
      if (e.type === "mindmap") toolName = "Mindmap";
      
      activities.push({
        id: "exp_" + e.id, title: e.topic || "Generation", tool_name: toolName, created_at: e.created_at
      });
    });
  }

  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const topActivities = activities.slice(0, 3);

  if (topActivities.length === 0) {
    return (
      <div className="px-5 py-8 rounded-2xl bg-white/5 border border-white/10 text-center">
        <p className="text-slate-400 text-sm">No recent activity yet. Start using tools to build your history!</p>
      </div>
    );
  }

  return (
    <>
      {topActivities.map((activity) => (
        <div key={activity.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/5">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-white text-sm font-bold">{activity.title}</p>
            <p className="text-slate-500 text-xs">
              {activity.tool_name} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
