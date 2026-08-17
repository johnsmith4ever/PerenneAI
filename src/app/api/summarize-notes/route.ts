import { NextResponse } from "next/server";
import { generateText, embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createMistral } from "@ai-sdk/mistral";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";
import { supabaseAdmin } from "@/lib/supabase-server";
import { generateGeminiText } from "@/lib/gemini-fallback";
import { generateAssistantText } from "@/lib/assistant-router";

const TIER_RANK: Record<string, number> = {
  Free: 0,
  Core: 1,
  Pro: 2,
  Premium: 3,
  Maximum: 4,
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    // Guest bypass allowed: userId can be null

    const { text, mode = "understand", format = "paragraph", length = "short", subject , model } = await req.json();

    if (!text || text.trim().length < 2) {
      return NextResponse.json({ status: "error", message: "Please provide a topic or notes to summarize." }, { status: 400 });
    }

    const client = await clerkClient();
    let tier = "Guest";
    if (userId) {
      const userObj = await client.users.getUser(userId);
      tier = (userObj.publicMetadata.tier as string) || "Free";
    }
    const FREE_ACCESS_MODE = true;
    const tierRank = TIER_RANK[tier] || -1;

    if (!FREE_ACCESS_MODE && tierRank < TIER_RANK.Pro) {
      const today = new Date();
      today.setUTCHours(0,0,0,0);
      const { count } = await supabaseAdmin
        .from("explore_history")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId)
        .eq("type", "note_summary")
        .gte("created_at", today.toISOString());
        
      if (count && count >= 1) {
        return NextResponse.json({ status: "error", message: "You have reached your daily limit for the Note Summarizer (1 per day on Free/Core plan). Upgrade to Pro for unlimited use!" }, { status: 403 });
      }
    }

    let aqaContext = "";
    
    // Always try to fetch AQA specs if it's Understand or ELI10 mode (especially if it's a short topic)
    if (mode === "understand" || mode === "eli10") {
      try {
        const mistralProvider = createMistral({ apiKey: process.env.MISTRAL_API_KEY_2 });
        const { embedding } = await embed({
          model: mistralProvider.textEmbeddingModel("mistral-embed"),
          value: text,
        });
        
        const threshold = subject === "Mathematics" || subject === "Maths" ? 0.70 : 0.70;

        const { data: specs, error: specError } = await supabaseAdmin.rpc("match_aqa_specs", {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: 3,
          filter_subject: subject || null,
          filter_level: null
        });

        if (!specError && specs && specs.length > 0) {
          aqaContext = `\n\nOfficial AQA Syllabus Context:\n${specs.map((s: any) => s.content).join("\n")}\n\nMake sure to align your explanation and examples entirely with this official curriculum context.`;
        }
      } catch (e) {
        console.error("AQA context search failed:", e);
      }
    }

    let prompt = "";
    if (mode === "pure") {
      prompt = `You are a highly efficient AI summarizer.
I am going to give you my messy lecture/study notes or a topic. I need a pure summary.

Input:
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
    } else if (mode === "eli10") {
      prompt = `You are a highly skilled educator who specializes in breaking down complex topics clearly.
I am going to give you a topic or concept. Explain it step by step using plain, simple English — as if speaking to someone who has no prior knowledge.
Do NOT use silly analogies or forced comparisons. Just use clear, direct, jargon-free English to explain what it is and how it works.
CRITICAL: Keep all sections strictly concise. No long paragraphs.

Topic:
"""
${text}
"""${aqaContext}

You must respond with EXACTLY and ONLY a valid JSON object matching this schema:
{
  "tldr": "A punchy, memorable 1-2 sentence summary of the entire concept.",
  "eli10": "A clear, plain-English breakdown of the concept. No analogies, no gimmicks. Just simple sentences that explain what it is, step by step, as if talking to someone who has never heard of it before. Keep it concise.",
  "keyConcepts": [
    {
      "title": "Concept Name",
      "explanation": "A short, clear explanation of this specific concept."
    }
  ],
  "actionableTakeaways": [
    "Short actionable point 1",
    "Short actionable point 2"
  ]
}

Do not use markdown blocks for the JSON (no \`\`\`json). Just return the raw JSON object. You MUST properly escape any newlines as \\n inside strings so the JSON remains valid.`;
    } else {
      prompt = `You are an incredibly skilled and educational study assistant.
I am going to give you either messy lecture notes OR a specific topic. Break it down clearly and educationally.
If I gave you a topic, use the provided AQA syllabus context to build a comprehensive lesson around it.
CRITICAL: Keep all sections strictly concise, short, and to the point. Do not write long essays.

Input:
"""
${text}
"""${aqaContext}

You must respond with EXACTLY and ONLY a valid JSON object matching this schema:
{
  "tldr": "A punchy, memorable 1-2 sentence summary of the entire concept.",
  "eli10": "A clear, plain-English breakdown of the concept. No silly analogies or gimmicks. Just simple, direct sentences that explain what it is and how it works — as if talking to someone who has never heard of it before. Keep it concise.",
  "keyConcepts": [
    {
      "title": "Concept Name",
      "explanation": "A clear, concise explanation of the concept."
    }
  ],
  "actionableTakeaways": [
    "Short actionable point 1",
    "Short actionable point 2"
  ]
}

Do not use markdown blocks for the JSON (no \`\`\`json). Just return the raw JSON object. Ensure the JSON is perfectly formatted. You MUST properly escape any newlines as \\n inside strings so the JSON remains valid.`;
    }

    const { text: rawJson, usage } = await generateAssistantText({
      model: model || "Gemini 3.6 Flash",
      system: "You are an AI study summarizer. You always output valid, raw JSON.",
      prompt,
      maxOutputTokens: 800,
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
    if (userId) trackUsage(userId, "summarize-notes").catch(console.error);

    // Save history so we can enforce rate limits
    if (userId) {
      supabaseAdmin.from("explore_history").insert({
        user_id: userId,
        topic: "Note Summary",
        type: "note_summary",
        data: data
      }).then();
    }

    return NextResponse.json({ status: "success", data, usage });
  } catch (error: any) {
    console.error("Summarizer API Error:", error);
    return NextResponse.json({ status: "error", message: error.message || "Unknown error" }, { status: 500 });
  }
}
