import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text || text.trim().length < 2) {
      return NextResponse.json({ status: "error", message: "Please provide a topic or text." }, { status: 400 });
    }

    const prompt = `You are a brilliant academic researcher and deep thinker. Analyze the following topic or raw notes and break them down into a rich, structured analysis suitable for mindmap building.

Input:
"""
${text}
"""

Return a JSON object with this exact structure — no markdown, no explanation, just raw JSON:

{
  "title": "Short, clear topic title (3-6 words)",
  "mainTheme": "One sentence explaining the core concept",
  "sections": [
    {
      "heading": "Section name (2-4 words)",
      "points": [
        "A specific, insightful point about this section",
        "Another specific point",
        "One more key detail"
      ]
    }
  ]
}

Rules:
- Generate 3 to 6 sections
- Each section has 2-5 bullet points
- Points should be concise (under 10 words ideally) but meaningful
- Cover definitions, causes, effects, examples, sub-concepts — whatever is most relevant
- Think deeply — give the user real insight, not generic fluff`;

    const { text: rawJson, usage } = await generateText({
      model: deepseek.chat("deepseek-v4-flash"),
      system: "You are a structured knowledge analyst. You always output valid raw JSON with no markdown.",
      prompt,
    });

    const cleaned = rawJson.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error("DeepSeek parse error:", cleaned);
      return NextResponse.json({ status: "error", message: "AI returned malformed analysis." }, { status: 500 });
    }

    trackUsage(userId, "analyze-topic").catch(console.error);

    return NextResponse.json({ status: "success", data, usage });
  } catch (error: any) {
    console.error("Analyze Topic API Error:", error);
    return NextResponse.json({ status: "error", message: error.message || "Unknown error" }, { status: 500 });
  }
}
