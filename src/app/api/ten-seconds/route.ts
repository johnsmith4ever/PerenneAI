import { NextResponse } from "next/server";
import { clerkClient, auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const client = await clerkClient();
    const users = await client.users.getUserList();
    
    // Extract those with a tenSecondsHighScore (which represents the difference in ms from 10s)
    const leaderboard = users.data
      .filter((u: any) => typeof u.publicMetadata.tenSecondsHighScore === "number")
      .map((u: any) => ({
        id: u.id,
        name: u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.emailAddresses[0]?.emailAddress?.split("@")[0] || "Anonymous",
        score: u.publicMetadata.tenSecondsHighScore as number,
      }))
      .sort((a: any, b: any) => a.score - b.score) // Ascending! Lower difference is better
      .slice(0, 10);

    return NextResponse.json({ status: "success", data: leaderboard });
  } catch (error: any) {
    console.error("Ten Seconds Leaderboard GET Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { score } = await req.json(); // Score is the difference in milliseconds
    if (typeof score !== "number") {
      return NextResponse.json({ status: "error", message: "Invalid score" }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const currentHighScore = user.publicMetadata.tenSecondsHighScore;

    // We only update if they've never played, OR their new difference is LOWER than their old one.
    if (currentHighScore === undefined || score < (currentHighScore as number)) {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          tenSecondsHighScore: score
        }
      });
      return NextResponse.json({ status: "success", newHighScore: true, score });
    }

    return NextResponse.json({ status: "success", newHighScore: false, score });
  } catch (error: any) {
    console.error("Ten Seconds Leaderboard POST Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
