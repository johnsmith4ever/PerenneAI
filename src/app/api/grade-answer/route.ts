import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { question, userAnswer, subject, topic } = await req.json();

    const prompt = `
    You are an expert AI grader for a quiz.
    Subject: ${subject}
    Topic: ${topic}
    Question: ${question}
    User's Answer: "${userAnswer}"

    Task:
    1. First, determine the ideal "model answer" for this question.
    2. Second, compare the user's answer against your model answer.
    3. Determine if they are correct, assign marks (out of 10), and provide feedback.
    
    You MUST respond ONLY with a pure JSON object matching this exact structure, with no extra markdown formatting (no \`\`\`json blocks):
    {
      "correct": boolean,
      "confidence": "high" | "medium" | "low",
      "model_answer": "string, your ideal answer",
      "marks_awarded": number,
      "marks_available": 10,
      "feedback": "string, 1-2 sentences of helpful feedback",
      "missing_points": ["string array of specific things they missed"]
    }
    `;

    const { text: rawJson, usage } = await generateText({
      model: google("gemini-3.1-flash-lite"),
      temperature: 0.2,
      prompt: prompt,
    });

    const cleanJson = rawJson.replace(/```json\n|```json|```/g, '').trim();
    const verdict = JSON.parse(cleanJson);

    return NextResponse.json({ status: "success", data: verdict, usage });
  } catch (error: any) {
    console.error("Grading API Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
