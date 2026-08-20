import { NextResponse } from "next/server";
import { clerkClient, auth } from "@clerk/nextjs/server";

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

    // No active promo codes at the moment


    return NextResponse.json({ status: "error", message: "Invalid or expired referral code." }, { status: 400 });

  } catch (error: any) {
    console.error("Referral POST Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
