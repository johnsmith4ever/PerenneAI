import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const maxDuration = 60;

const BlockSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  title: z.string(),
  type: z.enum(["study", "break", "sleep", "other"]),
  details: z.string(),
});

const DaySchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  blocks: z.array(BlockSchema),
});

export async function POST(req: Request) {
  try {
    const { prompt, scheduleDays } = await req.json();

    if (!prompt || !scheduleDays) {
      return NextResponse.json({ status: "error", message: "Missing prompt or schedule data" }, { status: 400 });
    }

    const result = await generateObject({
      model: google("gemini-3.1-flash-lite"),
      system: `You are an expert AI productivity assistant managing a user's weekly calendar.
You will be given the current calendar state (an array of days with blocks) and a user's natural language command (e.g. 'Add 2 hours of biology on Wednesday', 'Cancel my Friday morning study session', 'Move my Monday sleep block to start at 10 PM').
Your job is to apply this command to the calendar and return the ENTIRE updated array of days.

Rules:
1. Preserve all existing blocks that are not affected by the command.
2. If adding a new block, generate a unique random string for its 'id'.
3. Ensure 'startTime' and 'endTime' are correctly formatted strings like "09:00 AM", "02:30 PM".
4. If a new block overlaps with an existing block, you must resolve the conflict. Either shift the existing block, shorten it, or remove it if it makes sense. A schedule CANNOT have overlapping times.
5. Sort the blocks in each day chronologically by startTime.
6. The 'type' must be one of: "study", "break", "sleep", "other".`,
      prompt: `CURRENT SCHEDULE:\n${JSON.stringify(scheduleDays, null, 2)}\n\nUSER COMMAND: ${prompt}`,
      schema: z.object({
        days: z.array(DaySchema),
      }),
    });

    return NextResponse.json({ status: "success", data: result.object.days });
  } catch (error: any) {
    console.error("Calendar Agent Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
