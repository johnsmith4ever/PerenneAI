import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ streak: 0, activeToday: false });

    let currentStreak = (user.publicMetadata.streak as number) || 0;
    const lastActive = (user.publicMetadata.lastActive as string) || null;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let updated = false;

    if (lastActive === today) {
      // Already active today, streak doesn't increment again
      return NextResponse.json({ streak: currentStreak, activeToday: true });
    } else if (lastActive === yesterday) {
      // Active yesterday, streak continues!
      currentStreak++;
      updated = true;
    } else {
      // Missed a day or first time
      currentStreak = 1;
      updated = true;
    }

    if (updated) {
      const client = await clerkClient();
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          streak: currentStreak,
          lastActive: today
        }
      });
    }

    return NextResponse.json({ streak: currentStreak, activeToday: true });
  } catch (error) {
    console.error("Streak API error:", error);
    return NextResponse.json({ streak: 0, activeToday: false });
  }
}
