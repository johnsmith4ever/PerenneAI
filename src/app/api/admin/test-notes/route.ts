import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("explore_history").select("*").limit(1);
  return NextResponse.json({ error: error ? error.message : null, data });
}
