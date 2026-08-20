"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, Loader2, ThumbsUp, User as UserIcon, AlertTriangle, Lightbulb, Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { insertFeatureAction, deleteFeatureAction, fetchCommunityPostsAction } from "@/actions/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Leaderboard } from "@/components/leaderboard";
import { GamificationWrapper } from "@/components/gamification-wrapper";
import { useUpgradeModal } from "@/components/upgrade-modal";

type Post = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: "bug" | "feature" | "general";
  upvotes: number;
  created_at: string;
  author_name: string;
};

export default function CommunityPage() {
  const { user } = useUser();
  const { openUpgradeModal } = useUpgradeModal();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "feature" as "bug" | "feature" | "general"
  });

  const fetchPosts = async () => {
    try {
      const data = await fetchCommunityPostsAction();
        
      
      // Filter out the old test post that couldn't be deleted via DB
      const filtered = (data || []).filter(post => post.id !== "7eed7303-3e36-4785-b6a1-bc27c93b164a");
      setPosts(filtered);
    } catch (e: any) {
      // Fallback mock data if table doesn't exist yet
      setErrorMsg("Failed to load live database. Showing local preview.");
      setPosts([
        {
          id: "1",
          user_id: "system",
          title: "Welcome to the Perenne Community!",
          content: "This is the brand new feedback board. You can report bugs, request features, and discuss study strategies here.",
          type: "general",
          upvotes: 42,
          created_at: new Date().toISOString(),
          author_name: "Admin"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return openUpgradeModal("You must be signed in to create posts on the Community board.", "Sign In / Register", "/sign-in");
    if (!form.title || !form.content) return;
    
    setIsSubmitting(true);
    try {
      await insertFeatureAction("community_posts", {
        user_id: user.id,
        author_name: user.firstName || "Anonymous Student",
        title: form.title,
        content: form.content,
        type: form.type,
        upvotes: 1
      });
      
      
      
      setForm({ title: "", content: "", type: "feature" });
      setShowModal(false);
      fetchPosts();
    } catch (e: any) {
      alert("Failed to submit. Please ensure the 'community_posts' table exists in Supabase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteFeatureAction('community_posts', postId);
      
      fetchPosts();
    } catch (e: any) {
      alert("Failed to delete post: " + e.message);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "feature": return <Lightbulb className="w-4 h-4 text-amber-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bug": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "feature": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <p className="label-title mb-1.5 flex items-center gap-2">
            Forum
          </p>
          <h1 className="page-title font-serif flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            Community Board
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Report bugs, request new features, and discuss study strategies with other Perenne users.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New Post
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content: Posts */}
        <div className="flex-1 space-y-4">
          {errorMsg && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-600 font-medium">{errorMsg}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading community posts...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1 min-w-[50px]">
                      <button className="p-2 bg-muted/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-muted-foreground">
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-sm">{post.upvotes}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1", getTypeColor(post.type))}>
                          {getTypeIcon(post.type)} {post.type}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserIcon className="w-3 h-3" /> {post.author_name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                        {user?.id === post.user_id && (
                          <button 
                            onClick={() => handleDelete(post.id)}
                            className="p-1 ml-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete Post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-2 font-serif">{post.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Leaderboard */}
        <div className="w-full lg:w-80 shrink-0">
          <GamificationWrapper>
            <Leaderboard />
          </GamificationWrapper>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
            <h2 className="text-xl font-bold font-serif mb-6">Create Post</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Type</label>
                <div className="flex gap-2">
                  {(["bug", "feature", "general"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({...form, type: t})}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-sm font-semibold capitalize border transition-all flex items-center justify-center gap-2",
                        form.type === t 
                          ? getTypeColor(t) 
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {getTypeIcon(t)} {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Title</label>
                <input 
                  type="text" 
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="Summarize your post..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Details</label>
                <textarea 
                  value={form.content}
                  onChange={e => setForm({...form, content: e.target.value})}
                  placeholder="Provide more context, steps to reproduce, or why this feature would be useful..."
                  className="w-full h-32 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 mt-6 pt-2 border-t border-border/50">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  Submit Post
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
