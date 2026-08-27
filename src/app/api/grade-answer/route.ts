import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateGeminiText } from "@/lib/gemini-fallback";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    // Guest bypass allowed: userId can be null

    const { question, userAnswer, subject, topic } = await req.json();

    const prompt = `You are an expert AI grader for a student quiz.
Subject: ${subject}
Topic: ${topic}
Question: ${question}
Student's Answer: "${userAnswer}"

Your task:
1. Determine the correct answer to this question.
2. Decide if the student's answer is correct. Be LENIENT about formatting — if the student wrote "380g" and the answer is "380", that is correct. Accept synonyms, equivalent expressions, and minor variations.
3. Provide a short 1-2 sentence feedback.
4. If incorrect, include the model answer in "model_answer".

You MUST respond ONLY with a pure JSON object, no markdown or code fences:
{
  "correct": true or false,
  "feedback": "Short feedback string",
  "model_answer": "The correct answer (only needed if incorrect, otherwise empty string)"
}`;

    const { text: rawJson, usage } = await generateGeminiText({
      modelName: "gemini-3.5-flash",
      system: "You are an expert AI grader. Respond only with valid JSON.",
      prompt,
    });

    const cleanJson = rawJson.replace(/```json\n|```json|```/g, '').trim();
    const verdict = JSON.parse(cleanJson);

    return NextResponse.json({ status: "success", data: verdict, usage });
  } catch (error: any) {
    console.error("Grading API Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
