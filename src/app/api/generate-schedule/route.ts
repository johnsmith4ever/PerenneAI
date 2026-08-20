import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { generateGeminiText } from "@/lib/gemini-fallback";
import { generateAssistantText } from "@/lib/assistant-router";

export const maxDuration = 60; // longer generation for schedules

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { goal, hours, style, subjects, targets, days, intensity, energy , model } = await req.json();

    if (!goal || !subjects) {
      return NextResponse.json({ status: "error", message: "Missing required fields" }, { status: 400 });
    }

    const numDays = parseInt(days, 10) || 7;

    const prompt = `You are an expert cognitive planner and academic strategist.
Create a highly effective ${numDays}-day schedule for a student based on these parameters:
- Main Goal: ${goal}
- Subjects/Topics to Learn: ${subjects}
- Specific Targets: ${targets || "None"}
- Available Study Hours per Day: ${hours}
- Peak Energy Time: ${energy || "Unknown"} (Map high-cognitive tasks here, and low-cognitive tasks to slumps)
- Routine Style: ${style} (e.g., Early Bird, Night Owl, Balanced)
- Intensity (Pacing): ${intensity}

CRITICAL: Implement Spaced Repetition. If a topic is learned on Day 1, it must be reviewed on later days.
CRITICAL: Include exact Pomodoro flow states (e.g. 50/10) for study blocks, and provide 2-3 specific microTargets for what to accomplish in that block.

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
          "endTime": "11:00",
          "title": "Maths: Integration Intro",
          "type": "study",
          "details": "High energy block. Initial learning phase.",
          "pomodoro": "50/10",
          "microTargets": ["Watch theory video (50m)", "Do 5 basic examples (50m)"]
        },
        {
          "id": "unique-string-2",
          "startTime": "11:00",
          "endTime": "11:30",
          "title": "Cognitive Rest",
          "type": "break",
          "details": "Step away from screen",
          "pomodoro": null,
          "microTargets": []
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

    const { text: rawJson, usage } = await generateAssistantText({
      model: model || "Gemini 3.6 Flash",
      system: "You are a structured planner. You output ONLY raw JSON.",
      prompt: prompt,
      temperature: 0.7,
    });

    const cleaned = rawJson.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error("Gemini parse error:", cleaned);
      return NextResponse.json({ status: "error", message: "AI returned malformed schedule." }, { status: 500 });
    }

    // Track usage

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
