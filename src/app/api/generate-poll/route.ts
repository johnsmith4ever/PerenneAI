import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

export const revalidate = 86400; // Cache this route globally for 24 hours (86400 seconds)

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export async function GET() {
  try {
    // Generate a fresh poll using Llama 3
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `Generate a 'Question of the Day' poll for a web app. It should be engaging, perhaps philosophical, funny, or pop-culture related. Ensure there are exactly 5 options. 
      You MUST respond with ONLY a raw JSON object and nothing else. No markdown formatting, no backticks.
      Format: {"question": "...", "options": ["...", "...", "...", "...", "..."]}`,
    });

    let object;
    try {
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      object = JSON.parse(cleanText);
    } catch (e) {
      // Fallback in case Llama fails JSON parsing
      object = {
        question: "What is the best way to support developers?",
        options: ["Coffee", "Pizza", "Server Funds", "Bug Reports", "Nice Comments"]
      };
    }

    return NextResponse.json({ status: "success", data: object });
  } catch (error: any) {
    console.error("Poll Generation Error:", error);
    return NextResponse.json({ 
      status: "error", 
      message: error.message,
      stack: error.stack,
      cause: error.cause
    }, { status: 500 });
  }
}
