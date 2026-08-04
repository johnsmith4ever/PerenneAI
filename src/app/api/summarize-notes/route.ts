import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";
import { supabase } from "@/lib/supabase";

const TIER_RANK: Record<string, number> = {
  Free: 0,
  Core: 1,
  Pro: 2,
  Premium: 3,
  Maximum: 4,
};

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

    const { text, mode = "understand", format = "paragraph", length = "short" } = await req.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ status: "error", message: "Please provide more notes to summarize." }, { status: 400 });
    }

    const client = await clerkClient();
    const userObj = await client.users.getUser(userId);
    const { FREE_ACCESS_MODE } = await import("@/hooks/use-subscription");
    const tier = (userObj.publicMetadata.tier as string) || "Free";
    const tierRank = TIER_RANK[tier] || 0;

    if (!FREE_ACCESS_MODE && tierRank < TIER_RANK.Pro) {
      const today = new Date();
      today.setUTCHours(0,0,0,0);
      const { count } = await supabase
        .from("explore_history")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId)
        .eq("type", "note_summary")
        .gte("created_at", today.toISOString());
        
      if (count && count >= 1) {
        return NextResponse.json({ status: "error", message: "You have reached your daily limit for the Note Summarizer (1 per day on Free/Core plan). Upgrade to Pro for unlimited use!" }, { status: 403 });
      }
    }

    let prompt = "";
    
    if (mode === "pure") {
      prompt = `You are a highly efficient AI summarizer.
I am going to give you my messy lecture/study notes. I need a pure summary.

My notes:
"""
${text}
"""

Settings:
- Format: ${format === 'bullets' ? 'Bullet points (use markdown bullets inside the text)' : 'A single cohesive paragraph'}
- Length constraint: ${length === 'mini' ? 'Extremely brief, around 2-3 sentences max.' : length === 'short' ? 'Short length.' : 'Medium length, comprehensive but concise.'}

You must respond with EXACTLY and ONLY a valid JSON object matching this schema:
{
  "pureSummary": "Your generated summary here. Make sure it adheres to the format and length settings."
}

Do not use markdown blocks for the JSON (no \`\`\`json). Just return the raw JSON object.`;
    } else {
      prompt = `You are an incredibly creative, witty, and highly intelligent study assistant.
I am going to give you my messy lecture/study notes. I need you to summarize them, but make it engaging and deeply educational.

My notes:
"""
${text}
"""

You must respond with EXACTLY and ONLY a valid JSON object matching this schema:
{
  "tldr": "A punchy, memorable 1-2 sentence summary of the entire text.",
  "keyConcepts": [
    {
      "title": "Concept Name",
      "explanation": "A clear, deep explanation of the concept.",
      "analogy": "A highly creative, slightly humorous, or extremely memorable analogy to help me remember this concept forever."
    }
  ],
  "actionableTakeaways": [
    "What I actually need to memorize or do, point 1",
    "Point 2"
  ],
  "eli10": "An 'Explain Like I'm 10' summary. Use a real-life, practical example to break the core idea down so simply that a 10-year-old could grasp it. Do not be overly childish."
}

Do not use markdown blocks for the JSON (no \`\`\`json). Just return the raw JSON object. Ensure the JSON is perfectly formatted.`;
    }

    const { text: rawJson, usage } = await generateText({
      model: deepseek.chat("deepseek-v4-flash"),
      system: "You are an AI study summarizer. You always output valid, raw JSON.",
      prompt,
    });

    const cleaned = rawJson.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error("Parse error:", cleaned);
      return NextResponse.json({ status: "error", message: "AI returned malformed data." }, { status: 500 });
    }

    // Fire and forget usage tracking
    trackUsage(userId, "summarize-notes").catch(console.error);

    // Save history so we can enforce rate limits
    supabase.from("explore_history").insert({
      user_id: userId,
      topic: "Note Summary",
      type: "note_summary",
      data: data
    }).then();

    return NextResponse.json({ status: "success", data, usage });
  } catch (error: any) {
    console.error("Summarizer API Error:", error);
    return NextResponse.json({ status: "error", message: error.message || "Unknown error" }, { status: 500 });
  }
}
