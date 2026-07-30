import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { auth } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { topic, extraContext } = await req.json();

    if (!topic) {
      return NextResponse.json({ status: "error", message: "Topic is required" }, { status: 400 });
    }

    let promptContext = "";
    if (extraContext?.trim()) {
      promptContext = `\nExtra Details/Context to consider:\n${extraContext}\n`;
    }

    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: `Generate a comprehensive Pros and Cons list for the following topic/dilemma: "${topic}".
      ${promptContext}
      You MUST respond with ONLY a raw JSON object and nothing else. Do not use markdown formatting like \`\`\`json.
      Format:
      {
        "pros": [
          { "point": "Short title of pro", "description": "Detailed explanation of this pro (1-2 sentences)" }
        ],
        "cons": [
          { "point": "Short title of con", "description": "Detailed explanation of this con (1-2 sentences)" }
        ]
      }
      Provide at least 3-5 pros and 3-5 cons.`,
    });

    let object;
    try {
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      object = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON:", text);
      return NextResponse.json({ status: "error", message: "AI failed to format response correctly." }, { status: 500 });
    }

    // Deduct credits
    await trackUsage(userId, 50, "Pro/Con Table Generation");

    return NextResponse.json({ status: "success", data: object });
  } catch (error: any) {
    console.error("Pro/Con Generation Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
