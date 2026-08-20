import { NextResponse } from "next/server";
import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { generateGeminiText } from "@/lib/gemini-fallback";
import { generateAssistantText } from "@/lib/assistant-router";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { topic, slideCount = 5, extraContext, tierRank = 0 , model } = await req.json();

    if (tierRank < 1) {
      return NextResponse.json({ status: "error", message: "Presentation Builder requires Core plan or above." }, { status: 403 });
    }

    if (!topic) {
      return NextResponse.json({ status: "error", message: "Topic is required" }, { status: 400 });
    }

    let promptContext = "";
    if (extraContext?.trim()) {
      promptContext = `\nExtra Details/Context/Passage to base the presentation on:\n${extraContext}\n`;
    }

    const { text } = await generateAssistantText({
      model: model || "Gemini 3.6 Flash",
      system: "You are an expert presentation maker.",
      prompt: `Create a ${slideCount}-slide presentation outline on the topic: "${topic}".
      ${promptContext}
      You MUST respond with ONLY a raw JSON array and nothing else. Do not use markdown formatting like \`\`\`json.
      Format:
      [
        {
          "title": "Slide Title",
          "bulletPoints": ["Point 1", "Point 2", "Point 3"]
        }
      ]
      Generate exactly ${slideCount} slides. Keep the bullet points concise but informative.`,
    });

    let slides;
    try {
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      slides = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON:", text);
      return NextResponse.json({ status: "error", message: "AI failed to format response correctly." }, { status: 500 });
    }

    // Deduct credits

    return NextResponse.json({ status: "success", data: slides });
  } catch (error: any) {
    console.error("Presentation Generation Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
