import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
  const openapi = await res.json();
  const keys = openapi.definitions ? Object.keys(openapi.definitions) : [];
  return NextResponse.json({ keys });
}
