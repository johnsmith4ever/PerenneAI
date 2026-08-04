import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { auth } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function searchTavily(query: string, includeDomains?: string[]) {
  try {
    const body: any = {
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      include_answer: false,
      max_results: 5
    };
    
    if (includeDomains && includeDomains.length > 0) {
      body.include_domains = includeDomains;
    }

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      console.error("Tavily search failed with status:", res.status);
      return null;
    }
    
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    
    return data.results;
  } catch (e) {
    console.error("Tavily exception:", e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    const { topic, focusArea, domains } = await req.json();
    if (!topic) return NextResponse.json({ status: "error", message: "Topic is required" }, { status: 400 });

    let finalQuery = topic;
    if (focusArea && focusArea.trim()) {
      finalQuery += ` (Focus specifically on: ${focusArea})`;
    }

    let includeDomains: string[] = [];
    if (domains && domains.trim()) {
      includeDomains = domains.split(",").map((d: string) => d.trim()).filter((d: string) => d.length > 0);
    }

    const searchResults = await searchTavily(finalQuery, includeDomains);

    let reportText = "";
    let finalUsage = null;
    let usedModel = "Apollo V4 Flash";
    
    if (searchResults) {
      // Step 2: Summarize with Deepseek
      const context = searchResults.map((r: any, i: number) => `[Source ${i+1}] ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join("\n\n");
      
      const systemPrompt = `You are an expert Research Assistant. 
Write a highly synthesized, well-structured report on the topic: "${topic}".
${focusArea ? `\nCRITICAL INSTRUCTION: You must explicitly focus your research report on the following area: "${focusArea}".` : ""}
You MUST base your report solely on the following context retrieved from live web research.
Use inline citations like [Source 1] and include a References section at the very end.

Web Context:
${context}`;

      const { text, usage } = await generateText({
        model: deepseek.chat("deepseek-chat"),
        system: systemPrompt,
        messages: [{ role: "user", content: `Write the research report for: ${topic}${focusArea ? ` focusing on ${focusArea}` : ""}` }],
        maxOutputTokens: 1000,
      });
      
      reportText = text;
      finalUsage = usage;
      usedModel = "Apollo V4 Flash (Deepseek)";
    } else {
      // Step 3: Fallback to Gemini Flash
      console.log("Tavily failed or returned no results. Falling back to Gemini Flash.");
      const systemPrompt = `You are an expert Research Assistant.
Write a highly synthesized, well-structured report on the topic: "${topic}".
${focusArea ? `\nCRITICAL INSTRUCTION: You must explicitly focus your research report on the following area: "${focusArea}".` : ""}
Since live web research is currently unavailable, use your own internal knowledge to provide the best possible overview.
Ensure it is structured with headings, bullet points, and clear explanations.`;

      const { text, usage } = await generateText({
        model: google("gemini-3.1-flash-lite"),
        system: systemPrompt,
        messages: [{ role: "user", content: `Write the research report for: ${topic}${focusArea ? ` focusing on ${focusArea}` : ""}` }],
        maxOutputTokens: 1000,
      });

      reportText = text + "\n\n*(Note: Live web search was unavailable. This report was generated using Bastion 3.5 Flash's internal knowledge base.)*";
      finalUsage = usage;
      usedModel = "Bastion 3.5 Flash (Gemini)";
    }

    trackUsage(userId, "chat").catch(console.error);
    
    return NextResponse.json({ 
      status: "success", 
      text: reportText, 
      usage: finalUsage,
      model: usedModel,
      sources: searchResults ? searchResults.map((r: any) => ({ url: r.url, title: r.title })) : []
    });

  } catch (error: any) {
    console.error("Research API Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
