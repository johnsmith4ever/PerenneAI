import { mistralProvider } from "@/lib/mistral-fallback";
import { NextResponse } from "next/server";
import { generateText, embed } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { generateGeminiText } from "@/lib/gemini-fallback";
import { generateAssistantText } from "@/lib/assistant-router";



export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    const { text, inputMode, subject , model } = await req.json();

    if (!text || text.trim().length < 2) {
      return NextResponse.json({ status: "error", message: "Please provide a topic or text." }, { status: 400 });
    }

    let finalNotes = text;
    let mistralTokens = { input: 0, output: 0 };

    if (inputMode === "topic") {
      try {
        const { embedding } = await embed({
          model: mistralProvider.textEmbeddingModel("mistral-embed"),
          value: text,
        });

        const threshold = 0.40;
        const dbSubject = subject === "Maths" ? "Mathematics" : subject;

        const { data: specs } = await supabase.rpc("match_aqa_specs", {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: 5,
          filter_subject: dbSubject || null,
          filter_level: null
        });

        let aqaContext = "";
        if (specs && specs.length > 0) {
          aqaContext = specs.map((s: any) => s.content).join("\n\n");
        }

        const { text: synthesizedNotes, usage: noteUsage } = await generateAssistantText({
          model: "GPT 5.4 Nano",
          system: "You are an expert AQA teacher. Your job is to take a short topic and synthesize comprehensive, detailed study notes using ONLY the provided AQA specification context. If the context is empty, write high-quality general notes for a high school student.",
          prompt: `Topic: ${text}\n\nAQA Context:\n${aqaContext || "None provided."}`,
        });

        finalNotes = synthesizedNotes;
        if (noteUsage) {
          mistralTokens.input = (noteUsage as any).inputTokens || (noteUsage as any).promptTokens || 0;
          mistralTokens.output = (noteUsage as any).outputTokens || (noteUsage as any).completionTokens || 0;
        }
      } catch (embErr) {
        console.warn("Topic synthesis error, proceeding with direct topic notes:", embErr);
        finalNotes = text;
      }
    }

    const prompt = `You are a brilliant academic researcher and deep thinker. Analyze the following topic or raw notes and break them down into a rich, structured analysis suitable for mindmap building.

Input:
"""
${finalNotes}
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

    const { text: rawJson, usage } = await generateAssistantText({
      model: model || "Deepseek-V4-Flash",
      system: "You are a structured knowledge analyst. You always output valid raw JSON with no markdown.",
      prompt,
    });

    const inputTokens = ((usage as any)?.inputTokens || (usage as any)?.promptTokens || 0) + mistralTokens.input;
    const outputTokens = ((usage as any)?.outputTokens || (usage as any)?.completionTokens || 0) + mistralTokens.output;

    const cleaned = rawJson.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error("DeepSeek parse error:", cleaned);
      return NextResponse.json({ status: "error", message: "AI returned malformed analysis." }, { status: 500 });
    }

    
    return NextResponse.json({ status: "success", data, usage });
  } catch (error: any) {
    console.error("Analyze Topic API Error:", error);
    return NextResponse.json({ status: "error", message: error.message || "Unknown error" }, { status: 500 });
  }
}
