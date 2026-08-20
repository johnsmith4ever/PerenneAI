import { NextResponse } from "next/server";
import { generateText, embed } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { createMistral } from "@ai-sdk/mistral";
import { createAnthropic } from "@ai-sdk/anthropic";
import { auth } from "@clerk/nextjs/server";
import { generateUniversalText } from "@/lib/universal-router";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    const { action, topic, subject, difficulty, isAQA, weakPoints, answers, questions, testSize, year, heavyModel, judgeModel } = await req.json();

    if (action === "generate_questions") {
      let finalSystemPrompt = `You are a strict, demanding exam examiner. 
Generate highly challenging questions on the topic: "${topic}" at difficulty: "${difficulty}".
These should test deep conceptual understanding, not just rote memorization.
You MUST reply with ONLY a raw JSON array of strings representing the questions, and absolutely no other text. Example: ["Question 1?", "Question 2?", "Question 3?"]`;

      if (weakPoints) {
        finalSystemPrompt = `You are a targeted tutor and strict examiner. 
The student previously failed these specific questions/concepts:
${weakPoints}

Generate highly challenging, curve-ball questions that DIRECTLY test these exact weak points at difficulty: "${difficulty}".
You MUST reply with ONLY a raw JSON array of strings representing the questions, and absolutely no other text. Example: ["Question 1?", "Question 2?", "Question 3?"]`;
      } else if (isAQA) {
        // Query AQA database
        try {
          const { supabase } = await import("@/lib/supabase");
          const mistralProvider = createMistral({ apiKey: process.env.MISTRAL_API_KEY_2 });
          const { embedding } = await embed({
            model: mistralProvider.textEmbeddingModel("mistral-embed"),
            value: topic,
          });
          
          const threshold = subject === "Mathematics" || subject === "Maths" ? 0.70 : 0.70;

          const { data: specs, error: specError } = await supabase.rpc("match_aqa_specs", {
            query_embedding: embedding,
            match_threshold: threshold,
            match_count: 5,
            filter_subject: subject || null,
            filter_level: year === "KS3" ? undefined : year
          });

          if (!specError && specs && specs.length > 0) {
            const contextObj = specs.map((s: any) => ({
              topicCode: s.topic_code,
              specificationRequirement: s.content
            }));
            let rules = "";
            let targets = "";
            
            if (subject === "Geography") {
              rules = `AQA Geography Rules:
- 1 mark per minute rule. Leave 3 mins at the end of every 9-marker to proofread grammar/terminology for SPaG marks.
- 1-2 Mark Questions: Point-marked. Direct answer, calculation, or grid reference. No filler.
- 4-Mark Questions: Point-marked using a cause-and-effect chain. 1 point followed by 3 connectives (This leads to... which means... as a result...).
- 6-Mark Questions: Level-marked. Requires 2 developed paragraphs using specific facts/named places.
- 9-Mark Questions: Level-marked + 3 SPaG marks. Requires Intro / Point 1 (Agree) / Point 2 (Disagree or Alternative) / Conclusion with explicit judgement, packed with case study evidence.`;
              
              if (testSize === "Small") targets = "GENERATE EXACTLY: 1x 9-Mark Essay OR 1x 6-Mark Question and 2x 4-Mark Questions. DO NOT EXCEED THIS AMOUNT.";
              else if (testSize === "Medium") targets = "GENERATE EXACTLY: 1x 9-Mark Essay, 1x 6-Mark Question, and 2x 4-Mark Questions. DO NOT EXCEED THIS AMOUNT.";
              else targets = "GENERATE EXACTLY: 2x 9-Mark Essays, 2x 6-Mark Questions, and 2x 4-Mark Questions. DO NOT EXCEED THIS AMOUNT.";
            } else if (["Biology", "Chemistry", "Physics", "Science"].includes(subject || "")) {
              rules = `AQA Science Rules:
- 1 min per mark rule. A 6-mark question should take roughly 5 to 6 minutes (including 30 seconds of bullet-point planning).
- 1-3 Mark Questions: Direct point-marking. State the fact, read the graph, or write the equation.
- Maths Calculations (2-5 Marks): Step-by-step logic. Always write: Formula -> Substitution -> Rearrangement -> Final Answer with Units.
- 6-Mark Extended Prose Questions: Level-marked (Level 1: 1-2m, Level 2: 3-4m, Level 3: 5-6m).
- 6-Marker (Method/Practical): Step-by-step bulleted list with independent, dependent, and control variables specified.
- 6-Marker (Evaluate/Compare): Balanced pros/cons + a final concluding sentence.`;

              if (testSize === "Small") targets = "GENERATE EXACTLY 5 QUESTIONS IN THIS EXACT ORDER: 1. Fill-in-the-blank (1 mark), 2. Multiple Choice (1 mark), 3. Multiple Choice (1 mark), 4. Multi-step Calculation (3-4 marks), 5. 6-Mark Extended Prose Question.";
              else if (testSize === "Medium") targets = "GENERATE EXACTLY 8 QUESTIONS IN THIS EXACT ORDER: 1. Fill-in-the-blank (1 mark), 2. Multiple Choice (1 mark), 3. Multiple Choice (1 mark), 4. Multiple Choice (1 mark), 5. Multi-step Calculation (3-4 marks), 6. Multi-step Calculation (3-4 marks), 7. 6-Mark Extended Prose Question, 8. 6-Mark Extended Prose Question.";
              else targets = "GENERATE EXACTLY 11 QUESTIONS IN THIS EXACT ORDER: 1. Fill-in-the-blank (1 mark), 2. Multiple Choice (1 mark), 3. Multiple Choice (1 mark), 4. Multiple Choice (1 mark), 5. Multiple Choice (1 mark), 6. Multi-step Calculation (3-4 marks), 7. Multi-step Calculation (3-4 marks), 8. Multi-step Calculation (3-4 marks), 9. 6-Mark Extended Prose Question, 10. 6-Mark Extended Prose Question, 11. 6-Mark Extended Prose Question.";
            } else {
               targets = testSize === "Small" ? "GENERATE EXACTLY 3 QUESTIONS. DO NOT EXCEED." : testSize === "Medium" ? "GENERATE EXACTLY 5 QUESTIONS. DO NOT EXCEED." : "GENERATE EXACTLY 8 QUESTIONS. DO NOT EXCEED.";
            }

            finalSystemPrompt = `You are a strict AQA Examiner setting an exam paper for ${topic} at ${year} level.
Generate realistic exam questions based EXACTLY on these official specification points:
${JSON.stringify(contextObj, null, 2)}

${difficulty === "Higher" ? "CRITICAL INSTRUCTION: The student is taking the HIGHER tier paper. Make the questions highly challenging and 'spiced up' compared to the normal foundation questions. Use complex applied contexts and demanding mathematical requirements." : "The student is taking the FOUNDATION tier paper. Ensure the questions are accessible and standard."}

${rules}

TARGET ALLOCATION (CRITICAL):
${targets}
UNDER NO CIRCUMSTANCES SHOULD YOU GENERATE MORE QUESTIONS THAN REQUESTED IN THE TARGET ALLOCATION.

Make sure to include a diversity of question styles exactly like real AQA papers. Include simulated data extracts, short case studies, quotes, or source materials within the questions where appropriate.
Ensure the style, wording, and mark allocations reflect real AQA exam questions (e.g. "[2 marks]", "[4 marks]", "[6 marks]").
You MUST reply with ONLY a raw JSON array of strings representing the questions, and absolutely no other text. Example: ["Question 1 [4 marks]", "Question 2 [6 marks]"]`;
          } else {
            return NextResponse.json({ status: "error", message: `The topic '${topic}' does not seem to exist in the official AQA syllabus for ${subject}. Try rewording it, or switch to Freestyle mode.` }, { status: 400 });
          }
        } catch (e) {
          console.error("AQA RAG Retrieval error in exam-sim:", e);
        }
      }

      const { text, usage } = await generateUniversalText({
        model: heavyModel || "Deepseek-V4-Flash",
        system: finalSystemPrompt,
        prompt: "Generate the questions."
      });

      let parsedQuestions = [];
      try {
        // Find the first [ and the last ] to safely extract the array even if there are brackets inside
        const startIdx = text.indexOf("[");
        const endIdx = text.lastIndexOf("]");
        const jsonStr = (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) 
          ? text.substring(startIdx, endIdx + 1) 
          : text.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedQuestions = JSON.parse(jsonStr);
      } catch (e: any) {
        console.error("Failed to parse exam sim questions:", text);
        return NextResponse.json({ status: "error", message: "AI generated malformed questions. Please try again." }, { status: 500 });
      }

            return NextResponse.json({ status: "success", questions: parsedQuestions, usage });

    } else if (action === "grade_answers") {
      let finalSystemPrompt = `You are a strict exam examiner grading a student's answers under time pressure.
Topic: "${topic}"
Difficulty: "${difficulty}"

You will be given the original questions and the student's answers.
Grade them brutally but fairly. Point out any logical fallacies, missing context, or weak points.
You MUST reply with ONLY a raw JSON array of objects, each containing 'marks' (number awarded), 'max_marks' (total marks available for the question), and 'feedback' (string). 
The feedback string MUST be highly organized and formatted in Markdown. Use bolding (**), short bullet points, and explicitly state what they did right vs wrong. Be precise and brutal.
Example: [{"marks": 2, "max_marks": 5, "feedback": "**Good Start**\\n- You correctly identified X.\\n\\n**Missing Marks**\\n- You failed to mention Y."}]`;

      if (isAQA) {
        finalSystemPrompt = `You are a strict AQA Examiner grading a student's answers.
Topic: "${topic}"
Difficulty: "${difficulty}"

You will be given the original questions (which indicate the total marks available) and the student's answers.
You must grade them according to official AQA Mark Scheme principles (awarding marks for correct terminology, logical steps, specific knowledge, and deducting for contradictions).
Do not scale the marks to 10. You MUST read the question to find the total available marks (e.g., "[6 marks]") and use that as the max_marks.
You MUST reply with ONLY a raw JSON array of objects, each containing 'marks' (number awarded), 'max_marks' (total marks available for the question), and 'feedback' (string). 
The feedback string MUST be highly organized and formatted in Markdown. Use bolding (**), short bullet points, and explicitly state what they did right vs wrong according to standard AQA Mark Schemes. Be brutal and precise.
Example: [{"marks": 2, "max_marks": 4, "feedback": "**What you did right:**\\n- Correctly identified X.\\n\\n**Where you lost marks:**\\n- Failed to mention Y.\\n- AQA requires you to specifically state Z for full marks."}]`;
      }

      const prompt = `Questions and Answers:
${questions.map((q: string, i: number) => `Q${i+1}: ${q}\nStudent Answer: ${answers[i] || "[No Answer Provided]"}`).join("\n\n")}

Grade them now.`;

      const { text, usage } = await generateUniversalText({
        model: judgeModel || "Claude 4.5 Haiku",
        system: finalSystemPrompt,
        prompt: prompt,
        temperature: 0.2
      });

      let parsedResults = [];
      try {
        const startIdx = text.indexOf("[");
        const endIdx = text.lastIndexOf("]");
        const jsonStr = (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) 
          ? text.substring(startIdx, endIdx + 1) 
          : text.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedResults = JSON.parse(jsonStr);
      } catch (e: any) {
        console.error("Failed to parse exam sim grading results:", text);
        return NextResponse.json({ status: "error", message: "AI generated malformed grading results. Please try again." }, { status: 500 });
      }

            return NextResponse.json({ status: "success", results: parsedResults, usage });
    }

    return NextResponse.json({ status: "error", message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Exam Sim API Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
