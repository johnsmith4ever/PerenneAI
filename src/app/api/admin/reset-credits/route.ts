import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// Admin endpoint to reset daily credits for any user
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify admin access
  const client = await clerkClient();
  const caller = await client.users.getUser(userId);
  const primaryEmail = caller.emailAddresses.find(e => e.id === caller.primaryEmailAddressId)?.emailAddress;
  
  if (primaryEmail !== "abcdjohnsmith01@gmail.com") {
    return NextResponse.json({ error: "Forbidden - Admins only" }, { status: 403 });
  }

  const { targetUserId } = await req.json();
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing target user ID" }, { status: 400 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { error } = await supabaseAdmin
    .from("usage")
    .upsert({ user_id: targetUserId, credits_used: 0, last_reset: today.toISOString().split("T")[0] }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: "Daily credits reset to 0." });
}
