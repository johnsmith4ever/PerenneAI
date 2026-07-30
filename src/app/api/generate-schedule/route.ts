import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export const maxDuration = 60; // longer generation for schedules

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { goal, hours, style, subjects, targets, days, intensity } = await req.json();

    if (!goal || !subjects) {
      return NextResponse.json({ status: "error", message: "Missing required fields" }, { status: 400 });
    }

    const numDays = parseInt(days, 10) || 7;

    const prompt = `You are an expert academic planner.
Create a highly effective ${numDays}-day schedule for a student based on these parameters:
- Main Goal: ${goal}
- Subjects/Topics: ${subjects}
- Specific Targets: ${targets || "None"}
- Available Study Hours per Day: ${hours}
- Routine Style: ${style} (e.g., Early Bird, Night Owl, Balanced)
- Intensity (Pacing): ${intensity}

You must return a raw JSON object with this exact structure (no markdown formatting, just JSON):
{
  "title": "A motivational title for the schedule",
  "tips": [
    "Tip 1 tailored to this schedule",
    "Tip 2",
    "Tip 3"
  ],
  "days": [
    {
      "day": "Day 1 (e.g. Monday)",
      "blocks": [
        {
          "id": "unique-string-1",
          "startTime": "09:00",
          "endTime": "10:30",
          "title": "Math Revision",
          "type": "study",
          "details": "Focus on calculus chapter 3"
        }
      ]
    }
  ]
}

Requirements:
1. Cover exactly ${numDays} days. Name them "Day 1", "Day 2", etc. or actual weekdays.
2. The "type" MUST be one of: "study", "break", "sleep", "other".
3. Provide sequential time blocks in HH:MM format (24-hour clock).
4. Ensure the total study hours roughly match the requested available hours per day.
5. If the style is "Night Owl", shift focus blocks to evening/night. If "Early Bird", shift to morning.
6. Make the schedule varied across the days.
7. Break scaling based on Intensity (${intensity}):
   - Chill: Lots of long breaks, minimal consecutive study blocks, prioritize relaxation.
   - Normal: Standard breaks (e.g., Pomodoro style), balanced approach.
   - Stressed: Minimal breaks, intense consecutive focus blocks, highly aggressive pacing.
`;

    const { text: rawJson, usage } = await generateText({
      model: deepseek.chat("deepseek-v4-flash"),
      system: "You are a structured planner. You output ONLY raw JSON.",
      prompt: prompt,
      temperature: 0.7,
    });

    const cleaned = rawJson.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error("DeepSeek parse error:", cleaned);
      return NextResponse.json({ status: "error", message: "AI returned malformed schedule." }, { status: 500 });
    }

    // Track usage
    await trackUsage(userId, "generate-schedule");

    return NextResponse.json({
      status: "success",
      data,
      usage,
    });
  } catch (error: any) {
    console.error("Schedule API error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to generate schedule" },
      { status: 500 }
    );
  }
}
