"use server";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This creates a Supabase client that uses the Clerk token, thus strictly enforcing RLS at the database level.
export async function createClerkSupabaseClient() {
  const { getToken } = await auth();
  const token = await getToken({ template: "supabase" });
  
  if (!token) {
    throw new Error("Unauthorized");
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
type FeatureTable = "chats" | "usage" | "flashcards" | "maths_questions" | "quizzes" | "exam_sims" | "essay_sims" | "explore_history" | "mind_maps" | "community_posts";

export async function insertFeatureAction(table: FeatureTable, payload: any) {
  const supabase = await createClerkSupabaseClient();
  const { userId } = await auth();
  
  const securePayload: any = { ...payload, user_id: userId };
  if (table !== "explore_history") securePayload.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase.from(table).insert(securePayload).select().single();
  if (error) throw new Error(`Insert failed on ${table}: ${error.message}`);
  
  revalidatePath("/history");
  return data;
}

export async function insertExploreHistoryAdminAction(payload: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  const securePayload: any = { ...payload, user_id: userId };
  
  const { data, error } = await supabaseAdmin.from("explore_history").insert(securePayload).select().single();
  if (error) throw new Error(`Insert failed on explore_history: ${error.message}`);
  
  revalidatePath("/history");
  return data;
}

export async function insertMathsQuestionsAction(payloads: any[]) {
  const supabase = await createClerkSupabaseClient();
  const { userId } = await auth();
  
  const securePayloads = payloads.map(p => ({
    ...p,
    user_id: userId,
    updated_at: new Date().toISOString()
  }));
  
  const { error } = await supabase.from("maths_questions").insert(securePayloads);
  if (error) throw new Error(`Insert failed on maths_questions: ${error.message}`);
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

export async function upsertFeatureAction(table: FeatureTable, payload: any) {
  const { userId } = await auth();
  const securePayload: any = { ...payload, user_id: userId };
  if (table !== "explore_history") securePayload.updated_at = new Date().toISOString();
  const options = table === "usage" ? { onConflict: "user_id" } : undefined;

  // Retry up to 2 times to handle transient "JWT not yet valid" clock-skew errors
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 300 * attempt));
    try {
      const supabase = await createClerkSupabaseClient();
      const { data, error } = await supabase.from(table).upsert(securePayload, options).select().single();
      if (error) {
        lastError = error;
        if (error.message?.includes("JWT not yet valid")) continue; // retry on clock skew
        throw new Error(`Upsert failed on ${table}: ${error.message}`);
      }
      revalidatePath("/history");
      if (table === "chats") revalidatePath("/assistant");
      return data;
    } catch (e: any) {
      lastError = e;
      if (e.message?.includes("JWT not yet valid")) continue;
      throw e;
    }
  }

  // After retries: for non-critical tables (usage) just warn, otherwise throw
  if (table === "usage") {
    console.warn(`[supabase] Upsert usage failed after retries (JWT clock skew). Skipping silently.`);
    return null;
  }
  throw lastError ?? new Error(`Upsert failed on ${table}`);
}

export async function fetchFeatureAction(table: FeatureTable, columns: string = "*", limit?: number, filters?: Record<string, any>) {
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 300 * attempt));
    try {
      const supabase = await createClerkSupabaseClient();
      const orderCol = table === "explore_history" ? "created_at" : "updated_at";
      let query = supabase.from(table).select(columns).order(orderCol, { ascending: false });
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
        throw new Error(`Fetch failed on ${table}: ${error.message}`);
      }
      return (data || []) as any[];
    } catch (e: any) {
      lastError = e;
      if (e.message?.includes("JWT not yet valid")) continue;
      throw e;
    }
  }
  console.warn(`[supabase] Fetch ${table} failed after retries (JWT clock skew). Returning empty.`);
  return [] as any[];
}

export async function deleteFeatureAction(table: FeatureTable, id: string) {
  const supabase = await createClerkSupabaseClient();
  
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(`Delete failed on ${table}: ${error.message}`);
  
  revalidatePath("/history");
  if (table === "chats") revalidatePath("/assistant");
}


// Wrapper for backward compatibility with debate/page.tsx
export async function upsertChatAction(payload: any) {
  return upsertFeatureAction("chats", payload);
}

// Added to satisfy community/page.tsx which imported this function that didn't exist in HEAD
export async function fetchCommunityPostsAction(): Promise<any[]> {
  return [];
}
