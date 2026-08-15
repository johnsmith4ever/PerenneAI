import { NextResponse } from "next/server";
import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";
import { generateGeminiText } from "@/lib/gemini-fallback";
import { generateAssistantText } from "@/lib/assistant-router";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { text, model } = await req.json();

    if (!text || text.trim().length < 2) {
      return NextResponse.json({ status: "error", message: "Please provide a topic or notes." }, { status: 400 });
    }

    const prompt = `You are an expert structural thinker. I want you to organize the following topic or raw notes into a beautifully structured Mindmap.

Topic/Notes:
"""
${text}
"""

Instructions:
1. Create a root node for the main topic.
2. Break it down into 3-6 logical primary branches (children of the root).
3. Further break down those branches into sub-branches (children of the children).
4. Keep the 'text' of each node concise (1-5 words max if possible, never more than a short sentence).
5. Generate unique string IDs for every node (e.g., "node_1", "node_2", etc).

You must respond with EXACTLY and ONLY a valid JSON object matching this schema:
{
  "mindmap": [
    {
      "id": "root_node",
      "text": "Main Idea",
      "children": [
        {
          "id": "child_node",
          "text": "Sub Idea",
          "children": []
        }
      ]
    }
  ]
}

Do not use markdown blocks for the JSON (no \`\`\`json). Just return the raw JSON object. Ensure the JSON is perfectly formatted and deeply nested (at least 2-3 levels deep).`;

    const { text: rawJson, usage } = await generateAssistantText({
      model: model || "Gemini 3.6 Flash",
      system: "You are an AI mindmap architect. You always output valid, raw JSON.",
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
    trackUsage(userId, "generate-mindmap").catch(console.error);

    // Return the first (root) node directly
    const root = Array.isArray(data.mindmap) ? data.mindmap[0] : data.mindmap;
    return NextResponse.json({ status: "success", data: root, usage });
  } catch (error: any) {
    console.error("Mindmap API Error:", error);
    return NextResponse.json({ status: "error", message: error.message || "Unknown error" }, { status: 500 });
  }
}
