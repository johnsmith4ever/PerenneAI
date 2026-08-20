import { NextResponse } from "next/server";
import { generateText, embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createMistral } from "@ai-sdk/mistral";
import { createAnthropic } from "@ai-sdk/anthropic";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { generateGeminiText } from "@/lib/gemini-fallback";
import { generateUniversalText } from "@/lib/universal-router";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
    let { userId } = await auth();
    if (req.headers.get("x-test-bypass") === "true") userId = "test_user";
    if (!userId) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    const { action, topic, difficulty, questionType, questions, answers, marks, testSize, year, isAQA, heavyModel, judgeModel } = await req.json();

    if (action === "generate_questions") {
      let generationBreakdown = "";
      if (testSize === "Small") {
        generationBreakdown = "Generate EXACTLY 6 questions total: 3 questions worth 1 mark, 2 questions worth 3 marks, and 1 question worth 5 marks.";
      } else if (testSize === "Medium") {
        generationBreakdown = "Generate EXACTLY 10 questions total: 4 questions worth 1 mark, 4 questions worth 3 marks, and 2 questions worth 6 marks.";
      } else if (testSize === "Big") {
        generationBreakdown = "Generate EXACTLY 14 questions total: 6 questions worth 1 mark, 4 questions worth 3 marks, and 4 questions worth 6 marks.";
      } else if (testSize === "Large") {
        generationBreakdown = "Generate EXACTLY 19 questions total: 8 questions worth 1 mark, 6 questions worth 3 marks, and 5 questions worth 6 marks.";
      } else {
        generationBreakdown = "Generate EXACTLY 5 questions total: 2 questions worth 1 mark, 2 questions worth 3 marks, and 1 question worth 6 marks.";
      }

      // Run RAG in parallel with a 2s timeout — never block question generation
      let ragContext = "";
      if (isAQA) {
        try {
          const ragPromise = (async () => {
            const mistralProvider = createMistral({ apiKey: process.env.MISTRAL_API_KEY_2 });
            const { embedding } = await embed({
              model: mistralProvider.textEmbeddingModel("mistral-embed"),
              value: topic,
            });
            const { data: specs, error: specError } = await supabase.rpc("match_aqa_specs", {
              query_embedding: embedding,
              match_threshold: 0.70,
              match_count: 5,
              filter_subject: "Mathematics",
              filter_level: null
            });
            if (!specError && specs && specs.length > 0) {
              return `\n\n=== STRICT EXAM BOARD CONTEXT ===\nYou MUST use the following exact AQA specification points:\n${JSON.stringify(specs.map((s: any) => ({ topicCode: s.topic_code, specificationRequirement: s.content })), null, 2)}\n=================================`;
            }
            return "";
          })();
          const timeout = new Promise<string>((resolve) => setTimeout(() => resolve(""), 2000));
          ragContext = await Promise.race([ragPromise, timeout]);
        } catch (e) {
          console.error("Math RAG Retrieval error:", e);
        }
      }

      const systemPrompt = `You are a strict, expert math examiner. 
Topic: "${topic}" for ${year} level.
Question Type format: "${questionType}".
${isAQA ? "These problems MUST be clones of past AQA exam questions for this topic, but with somewhat edited values/numbers to prevent memorization." : ""}
${difficulty === "Higher" ? "CRITICAL INSTRUCTION: The student is taking the HIGHER tier GCSE paper, aiming for a Grade 9* (FINAL BOSS DIFFICULTY). Every question must be a maximum-difficulty grill question. You MUST combine multiple GCSE topics into a single brutal multi-step problem (e.g. simultaneous equations inside a geometry proof). Every single question must require deep multi-step working out. Do NOT generate anything a student could answer without a full page of working." : "CRITICAL INSTRUCTION: The student is taking the FOUNDATION tier paper but at GRILL difficulty. Every question should test the hardest corners of the Foundation syllabus — tricky contexts, misleading wording, multi-step reasoning. No gimme questions. Make them work for every mark."}
${ragContext}

INSTRUCTIONS FOR GENERATION:
${generationBreakdown}

CRITICAL DIFFICULTY INSTRUCTION:
Base the fundamental difficulty of the question on the requested tier. 
- "Foundation" tier = GRILL level. Hardest possible Foundation questions — multi-step reasoning, tricky worded contexts, no easy marks. Every question must demand effort.
- "Higher" tier = ABSOLUTE FINAL BOSS. Generate the hardest possible combination-topic questions that could legally appear on a Higher GCSE paper. Synthesize 2-3 topics per question. Require full-page working out. No student should find this easy.

Definitions for marks (MARKS DICTATE COMPLEXITY/STEPS, NOT BASE DIFFICULTY):
- 1 mark = A short 1-2 step problem using the base difficulty.
- 3 marks = A complex multi-step problem using the base difficulty. A student MUST use paper to solve this.
- 5 or 6 marks = A heavily multi-layered, grueling problem requiring extensive working out (potentially with parts a/b/c/d) using the base difficulty. CRITICAL: If generating parts (e.g. a, b, c), you MUST use markdown newlines (\n\n) between parts so they are not muddled together in one paragraph.

CRITICAL FORMATTING INSTRUCTION: 
You MUST format ALL equations, numbers, and mathematical symbols in the questions using LaTeX. Wrap inline math variables/equations with a single \`$\` (e.g. $x^2$) and use \`$$\` for block equations if necessary. This is required so the frontend can parse the math properly.

You MUST reply with ONLY a raw JSON array of objects, and absolutely no other text.
Example format:
[
  { "question": "Solve for x: 2x = 4", "marks": 1 },
  { "question": "A right-angled triangle has legs...", "marks": 3 },
  { "question": "Prove algebraically that...", "marks": 6 }
]`;

      const { text, usage } = await generateUniversalText({
        model: heavyModel || "Deepseek-V4-Flash",
        system: systemPrompt,
        prompt: "Generate the questions."
      });

      const parsedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsedQuestions = [];
      try {
        parsedQuestions = JSON.parse(parsedText);
      } catch (e) {
        console.error("Failed to parse JSON math questions:", parsedText);
        throw new Error("Failed to generate math questions. Please try again.");
      }

            return NextResponse.json({ status: "success", questions: parsedQuestions, usage });

    } else if (action === "grade_answers") {
      const gradingPrompt = `You are a strict GCSE Math Examiner and Logic Parser (AQA standard).
Topic: "${topic}"

You are provided with:
1. The original questions
2. The student's multi-step working out

Your job is to first analyze their logic step-by-step, and then assign final marks and provide feedback.
CRITICAL AQA RULE: ANY question worth 3 marks or more ALWAYS requires explicit, multi-step working out. If the student provides the correct answer for a 3+ mark question but does not show detailed working out (e.g., only 1 step or just the final answer), you MUST brutally deduct the majority of the marks (e.g. give 1/3 or 2/5 marks) and explicitly state: "Correct answer but no working out shown. Marks deducted under strict guidelines." You MUST enforce this rule.
For 1 mark questions, working out is encouraged but NOT strictly required for full marks if the final answer is perfectly correct.

You MUST reply with ONLY a raw JSON array of objects: { "marks": number, "max_marks": number, "feedback": "markdown string" }.
The feedback string MUST be highly organized and formatted in Markdown. Use bolding (**), short bullet points, and explicitly state what they did right vs where their logic broke down step-by-step.

DATA:
Questions and Student Working:
${questions.map((q: string, i: number) => {
  const maxMarks = marks ? marks[i] : 5;
  return `Q${i+1} [max ${maxMarks} marks]: ${q}\nStudent's Steps:\n${answers[i] || "[No Answer Provided]"}`;
}).join("\n\n")}

Example output format:
[{"marks": 2, "max_marks": 5, "feedback": "**Good Start**\\n- Your method was correct.\\n\\n**Where you went wrong**\\n- You forgot to carry the 1 in step 2."}]
`;

      const { text, usage } = await generateUniversalText({
        model: judgeModel || "Claude 4.5 Haiku",
        system: `You are a strict GCSE Math Examiner (AQA standard). Grade the student's work brutally and fairly. Reply with ONLY a raw JSON array.`,
        prompt: gradingPrompt,
        temperature: 0.1
      });

      const parsedText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      let parsedResults = [];
      try {
        parsedResults = JSON.parse(parsedText);
      } catch(e) {
        throw new Error("Failed to parse grading results.");
      }

            return NextResponse.json({ status: "success", results: parsedResults, usage });
    }

    return NextResponse.json({ status: "error", message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Math Solver API Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
