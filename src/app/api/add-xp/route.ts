import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount } = await req.json();
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Call RPC if it exists to safely increment, or just fetch and update
    // Since we don't have an RPC, we will fetch current then update. (Small race condition risk is fine for XP)
    const { data: currentData } = await supabaseAdmin
      .from("user_usage")
      .select("credits_used")
      .eq("user_id", userId)
      .single();

    const currentXp = currentData?.credits_used || 0;
    const newXp = currentXp + amount;

    await supabaseAdmin
      .from("user_usage")
      .upsert({ user_id: userId, credits_used: newXp }, { onConflict: "user_id" });

    return NextResponse.json({ success: true, xp: newXp });
  } catch (error: any) {
    console.error("Add XP Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
