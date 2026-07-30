import { NextResponse } from "next/server";
import { clerkClient, auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const client = await clerkClient();
    // Fetch all users
    const users = await client.users.getUserList();
    
    // Extract those with a cpsHighScore, sort descending, take top 10
    const leaderboard = users.data
      .filter((u: any) => typeof u.publicMetadata.cpsHighScore === "number")
      .map((u: any) => ({
        id: u.id,
        name: u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.emailAddresses[0]?.emailAddress?.split("@")[0] || "Anonymous",
        score: u.publicMetadata.cpsHighScore as number,
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({ status: "success", data: leaderboard });
  } catch (error: any) {
    console.error("Leaderboard GET Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { score } = await req.json();
    if (typeof score !== "number") {
      return NextResponse.json({ status: "error", message: "Invalid score" }, { status: 400 });
    }

    const client = await clerkClient();
    // Get current user to check their high score
    const user = await client.users.getUser(userId);
    const currentHighScore = (user.publicMetadata.cpsHighScore as number) || 0;

    // Only update if the new score is higher
    if (score > currentHighScore) {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          cpsHighScore: score
        }
      });
      return NextResponse.json({ status: "success", newHighScore: true, score });
    }

    return NextResponse.json({ status: "success", newHighScore: false, score });
  } catch (error: any) {
    console.error("Leaderboard POST Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
