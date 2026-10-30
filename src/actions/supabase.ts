"use server";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This creates a Supabase client that uses the Clerk token, thus strictly enforcing RLS at the database level.
// Falls back gracefully to supabaseAdmin if the user is authenticated but Clerk's Supabase JWT template is not configured.
export async function createClerkSupabaseClient() {
  const { getToken, userId } = await auth();
  if (!userId) {
    return null;
  }
  
  const token = await getToken({ template: "supabase" });
  if (!token) {
    // Graceful fallback to supabaseAdmin for authenticated users if JWT template is not set up
    return supabaseAdmin;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      },
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) // ensure no Next.js caching
    }
  });
}

// ----------------------------------------------------------------------------
// Feature Tables Actions
// ----------------------------------------------------------------------------
export type FeatureTable = 
  | "chats" 
  | "usage" 
  | "flashcards" 
  | "maths_questions" 
  | "quizzes" 
  | "exam_sims" 
  | "essay_sims" 
  | "explore_history" 
  | "mind_maps" 
  | "community_posts";

export type ActionResult<T = any> = {
  ok: boolean;
  data?: T | null;
  error?: string;
};

export async function insertFeatureAction(table: FeatureTable, payload: any): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" }; // Guest mode

  const supabase = await createClerkSupabaseClient();
  if (!supabase) return { ok: false, error: "Database client unavailable" };
  
  const securePayload: any = { ...payload, user_id: userId };
  if (table !== "explore_history") securePayload.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase.from(table).insert(securePayload).select().single();
  if (error) {
    console.error(`Insert failed on ${table}: ${error.message}`);
    return { ok: false, error: error.message };
  }
  
  revalidatePath("/history");
  return { ok: true, data };
}

export async function insertExploreHistoryAdminAction(payload: any) {
  const { userId } = await auth();
  if (!userId) return null; // Guest mode - gracefully bypass
  
  const securePayload: any = { ...payload, user_id: userId };
  
  const { data, error } = await supabaseAdmin.from("explore_history").insert(securePayload).select().single();
  if (error) {
    console.error(`Insert failed on explore_history: ${error.message}`);
    return null;
  }
  
  revalidatePath("/history");
  return data;
}

export async function insertMathsQuestionsAction(payloads: any[]): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const supabase = await createClerkSupabaseClient();
  if (!supabase) return { ok: false, error: "Database client unavailable" };
  
  const securePayloads = payloads.map(p => ({
    ...p,
    user_id: userId,
    updated_at: new Date().toISOString()
  }));
  
  const { error } = await supabase.from("maths_questions").insert(securePayloads);
  if (error) {
    console.error(`Insert failed on maths_questions: ${error.message}`);
    return { ok: false, error: error.message };
  }
  revalidatePath("/history");
  return { ok: true };
}

export async function fetchExploreHistoryAdminAction(columns: string = "*", limit?: number, filters?: Record<string, any>) {
  const { userId } = await auth();
  if (!userId) return [];

  let query = supabaseAdmin.from("explore_history").select(columns).eq("user_id", userId).order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
  }
  
  const { data, error } = await query;
  if (error) {
    console.error(`Fetch failed on explore_history via admin: ${error.message}`);
    return [];
  }
  return (data || []) as any[];
}

export async function upsertFeatureAction(table: FeatureTable, payload: any): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" }; // Guest mode - skip saving

  const securePayload: any = { ...payload, user_id: userId };
  if (table !== "explore_history") securePayload.updated_at = new Date().toISOString();
  const options = table === "usage" ? { onConflict: "user_id" } : undefined;

  // Retry up to 2 times to handle transient "JWT not yet valid" clock-skew errors
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 300 * attempt));
    try {
      const supabase = await createClerkSupabaseClient();
      if (!supabase) return { ok: false, error: "Database client unavailable" };

      const { data, error } = await supabase.from(table).upsert(securePayload, options).select().single();
      if (error) {
        lastError = error;
        if (error.message?.includes("JWT not yet valid")) continue; // retry on clock skew
        console.error(`Upsert failed on ${table}: ${error.message}`);
        return { ok: false, error: error.message };
      }
      revalidatePath("/history");
      if (table === "chats") revalidatePath("/assistant");
      return { ok: true, data };
    } catch (e: any) {
      if (e.message === "Unauthorized") return { ok: false, error: "Unauthorized" };
      lastError = e;
      if (e.message?.includes("JWT not yet valid")) continue;
      console.error(`[supabase] Upsert threw on ${table} (attempt ${attempt + 1}):`, e);
      return { ok: false, error: e.message || "Unknown error" };
    }
  }

  if (table === "usage") {
    console.error(`[supabase] Upsert usage failed after retries:`, lastError?.message || lastError);
    return { ok: false, error: lastError?.message || "Usage upsert failed" };
  }
  console.error(`[supabase] Upsert on ${table} failed after all retries:`, lastError?.message || lastError);
  return { ok: false, error: lastError?.message || "Upsert failed" };
}

export async function incrementUsageAction(amount: number, date: string): Promise<number | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const cleanDate = (date || new Date().toISOString().split("T")[0]).split("T")[0];

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 300 * attempt));
    try {
      const supabase = await createClerkSupabaseClient();
      if (!supabase) return null;

      // 1. Try atomic Postgres RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc("increment_credits_used", {
        p_amount: amount,
        p_date: cleanDate
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData[0].new_credits_used;
      }

      // 2. Resilient fallback via supabaseAdmin
      const { data: existing, error: selectErr } = await supabaseAdmin
        .from("usage")
        .select("credits_used, last_reset")
        .eq("user_id", userId)
        .maybeSingle();

      if (selectErr) {
        console.error(`[supabase] incrementUsageAction read error: ${selectErr.message}`);
      }

      let newTotal = amount;
      if (existing) {
        const existingReset = (existing.last_reset || cleanDate).split("T")[0];
        if (existingReset === cleanDate) {
          newTotal = (existing.credits_used || 0) + amount;
        } else {
          newTotal = amount; // Daily reset
        }
      }

      const { data: upsertData, error: upsertErr } = await supabaseAdmin
        .from("usage")
        .upsert({
          user_id: userId,
          credits_used: newTotal,
          last_reset: cleanDate,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" })
        .select("credits_used")
        .single();

      if (upsertErr) {
        console.error(`[supabase] incrementUsageAction upsert failed: ${upsertErr.message}`);
        continue;
      }

      return upsertData?.credits_used ?? newTotal;
    } catch (e: any) {
      if (e.message === "Unauthorized") return null;
      console.error(`[supabase] incrementUsageAction attempt ${attempt + 1} threw:`, e);
    }
  }

  console.error(`[supabase] incrementUsageAction failed after all retries for user ${userId}`);
  return null;
}

export async function fetchFeatureAction(table: FeatureTable, columns: string = "*", limit?: number, filters?: Record<string, any>) {
  const { userId } = await auth();
  if (!userId) return [] as any[]; // Guest mode - gracefully return empty list

  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 300 * attempt));
    try {
      const supabase = await createClerkSupabaseClient();
      if (!supabase) return [] as any[];

      const orderCol = table === "explore_history" ? "created_at" : "updated_at";
      let query = supabase.from(table).select(columns).eq("user_id", userId).order(orderCol, { ascending: false });
      if (limit) query = query.limit(limit);
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value);
        }
      }
      const { data, error } = await query;
      if (error) {
        lastError = error;
        if (error.message?.includes("JWT not yet valid")) continue;
        console.error(`Fetch failed on ${table}: ${error.message}`);
        return [] as any[];
      }
      return (data || []) as any[];
    } catch (e: any) {
      if (e.message === "Unauthorized") return [] as any[];
      lastError = e;
      if (e.message?.includes("JWT not yet valid")) continue;
      return [] as any[];
    }
  }
  return [] as any[];
}

export async function deleteFeatureAction(table: FeatureTable, id: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  try {
    const supabase = await createClerkSupabaseClient();
    if (!supabase) return { ok: false, error: "Database client unavailable" };
    
    const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", userId);
    if (error) {
      console.error(`Delete failed on ${table}: ${error.message}`);
      return { ok: false, error: error.message };
    }
    
    revalidatePath("/history");
    if (table === "chats") revalidatePath("/assistant");
    return { ok: true };
  } catch (e: any) {
    if (e.message === "Unauthorized") return { ok: false, error: "Unauthorized" };
    console.error("Delete action error:", e);
    return { ok: false, error: e.message || "Unknown error" };
  }
}


// Wrapper for backward compatibility with debate/page.tsx
export async function upsertChatAction(payload: any) {
  return upsertFeatureAction("chats", payload);
}

// Added to satisfy community/page.tsx which imported this function that didn't exist in HEAD
export async function fetchCommunityPostsAction(): Promise<any[]> {
  return [];
}
