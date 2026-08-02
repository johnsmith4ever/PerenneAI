import { NextResponse } from "next/server";
import { clerkClient, auth } from "@clerk/nextjs/server";
import { updateUserTierInSupabase } from "@/lib/usage";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ status: "error", message: "Invalid referral code" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check for specific referral codes
    if (normalizedCode === "PERENNE2026") {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const currentTier = user.publicMetadata.tier as string;

      // Only upgrade if they are on Free (don't downgrade someone on Pro or Maximum)
      if (currentTier === "Free" || !currentTier) {
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            tier: "Core"
          }
        });
        await updateUserTierInSupabase(userId, "Core");
        return NextResponse.json({ status: "success", message: "Referral applied! Upgraded to Core Tier." });
      } else {
        return NextResponse.json({ status: "error", message: "You are already on a higher or equal tier." }, { status: 400 });
      }
    }

    return NextResponse.json({ status: "error", message: "Invalid or expired referral code." }, { status: 400 });

  } catch (error: any) {
    console.error("Referral POST Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
