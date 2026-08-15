import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";
import { generateGeminiText } from "@/lib/gemini-fallback";
import { generateAssistantText } from "@/lib/assistant-router";

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function searchTavily(query: string) {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        include_answer: false,
        max_results: 3
      })
    });
    if (!res.ok) {
      console.error("Tavily non-ok status:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.results.map((r: any) => `Source: ${r.url}\nContent: ${r.content}`).join("\n\n");
  } catch (e) {
    console.error("Tavily error:", e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    const { messages, useResearch, topic, stance , model } = await req.json();

    let contextText = "";
    let usedTavily = false;
    if (useResearch) {
      // Find the latest user message to search for
      const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
      if (lastUserMsg) {
        const query = `${topic} ${lastUserMsg.content}`.substring(0, 100);
        const searchContext = await searchTavily(query);
        if (searchContext) {
          contextText = `\n\n[Real-time Research Context (Use this to strengthen your counter-arguments with facts/evidence)]:\n${searchContext}`;
          usedTavily = true;
        }
      }
    }

    const aiStance = stance === "Affirmative" ? "Against (Opposed)" : "Affirmative (For)";

    const systemPrompt = `You are a relentless but fair Debate Partner. 
Your goal is to play Devil's Advocate against the user's stance on the topic: "${topic}".
The user's stance is: **${stance}**.
Your stance must strictly be: **${aiStance}**.
You must vigorously but respectfully challenge their arguments, point out logical fallacies, and provide counter-evidence.
Do not break character. Do not agree with them easily. Keep your responses concise (1-2 paragraphs max) and punchy.${contextText}`;

    const { text, usage } = await generateAssistantText({
      model: model || "Gemini 3.6 Flash",
      system: systemPrompt,
      messages,
      maxOutputTokens: 500,
    });

    trackUsage(userId, "chat").catch(console.error);

    return NextResponse.json({ status: "success", text, usage, usedTavily });
  } catch (error: any) {
    console.error("Debate API Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
