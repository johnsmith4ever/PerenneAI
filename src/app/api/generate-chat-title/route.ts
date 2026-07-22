import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ title: "New Chat" });

    const { text: title } = await generateText({
      model: groq.chat("llama-3.1-8b-instant"),
      system: "You are an expert summarizer. Your task is to generate a short, concise title (maximum 5 words) for a chat based on the user's first message. You must respond ONLY with the raw title. Do not include quotes, punctuation, prefixes like 'Title:' or any conversational filler.",
      prompt: text,
      maxTokens: 10,
      temperature: 0.2,
    });

    return NextResponse.json({ title: title.trim().replace(/^["']|["']$/g, "") });
  } catch (error) {
    console.error("Chat title generation error:", error);
    return NextResponse.json({ title: "New Chat" });
  }
}
