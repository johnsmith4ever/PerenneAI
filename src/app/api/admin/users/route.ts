import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const client = await clerkClient();
    const usersResponse = await client.users.getUserList();
    const users = usersResponse.data.map((u: any) => ({
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress || "No email",
      firstName: u.firstName,
      lastName: u.lastName,
      tier: (u.publicMetadata.tier as string) || "Free",
      createdAt: u.createdAt,
    }));
    
    // Sort by created at descending
    users.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ status: "success", data: users });
  } catch (error: any) {
    console.error("Admin Users GET Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
