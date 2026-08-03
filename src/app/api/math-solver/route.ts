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

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    const { problem, imageBase64, context } = await req.json();
    if (!problem && !imageBase64) {
      return NextResponse.json({ status: "error", message: "Problem text or image is required" }, { status: 400 });
    }

    let extractedProblem = problem;
    let geminiUsage = null;

    // Step 1: If an image is provided, use Gemini 1.5 Flash to extract the math problem
    if (imageBase64) {
      const systemPrompt = `You are an expert Math assistant. The user has provided an image of a math problem. 
Extract the problem text and any relevant context or equations accurately. Return ONLY the extracted math problem as plain text.`;
      
      const { text, usage } = await generateText({
        model: google("gemini-3.1-flash-lite"),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              {
                type: "image",
                image: imageBase64,
              }
            ]
          }
        ],
        maxOutputTokens: 500,
      });

      extractedProblem = problem ? `${problem}\n\nExtracted from image:\n${text}` : text;
      geminiUsage = usage;
    }

    // Include context if provided
    let finalQuery = `Solve this problem: ${extractedProblem}`;
    if (context && context.trim() !== "") {
      finalQuery += `\nAdditional context / type of calculation: ${context}`;
    }

    // Step 2: Pass the extracted problem to DeepSeek for step-by-step solving
    const deepseekSystemPrompt = `You are an expert Math Step-by-Step Solver.
Your task is to solve the following math problem in a rigorous, step-by-step manner.

CRITICAL INSTRUCTION FOR MATH FORMATTING:
You MUST use plain ASCII text for all math and equations. 
Absolutely NO LaTeX (no \\frac, no \\sqrt, no \\( \\)).
Absolutely NO weird unicode math symbols.
Write equations simply and clearly like \`2x^2 + 5x - 3 = 0\` or \`x = (-b +/- sqrt(b^2 - 4ac)) / 2a\`.

Return the result ONLY as a valid JSON object with the following structure:
{
  "steps": [
    { "step": 1, "title": "Step title", "content": "Detailed step content/equations in plain text" },
    ...
  ],
  "finalAnswer": "The final concise answer in plain text"
}

Do not use markdown blocks for the outer response, just raw JSON.`;

    const { text: jsonText, usage: deepseekUsage } = await generateText({
      model: deepseek.chat("deepseek-chat"),
      system: deepseekSystemPrompt,
      messages: [{ role: "user", content: finalQuery }],
      maxOutputTokens: 2000,
      temperature: 0.2, // low temp for math
    });

    let solutionData;
    try {
      const cleaned = jsonText.replace(/^```json/, "").replace(/```$/, "").trim();
      solutionData = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse JSON from DeepSeek:", jsonText);
      return NextResponse.json({ status: "error", message: "Failed to parse math solution." }, { status: 500 });
    }

    trackUsage(userId, "chat").catch(console.error);

    return NextResponse.json({
      status: "success",
      solution: solutionData.steps,
      finalAnswer: solutionData.finalAnswer,
      extractedProblem: imageBase64 ? extractedProblem : undefined,
      usage: {
        gemini: geminiUsage,
        deepseek: deepseekUsage
      }
    });

  } catch (error: any) {
    console.error("Math API Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
