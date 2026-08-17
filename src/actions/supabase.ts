"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Helper to assert auth
async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

// ----------------------------------------------------------------------------
// 1. User State Sync (usePersistentState)
// ----------------------------------------------------------------------------
export async function syncUserStateAction(key: string, value: any) {
  const userId = await requireAuth();
  
  const { error } = await supabaseAdmin.from("user_state").upsert({
    user_id: userId,
    key,
    value,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error("Failed to sync state:", error);
    throw new Error("Failed to sync state");
  }
}

export async function fetchUserStateAction(key: string) {
  const userId = await requireAuth();
  
  const { data, error } = await supabaseAdmin
    .from("user_state")
    .select("value")
    .eq("user_id", userId)
    .eq("key", key)
    .single();
    
  if (error && error.code !== "PGRST116") { // Ignore 'row not found'
    console.error("Failed to fetch state:", error);
    return null;
  }
  
  return data?.value || null;
}

// ----------------------------------------------------------------------------
// 2. Generic History Actions (quiz_history, flashcards_history, essay_history, explore_history)
// ----------------------------------------------------------------------------
type HistoryTable = "quiz_history" | "flashcards_history" | "essay_history" | "explore_history" | "community_posts" | "chat_history";

export async function insertHistoryAction(table: HistoryTable, payload: any) {
  const userId = await requireAuth();
  
  // Force injection of user_id to ensure absolute security
  const securePayload = { ...payload, user_id: userId };

  const { data, error } = await supabaseAdmin.from(table).insert(securePayload).select().single();
  if (error) {
    console.error(`Failed to insert into ${table}:`, error);
    throw new Error(`Insert failed on ${table}`);
  }
  
  return data;
}

export async function deleteHistoryAction(table: HistoryTable, id: string) {
  const userId = await requireAuth();
  
  // RLS bypass via Admin means we MUST enforce the user_id match here
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id).eq("user_id", userId);
  
  if (error) {
    console.error(`Failed to delete from ${table}:`, error);
    throw new Error(`Delete failed on ${table}`);
  }
}

export async function fetchUserHistoryAction(table: HistoryTable, columns: string = "*", limit?: number, matchParams?: any) {
  const userId = await requireAuth();
  
  let query = supabaseAdmin
    .from(table)
    .select(columns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
    
  if (matchParams) {
    query = query.match(matchParams);
  }

  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error(`Failed to fetch from ${table}:`, error);
    throw new Error(`Fetch failed on ${table}`);
  }
  
  return (data || []) as any[];
}

export async function fetchCommunityPostsAction() {
  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (error) {
    console.error("Failed to fetch community posts:", error);
    throw new Error("Failed to fetch community posts");
  }
  
  return (data || []) as any[];
}

// ----------------------------------------------------------------------------
// 3. User Usage Actions
// ----------------------------------------------------------------------------
export async function fetchUserUsageAction() {
  const userId = await requireAuth();
  
  const { data, error } = await supabaseAdmin
    .from("user_usage")
    .select("credits_used, last_reset")
    .eq("user_id", userId)
    .single();
    
  if (error && error.code !== "PGRST116") {
    console.error("Failed to fetch user usage:", error);
    throw new Error("Failed to fetch user usage");
  }
  
  return data;
}

export async function upsertUserUsageAction(payload: any) {
  const userId = await requireAuth();
  
  const securePayload = { ...payload, user_id: userId };
  const { error } = await supabaseAdmin.from("user_usage").upsert(securePayload);
  
  if (error) {
    console.error("Failed to upsert user usage:", error);
    throw new Error("Failed to upsert user usage");
  }
}

// ----------------------------------------------------------------------------
// 4. Chat History Upsert (Assistant)
// ----------------------------------------------------------------------------
export async function upsertChatAction(payload: any) {
  const userId = await requireAuth();
  
  const securePayload = { ...payload, user_id: userId };
  const { error } = await supabaseAdmin.from("chat_history").upsert(securePayload);
  
  if (error) {
    console.error("Failed to upsert chat:", error);
    throw new Error("Failed to upsert chat");
  }
}
