import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { data: usageData, error } = await supabase
      .from("user_usage")
      .select("user_id, credits_used")
      .order("credits_used", { ascending: false })
      .limit(10);

    if (error || !usageData || usageData.length === 0) {
      return NextResponse.json({ status: "success", data: [] });
    }

    const client = await clerkClient();
    const userIds = usageData.map(u => u.user_id);
    const clerkUsers = await client.users.getUserList({ userId: userIds });

    const leaderboard = usageData.map(usage => {
      const user = clerkUsers.data.find(u => u.id === usage.user_id);
      const firstName = user?.firstName || "Anonymous";
      const lastName = user?.lastName || "";
      const displayName = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
      
      return {
        id: usage.user_id,
        name: displayName,
        score: usage.credits_used,
        tier: (user?.publicMetadata?.tier as string) || "Free"
      };
    }).filter(u => u.name !== "Anonymous" || u.score > 0);

    leaderboard.sort((a, b) => b.score - a.score);
    const top5 = leaderboard.slice(0, 5);

    return NextResponse.json({ status: "success", data: top5 });
  } catch (error: any) {
    console.error("Leaderboard GET Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
