import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    // Guest bypass allowed: userId can be null

    const { text } = await req.json();
    if (!text) return NextResponse.json({ title: "New Chat" });

    const { generateMistralText } = await import("@/lib/mistral-fallback");
    const { text: title } = await generateMistralText({
      modelName: "mistral-small-latest",
      system: "You are an expert summarizer. Your task is to generate a short, concise title (maximum 5 words) for a chat based on the user's first message. You must respond ONLY with the raw title. Do not include quotes, punctuation, prefixes like 'Title:' or any conversational filler.",
      prompt: text,
      maxOutputTokens: 10,
      temperature: 0.2,
    });

    if (userId) trackUsage(userId, "generate-chat-title").catch(console.error);

    return NextResponse.json({ title: title.trim().replace(/^["']|["']$/g, "") });
  } catch (error) {
    console.error("Chat title generation error:", error);
    return NextResponse.json({ title: "New Chat" });
  }
}
