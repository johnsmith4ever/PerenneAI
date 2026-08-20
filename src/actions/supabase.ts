"use server";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
type FeatureTable = "chats" | "usage" | "flashcards" | "maths_questions" | "quizzes" | "exam_sims" | "essay_sims" | "notes" | "mind_maps";

export async function insertFeatureAction(table: FeatureTable, payload: any) {
  const supabase = await createClerkSupabaseClient();
  const { userId } = await auth();
  
  const securePayload = { ...payload, user_id: userId, updated_at: new Date().toISOString() };
  
  const { data, error } = await supabase.from(table).insert(securePayload).select().single();
  if (error) throw new Error(`Insert failed on ${table}: ${error.message}`);
  
  revalidatePath("/history");
  return data;
}

export async function upsertFeatureAction(table: FeatureTable, payload: any) {
  const supabase = await createClerkSupabaseClient();
  const { userId } = await auth();
  
  const securePayload = { ...payload, user_id: userId, updated_at: new Date().toISOString() };
  
  const { data, error } = await supabase.from(table).upsert(securePayload).select().single();
  if (error) throw new Error(`Upsert failed on ${table}: ${error.message}`);
  
  revalidatePath("/history");
  if (table === "chats") revalidatePath("/assistant");
  
  return data;
}

export async function fetchFeatureAction(table: FeatureTable, columns: string = "*", limit?: number) {
  const supabase = await createClerkSupabaseClient();
  
  let query = supabase.from(table).select(columns).order("updated_at", { ascending: false });
  if (limit) query = query.limit(limit);
  
  const { data, error } = await query;
  if (error) throw new Error(`Fetch failed on ${table}: ${error.message}`);
  
  return (data || []) as any[];
}

export async function deleteFeatureAction(table: FeatureTable, id: string) {
  const supabase = await createClerkSupabaseClient();
  
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(`Delete failed on ${table}: ${error.message}`);
  
  revalidatePath("/history");
  if (table === "chats") revalidatePath("/assistant");
}
