import { NextResponse } from "next/server";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { trackUsage } from "@/lib/usage";

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    const { action, topic, difficulty, answers, questions } = await req.json();

    if (action === "generate_questions") {
      const systemPrompt = `You are a strict, demanding exam examiner. 
Generate 3 highly challenging, curve-ball questions on the topic: "${topic}" at difficulty: "${difficulty}".
These should test deep conceptual understanding, not just rote memorization.
You MUST reply with ONLY a raw JSON array of strings representing the questions, and absolutely no other text. Example: ["Question 1?", "Question 2?", "Question 3?"]`;

      const { text, usage } = await generateText({
        model: deepseek.chat("deepseek-chat"),
        system: systemPrompt,
        messages: [{ role: "user", content: "Generate the questions." }]
      });

      const parsedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedQuestions = JSON.parse(parsedText);

      trackUsage(userId, "chat").catch(console.error);
      return NextResponse.json({ status: "success", questions: parsedQuestions, usage });

    } else if (action === "grade_answers") {
      const systemPrompt = `You are a strict exam examiner grading a student's answers under time pressure.
Topic: "${topic}"
Difficulty: "${difficulty}"

You will be given the original questions and the student's answers.
Grade them brutally but fairly. Point out any logical fallacies, missing context, or weak points.
You MUST reply with ONLY a raw JSON array of objects, each containing 'marks' (number out of 10) and 'feedback' (string). Example: [{"marks": 5, "feedback": "You failed to mention..."}]`;

      const prompt = `Questions and Answers:
${questions.map((q: string, i: number) => `Q${i+1}: ${q}\nStudent Answer: ${answers[i] || "[No Answer Provided]"}`).join("\n\n")}

Grade them now.`;

      const { text, usage } = await generateText({
        model: deepseek.chat("deepseek-chat"),
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }]
      });

      const parsedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedResults = JSON.parse(parsedText);

      trackUsage(userId, "chat").catch(console.error);
      return NextResponse.json({ status: "success", results: parsedResults, usage });
    }

    return NextResponse.json({ status: "error", message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Exam Sim API Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
