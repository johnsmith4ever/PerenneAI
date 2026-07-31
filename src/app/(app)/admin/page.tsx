"use client";

import { useState, useEffect } from "react";
import { Lock, UserCheck, ShieldAlert, Zap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  tier: string;
  createdAt: number;
};

export default function AdminDashboardPage() {
  const [authLevel, setAuthLevel] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [pwdInput, setPwdInput] = useState("");
  const [error, setError] = useState(false);
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (authLevel === 4) {
      fetchUsers();
    }
  }, [authLevel]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.status === "success") {
        setUsers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdInput) return;
    
    setAuthenticating(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: authLevel, code: pwdInput }),
      });
      const data = await res.json();
      
      if (data.status === "success") {
        setAuthLevel((prev) => (prev + 1) as 1 | 2 | 3 | 4);
        setPwdInput("");
        setError(false);
      } else {
        setError(true);
      }
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setAuthenticating(false);
    }
  };

  const changeTier = async (userId: string, currentTier: string, direction: "up" | "down") => {
    const tiers = ["Free", "Core", "Pro", "Maximum"];
    const currentIndex = tiers.indexOf(currentTier);
    
    if (direction === "up" && currentIndex >= tiers.length - 1) return;
    if (direction === "down" && currentIndex <= 0) return;
    
    const newTier = tiers[direction === "up" ? currentIndex + 1 : currentIndex - 1];
    const actionText = direction === "up" ? "upgrade" : "downgrade";
    if (!confirm(`Are you sure you want to ${actionText} this user to ${newTier}?`)) return;

    setUpgrading(userId);
    try {
      const res = await fetch("/api/admin/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newTier }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setUsers(users.map(u => u.id === userId ? { ...u, tier: newTier } : u));
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert(`Failed to ${actionText} user`);
    } finally {
      setUpgrading(null);
    }
  };

  if (authLevel < 4) {
    return (
      <div className="min-h-[600px] flex items-center justify-center animate-in fade-in zoom-in duration-500">
        <div className="max-w-md w-full bg-card border border-border p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            {authLevel === 0 ? <Lock className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          
          <h1 className="text-2xl font-bold font-serif mb-2" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
            {authLevel === 0 && "Admin Access"}
            {authLevel === 1 && "Secondary Authentication"}
            {authLevel === 2 && "Tertiary Clearance"}
            {authLevel === 3 && "Final Override"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {authLevel === 0 && "Please enter the primary clearance code."}
            {authLevel === 1 && "Clearance Level 1 Accepted. Please enter the secondary code."}
            {authLevel === 2 && "Clearance Level 2 Accepted. Please enter the tertiary code."}
            {authLevel === 3 && "Clearance Level 3 Accepted. Please enter the final master override password."}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              {authLevel === 0 ? (
                <div className="flex gap-3 justify-center relative mt-4 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-12 h-16 border-2 rounded-lg flex items-center justify-center text-3xl font-mono bg-background transition-all",
                        error ? "border-red-500 text-red-500 bg-red-500/10" : 
                        pwdInput.length === i ? "border-primary ring-4 ring-primary/20" : 
                        pwdInput[i] ? "border-primary text-primary" :
                        "border-border text-foreground"
                      )}
                    >
                      {pwdInput[i] ? "•" : ""}
                    </div>
                  ))}
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pwdInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                      setPwdInput(val);
                      setError(false);
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-text z-10"
                    autoFocus
                  />
                </div>
              ) : (
                <input 
                  type="password"
                  value={pwdInput}
                  onChange={(e) => { setPwdInput(e.target.value); setError(false); }}
                  className={cn(
                    "w-full bg-background border px-4 py-3 rounded-xl text-center font-mono tracking-widest focus:outline-none focus:ring-2 transition-all",
                    error ? "border-red-500 focus:ring-red-500/50" : "border-border focus:ring-primary/50"
                  )}
                  placeholder="••••••••••••"
                  autoFocus
                />
              )}
              {error && <p className="text-xs text-red-500 mt-4 font-bold uppercase tracking-wider text-center">Invalid credentials</p>}
            </div>
            
            <Button type="submit" disabled={authenticating || !pwdInput} className="w-full h-12 rounded-xl text-md font-bold">
              {authenticating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {authLevel === 0 && "Verify Primary"}
                  {authLevel === 1 && "Authenticate Secondary"}
                  {authLevel === 2 && "Verify Tertiary"}
                  {authLevel === 3 && "Unlock Master Dashboard"} <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Auth Level 4 (Fully Authenticated)
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3 text-red-500" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
            <ShieldAlert className="w-8 h-8" /> Master Admin Control
          </h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono">Welcome back, Cius Unc. Total users: {users.length}</p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading} className="rounded-xl">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh Data"}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-bold text-xs">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Current Tier</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const name = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Unknown Name";
                const isMax = user.tier === "Maximum";
                return (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 12)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        user.tier === "Free" ? "bg-slate-500/10 text-slate-500" :
                        user.tier === "Core" ? "bg-blue-500/10 text-blue-500" :
                        user.tier === "Pro" ? "bg-amber-500/10 text-amber-500" :
                        "bg-red-500/10 text-red-500 border border-red-500/20"
                      )}>
                        {user.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button 
                        onClick={() => changeTier(user.id, user.tier, "down")} 
                        disabled={user.tier === "Free" || upgrading === user.id}
                        variant="ghost"
                        size="sm"
                        className={cn("rounded-lg font-bold text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10", user.tier === "Free" && "opacity-50")}
                      >
                        Downgrade
                      </Button>
                      <Button 
                        onClick={() => changeTier(user.id, user.tier, "up")} 
                        disabled={isMax || upgrading === user.id}
                        variant={isMax ? "ghost" : "default"}
                        size="sm"
                        className={cn("rounded-lg font-bold text-xs", isMax && "opacity-50")}
                      >
                        {upgrading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                          <>
                            {isMax ? <UserCheck className="w-3 h-3 mr-1.5" /> : <Zap className="w-3 h-3 mr-1.5" />}
                            {isMax ? "Max Level" : "Force Upgrade"}
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    No users found in Clerk database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
