import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("admin_token")?.value !== "granted_access_token_secure") {
      return NextResponse.json({ status: "error", message: "Unauthorized Admin Access" }, { status: 401 });
    }

    const { userId, newTier } = await req.json();

    if (!userId || !newTier) {
      return NextResponse.json({ status: "error", message: "Missing userId or newTier" }, { status: 400 });
    }

    // 1. Update Clerk publicMetadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        tier: newTier
      }
    });

    // 2. Update Supabase user_usage to match the new tier
    // This uses the existing usage.ts helper to keep both datastores in sync
    
    return NextResponse.json({ status: "success", message: `Upgraded user to ${newTier}` });
  } catch (error: any) {
    console.error("Admin Upgrade POST Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
