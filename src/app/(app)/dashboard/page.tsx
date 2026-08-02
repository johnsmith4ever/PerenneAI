import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowRight, BookOpen, BrainCircuit, Calendar, FileText, FlaskConical, LayoutDashboard, Lightbulb, List, MessageSquare, Network, PenLine, Sparkles, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { KnowledgeWeb } from "@/components/knowledge-web";
import { GamificationWrapper } from "@/components/gamification-wrapper";

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

      {/* Bento Box Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6">
        
        {/* Large Hero Card - Study Assistant */}
        <Link href="/assistant" className="group col-span-1 md:col-span-2 md:row-span-2 block rounded-3xl bg-white/5 border border-white/10 p-8 hover:bg-white/10 transition-all backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
            <MessageSquare className="w-48 h-48 text-amber-500 transform rotate-12" />
          </div>
          <div className="relative z-10 h-full flex flex-col">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6 border border-amber-500/30 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <MessageSquare className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-white mb-2">Study Assistant</h2>
            <p className="text-slate-400 text-lg max-w-sm mb-auto">Chat with our advanced AI to break down complex topics and instantly clarify your doubts.</p>
            
            <div className="mt-8 bg-black/40 border border-white/10 rounded-full p-2 flex items-center gap-4 max-w-md w-full">
              <div className="flex-1 bg-transparent px-4 text-sm text-slate-500">Ask a question to start...</div>
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Link>

        {/* Medium Card - Essay Grader */}
        <Link href="/essay" className="group col-span-1 md:col-span-1 block rounded-3xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-all backdrop-blur-sm flex flex-col justify-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-4 border border-orange-500/30 group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6 text-orange-400" />
          </div>
          <h3 className="text-xl font-serif font-bold text-white mb-2">Essay Grader</h3>
          <p className="text-slate-400 text-sm">Get brutal, accurate feedback on your essays with paragraph rewrites.</p>
        </Link>

        {/* Medium Card - Note Summarizer */}
        <Link href="/explore/note-summarizer" className="group col-span-1 md:col-span-1 block rounded-3xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-all backdrop-blur-sm flex flex-col justify-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30 group-hover:scale-110 transition-transform">
            <List className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-xl font-serif font-bold text-white mb-2">Note Summarizer</h3>
          <p className="text-slate-400 text-sm">Turn messy notes into structured, perfectly formatted study guides.</p>
        </Link>
      </div>

      {/* Secondary Tools Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/flashcards" className="group rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-all">
          <BookOpen className="w-6 h-6 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-white text-sm mb-1">Flashcards</h4>
          <p className="text-xs text-slate-500">Spaced repetition</p>
        </Link>
        <Link href="/quiz" className="group rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-all">
          <PenLine className="w-6 h-6 text-red-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-white text-sm mb-1">Adaptive Quizzes</h4>
          <p className="text-xs text-slate-500">Find your weak spots</p>
        </Link>
        <Link href="/explore/schedule-maker" className="group rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-all">
          <Calendar className="w-6 h-6 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-white text-sm mb-1">Schedule Maker</h4>
          <p className="text-xs text-slate-500">Optimize revision</p>
        </Link>
        <Link href="/mindmaps" className="group rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-all">
          <Network className="w-6 h-6 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-white text-sm mb-1">Mindmaps</h4>
          <p className="text-xs text-slate-500">Visualize concepts</p>
        </Link>
      </div>
      
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
    supabase.from("quiz_history").select("id, topic, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
    supabase.from("flashcards_history").select("id, title, topic, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
    supabase.from("essay_history").select("id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
    supabase.from("explore_history").select("id, type, topic, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
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
