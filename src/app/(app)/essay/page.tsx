"use client";

import { useState, useEffect } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useSubscription, ModelType, TIER_RANK, FREE_ACCESS_MODE, getTierModels } from "@/hooks/use-subscription";
import { 
  Upload, FileText, ArrowRight, Image as ImageIcon, 
  Cpu, Sparkles, ArrowLeft, PenTool, BookOpenCheck, Loader2, CheckCircle2,
  XCircle, TrendingUp, ChevronDown, Save, Lock, Clock, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ApiErrorFallback } from "@/components/ui/api-error-fallback";
import { PaywallOverlay } from "@/components/ui/paywall";

type Role = "student" | "teacher" | null;
type SourceType = "ai" | "real" | null;

interface EssayConfig {
  questionType: string;
  style: string;
  yearGroup: string;
  difficulty: string;
  subject: string;
  length: string;
  testSize: string;
  analysisTypes: string[];
  questionCounts: {
    short: number;
    simple: number;
    detailed: number;
  };
  isTimedCustom?: boolean;
}

interface GradingConfig {
  structure: string;
  paragraphs: number;
  passage: string;
}

interface GradingAnswer {
  question: string;
  answer: string;
}

type GradingStatus = "idle" | "ocr" | "marker" | "judge" | "complete" | "error";

interface GradingResult {
  final_score: number;
  grade_letter: string;
  category_breakdown: {
    "Content & Knowledge"?: number;
    "Structure & Organisation"?: number;
    "Language, Tone & Style"?: number;
    "Technical Accuracy"?: number;
  };
  key_issues: string[];
  improvement_points: string[];
  student_summary: string;
  marker_log: string;
}

export default function EssayPage() {
  const router = useRouter();
  const { user } = useUser();
  const { tier, deductCredits, canAfford, isLoaded, assistant, heavy, judge, grading } = useSubscription();
  const { curriculumLevel, curriculumSubject } = useCurriculum();
  const [role, setRole] = usePersistentState<Role>("essay_role", null);
  const tierRank = TIER_RANK[tier] ?? 0;
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  
  // Always render up to 8 paragraphs, but gate selection in the handler
  const maxParagraphs = 8;
  
  // Student flow state
  const [essayStep, setEssayStep] = usePersistentState<number>("essay_step", 1);
  const [sourceType, setSourceType] = usePersistentState<SourceType>("essay_source", null);
  const [config, setConfig] = usePersistentState<EssayConfig>("essay_config", {
    questionType: "AQA Exam Simulator",
    style: "Modern Texts",
    yearGroup: "GCSE",
    difficulty: "Foundation",
    subject: "English Language",
    length: "Medium",
    testSize: "Medium",
    analysisTypes: ["Balanced"],
    questionCounts: {
      short: 0,
      simple: 0,
      detailed: 1
    },
    isTimedCustom: false
  });
  
  const [realImage, setRealImage] = usePersistentState<string | null>("essay_real_img", null);
  const [ocrText, setOcrText] = usePersistentState<string>("essay_ocr_text", "");

  const [generatedPassage, setGeneratedPassage] = usePersistentState<string>("essay_gen_passage", "");
  const [generatedSummary, setGeneratedSummary] = usePersistentState<string>("essay_gen_summary", "");
  const [generatedQuestion, setGeneratedQuestion] = usePersistentState<string>("essay_gen_question", "");
  const [studentAnswers, setStudentAnswers] = usePersistentState<string[]>("essay_student_answers", []);
  
  const [essayTimeLeft, setEssayTimeLeft] = useState(0);
  const [essayTimerState, setEssayTimerState] = useState<"idle" | "running" | "expired" | "forfeited">("idle");
  
  useEffect(() => {
    if (essayTimerState === "running" && essayTimeLeft > 0) {
      const timer = setInterval(() => setEssayTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (essayTimerState === "running" && essayTimeLeft === 0) {
      setEssayTimerState("expired");
    }
  }, [essayTimerState, essayTimeLeft]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.hidden && essayStep === 3) {
        timeoutId = setTimeout(() => setEssayTimerState("forfeited"), 10000);
      } else {
        clearTimeout(timeoutId);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [essayStep, setEssayTimerState]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [setupError, setSetupError] = useState(false);

  // Teacher flow state
  const [teacherStep, setTeacherStep] = usePersistentState<number>("essay_teacher_step", 1);
  const [teacherImage, setTeacherImage] = usePersistentState<string | null>("essay_teacher_img", null);
  const [gradingConfig, setGradingConfig] = usePersistentState<GradingConfig>("essay_grading_config", {
    structure: "PEEL",
    paragraphs: 1,
    passage: ""
  });
  const [gradingAnswers, setGradingAnswers] = usePersistentState<GradingAnswer[]>("essay_grading_answers", []);

  // Multi-Agent Grading State
  const [gradingStatus, setGradingStatus] = usePersistentState<GradingStatus>("essay_grading_status", "idle");
  const [gradingResult, setGradingResult] = usePersistentState<GradingResult | null>("essay_grading_result", null);
  
  const handleStartOver = () => {
    setRole(null);
    setEssayStep(1);
    setTeacherStep(1);
    setSourceType(null);
    setRealImage(null);
    setOcrText("");
    setGeneratedPassage("");
    setGeneratedSummary("");
    setGeneratedQuestion("");
    setStudentAnswers([]);
    
    // Clear Teacher grading state as well
    setTeacherImage(null);
    setGradingConfig({
      structure: "PEEL",
      paragraphs: 1,
      passage: ""
    });
    setGradingAnswers([]);
    setGradingStatus("idle");
    setGradingResult(null);
    setHasSaved(false);
  };

  const handleLengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "Long" && !FREE_ACCESS_MODE && tierRank < TIER_RANK.Premium) {
      router.push("/subscriptions");
      return;
    }
    if (val === "Medium" && !FREE_ACCESS_MODE && tierRank < TIER_RANK.Pro) {
      router.push("/subscriptions");
      return;
    }
    setConfig({...config, length: val});
  };


  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setConfig({...config, style: val});
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void, ocrSetter?: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setter(event.target?.result as string);
        if (ocrSetter) {
          ocrSetter("This is placeholder OCR text extracted from your uploaded image. It will appear here once the backend OCR logic is connected.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateExercise = async () => {
    if (!isLoaded) return;
    if (!canAfford(3000, "Llama 70B")) {
      alert("You do not have enough daily credits to generate an essay setup. Please try again tomorrow or upgrade your plan.");
      return;
    }

    setIsGenerating(true);
    setEssayStep(3);
    
    let allowedParagraphs = 1;
    if (tierRank >= TIER_RANK.Premium) allowedParagraphs = 8;
    else if (tierRank >= TIER_RANK.Pro) allowedParagraphs = 5;
    else if (tierRank >= TIER_RANK.Core) allowedParagraphs = 3;

    const isAQA = config.questionType === "AQA Exam Simulator";
    const isTimed = config.questionType === "AQA Exam Simulator";
    const customTotal = config.questionCounts.short + config.questionCounts.simple + config.questionCounts.detailed;
    
    let aqaTotal = 5;
    if (isAQA) {
      if (config.testSize === "Small") aqaTotal = 4;
      else if (config.testSize === "Medium") aqaTotal = 5;
      else if (config.testSize === "Large") aqaTotal = 6;
    }
    
    const effectiveParagraphs = isAQA ? aqaTotal : Math.max(1, Math.min(customTotal, allowedParagraphs));
    const effectiveStyle = isAQA ? "AQA Exam Material" : config.style;
    const effectiveStructure = isAQA ? "AQA Full Exam Structure" : "Custom Questions";
    
    setStudentAnswers(Array(effectiveParagraphs).fill(""));

    const analysisFocusText = (config.analysisTypes || []).includes("Balanced") 
      ? "a balanced mix of literary elements (theme, character, language, and structure)"
      : `the following elements: ${(config.analysisTypes || ["Balanced"]).join(" and ")}`;

    try {
      setSetupError(false);
      let finalPassage = "";
      
      if (sourceType === "ai") {
        let promptLength = config.length || "Medium";
        let aqaLengthRules = "";
        if (isAQA) {
          if (config.testSize === "Small") {
            promptLength = "Short";
            aqaLengthRules = "approx 250-350 words";
          } else if (config.testSize === "Medium") {
            promptLength = "Medium";
            aqaLengthRules = "approx 450-550 words";
          } else if (config.testSize === "Large") {
            promptLength = "Long";
            aqaLengthRules = "approx 650-800 words";
          }
        }
        
        const passageTokens = tierRank >= TIER_RANK.Pro ? 3000 : 2500;

        const passageRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Generate a study passage/extract about: ${config.subject}. ${isAQA ? `Use the provided AQA specification context to ensure it is factually aligned with the syllabus. The passage must mimic the exact linguistic complexity, tone, and formatting of a real AQA exam extract. It must be ${aqaLengthRules} in length.` : `It should be ${promptLength.toLowerCase()} in length.`}` }],
            systemPrompt: isAQA 
              ? `You are a senior AQA examiner and educational author. Write an extract that perfectly encapsulates the specification points provided in the context. Ensure it matches the requested style (${effectiveStyle}). It MUST contain rich linguistic devices, structural features, and layered themes suitable for rigorous GCSE-level analysis (AO2/AO3). Do not include a title or any intro, just the raw passage text.`
              : `You are an expert educational author. Write a passage about the requested topic. Ensure it matches the requested style (${effectiveStyle}). Do not include a title or any intro, just the raw passage text.`,
            model: heavy,
            maxTokens: passageTokens,
            curriculumLevel,
            curriculumSubject: config.subject, // Override the global context so it doesn't force biology restrictions for english essays
            chatMode: "Standard", // Always use standard for English since we don't have English AQA specs in DB yet
            extraTopicDetails: isAQA ? `AQA Specification Passage for ${config.subject}` : undefined,
          }),
        });
        const passageData = await passageRes.json();
        if (passageData.usage) deductCredits(passageData.usage.inputTokens, passageData.usage.outputTokens, heavy);
        finalPassage = passageData.text;
      } else {
        finalPassage = ocrText;
      }
      setGeneratedPassage(finalPassage);

      if (tierRank >= TIER_RANK.Pro) {
        setGeneratedSummary(finalPassage);
      } else {
        const summaryRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Write a concise summary of the following passage. Focus strictly on the core plot, main themes, and key literary devices. Keep it under 150 words. Do NOT invent information. This summary is used to verify a student's reading comprehension.\n\nPassage:\n${finalPassage}` }],
            systemPrompt: "You are an objective AI summarizing a passage for grading context.",
            model: heavy,
            maxTokens: 200,
            curriculumLevel,
            curriculumSubject: config.subject,
            extraTopicDetails: `AQA English summary of passage`,
          }),
        });
        const summaryData = await summaryRes.json();
        if (summaryData.usage) deductCredits(summaryData.usage.inputTokens, summaryData.usage.outputTokens, heavy);
        setGeneratedSummary(summaryData.text);
      }

      let aqaPrompt = "";
      if (config.testSize === "Small") {
        aqaPrompt = "2 short answer questions (1 mark each), 1 short paragraph question (3 marks), and 1 long paragraph (8 marks / 2 PETALs) question.";
      } else if (config.testSize === "Medium") {
        aqaPrompt = "2 short answer questions (1 mark each), 1 short paragraph question (3 marks), 1 long paragraph question (4 marks / 1 PETAL), and 1 long paragraph (8 marks / 2 PETALs) question.";
      } else {
        aqaPrompt = "4 short answer questions (1 mark each), and 2 long paragraph (8 marks / 2 PETALs) questions.";
      }

      const qRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: isAQA 
            ? `Based on this passage, create a highly realistic AQA exam for ${config.yearGroup} students at ${config.difficulty} tier. Generate exactly: ${aqaPrompt} Focus the questions on analyzing ${analysisFocusText}. EACH question MUST explicitly state the marks at the end (e.g. [4 marks]). For any paragraph or 8-mark questions, you MUST explicitly state '(Use the PETAL structure)' in the question text. Do not include any intro, just the raw questions separated by newlines.\n\nPassage:\n${finalPassage}`
            : `Based on this passage, create a custom exam for ${config.yearGroup} students at a ${config.difficulty} level. Generate exactly ${config.questionCounts.short} short answer questions (1-2pts), ${config.questionCounts.simple} simple paragraph questions (3-4pts), and ${config.questionCounts.detailed} detailed paragraph (PETALS) questions (5-6pts). Focus the questions on analyzing ${analysisFocusText}. EACH question MUST explicitly state the marks at the end (e.g. [4 marks]). For any paragraph or 8-mark questions, you MUST explicitly state '(Use the PETAL structure)' in the question text. Do not include any intro, just the raw questions separated by newlines.\n\nPassage:\n${finalPassage}` 
          }],
          systemPrompt: "You are an expert literature teacher creating exam questions.",
          model: heavy,
          maxTokens: 500,
          curriculumLevel,
          curriculumSubject: config.subject,
          extraTopicDetails: `AQA English question creation for passage`,
        }),
      });
      const qData = await qRes.json();
      if (qData.usage) deductCredits(qData.usage.inputTokens, qData.usage.outputTokens, heavy);
      setGeneratedQuestion(qData.text);
      
      let minutes = 30;
      if (isAQA) {
        minutes = (config.testSize === "Small" ? 30 : config.testSize === "Medium" ? 45 : 60);
      } else if (config.isTimedCustom) {
        minutes = (config.questionCounts.detailed * 9) + 
                  (config.questionCounts.simple * 5) + 
                  (config.questionCounts.short * 2);
        if (customTotal > 2) minutes += 2;
      }
      
      const finalIsTimed = isAQA || config.isTimedCustom;
      if (finalIsTimed) {
        setEssayTimeLeft(minutes * 60);
        setEssayTimerState("running");
      } else {
        setEssayTimeLeft(0);
        setEssayTimerState("idle");
      }
      
    } catch (e) {
      console.error(e);
      setSetupError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkEssayStudent = async (answers: {question: string, answer: string}[]) => {
    if (!isLoaded) return;
    const markerModel: ModelType = grading;
    if (!canAfford(4000, markerModel)) {
      alert("You do not have enough daily credits to grade this essay. Please try again tomorrow.");
      return;
    }
    try {
      const typedAnswers = answers.map((a, i) => `Question ${i+1}:\nQ: ${a.question}\nA: ${a.answer}`).join("\n\n");
      const finalSubmissionText = `[Typed Answers]:\n${typedAnswers}`;

      setGradingStatus("marker");
      const markerSystemPrompt = `You are a strict AQA Examiner grading a student's response for an English exam.
You must strictly evaluate the student based on AQA English mark scheme requirements.

Key Assessment Objectives (AOs):
- AO1: Read, understand and respond to texts. (Clear understanding, embedded quotations).
- AO2: Analyse how writers use language and structure to achieve effects. (Perceptive analysis of methods, terminology, effect on reader).
- AO3: Show understanding of the relationships between texts and contexts. (Relevant contextual links).
- AO4: Evaluate texts critically with appropriate textual references.

Identify every flaw in their response based on the provided passage/source material. Be ruthless but fair. Output a detailed error log detailing exact mistakes, missed analytical opportunities, and weak terminology. Do not output a final score yet.`;

      const markerUserMessage = `Passage Summary:
${generatedSummary || generatedPassage}

Student Submission:
${finalSubmissionText}`;

      const markerRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: markerUserMessage }],
          systemPrompt: markerSystemPrompt,
          model: markerModel,
          maxTokens: 400,
          curriculumLevel,
          curriculumSubject,
          extraTopicDetails: `AQA English essay grading criteria`,
        }),
      });
      const markerData = await markerRes.json();
      if (!markerData.text) throw new Error("Marker failed");
      if (markerData.usage) deductCredits(markerData.usage.inputTokens, markerData.usage.outputTokens, markerModel);
      const markerLog = markerData.text;

      setGradingStatus("judge");
      const judgeSystemPrompt = `You are The Judge. You will receive an essay's qualitative error log produced by a strict examiner based on the AQA English Mark Scheme. 

Your task is to translate this raw log into a final percentage score (0-100%) and a concise summary.

You MUST respond with ONLY a raw JSON object matching this schema exactly:
{
  "final_score": 85,
  "grade_letter": "Level 5",
  "category_breakdown": {
    "AO1 (Understanding & Quotes)": 20,
    "AO2 (Language & Structure)": 30,
    "AO3 (Context)": 20,
    "AO4 (Critical Evaluation)": 15
  },
  "key_issues": ["Issue 1", "Issue 2"],
  "improvement_points": ["Actionable step 1", "Actionable step 2"],
  "student_summary": "A brief, encouraging paragraph summarizing their performance."
}
Do not use markdown. Output pure JSON.`;

      const judgeUserMessage = `Extract the final fair score and breakdown based on the log below. Assign the grade letter, and provide 2-3 key issues and 2-3 actionable improvement points.\n\nMarker's Error Log:\n${markerLog}`;

      const judgeRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: judgeUserMessage }],
          systemPrompt: judgeSystemPrompt,
          model: grading,
          maxTokens: 400,
          curriculumLevel,
          curriculumSubject,
          chatMode: "Strict Syllabus",
          extraTopicDetails: `AQA grading synthesis`,
        }),
      });
      const judgeData = await judgeRes.json();
      if (!judgeData.text) throw new Error("Judge failed");
      
      if (judgeData.usage) deductCredits(judgeData.usage.inputTokens, judgeData.usage.outputTokens, grading);
      
      const cleaned = judgeData.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsedJson = JSON.parse(cleaned);

      setGradingResult({ ...parsedJson, marker_log: markerLog });
      setGradingStatus("complete");
    } catch (e) {
      console.error(e);
      setGradingStatus("error");
    }
  };

  const handleSubmitStudentEssay = () => {
    setEssayStep(4);
    const populatedAnswers = studentAnswers.map(ans => ({
      question: generatedQuestion,
      answer: ans
    }));
    
    // Configure grading config for history saving if needed
    const isAQA = config.questionType === "AQA Exam Simulator";
    setGradingConfig({
      structure: isAQA ? "AQA Full Exam Structure" : "Custom Questions",
      paragraphs: studentAnswers.length,
      passage: generatedSummary || generatedPassage
    });
    setGradingAnswers(populatedAnswers);
    
    setGradingStatus("idle");
    setGradingResult(null);
    setHasSaved(false);
    
    // Automatically start marking
    handleMarkEssayStudent(populatedAnswers);
  };

  const saveToHistory = async () => {
    if (!user || !gradingResult) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("essay_history").insert({
        user_id: user.id,
        source_passage: gradingConfig.passage || "Image uploaded",
        student_submission: gradingAnswers.map((a, i) => `Paragraph ${i+1}:\nQ: ${a.question}\nA: ${a.answer}`).join("\n\n"),
        final_score: gradingResult.final_score,
        grade_letter: gradingResult.grade_letter,
        marker_log: gradingResult.marker_log,
        key_issues: gradingResult.key_issues,
        improvement_points: gradingResult.improvement_points
      });
      if (error) throw error;
      setHasSaved(true);
    } catch (e) {
      console.error("Error saving essay history:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGradeEssay = async () => {
    if (!isLoaded) return;
    // Use Deepseek V4 Flash for the Marker since deepseek-reasoner (Pro) can sometimes 
    // swallow output into reasoning blocks, causing "No response received" empty text errors.
    // swallow output into reasoning blocks, causing "No response received" empty text errors.
    const markerModel: ModelType = heavy;
    if (!canAfford(4000, markerModel)) {
      alert("You do not have enough daily credits to grade this essay. Please try again tomorrow or upgrade your plan.");
      return;
    }

    try {
      let finalSubmissionText = "";
      
      if (teacherImage) {
        setGradingStatus("ocr");
        const ocrRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ 
              role: "user", 
              content: [
                { type: "text", text: "Extract all the text from this image exactly as written. Do not add any commentary." },
                { type: "image", image: teacherImage }
              ] 
            }],
            model: "Gemini 3.6 Flash",
          }),
        });
        const ocrData = await ocrRes.json();
        if (ocrData.usage) deductCredits(ocrData.usage.inputTokens, ocrData.usage.outputTokens, heavy);
        if (ocrData.text) {
          finalSubmissionText += `[Extracted from Image Submission]:\n${ocrData.text}\n\n`;
        }
      }

      const typedAnswers = gradingAnswers.map((a, i) => `Paragraph ${i+1}:\nQuestion: ${a.question}\nAnswer: ${a.answer}`).join("\n\n");
      finalSubmissionText += `[Typed Answers]:\n${typedAnswers}`;

      setGradingStatus("marker");
      const markerSystemPrompt = `You are a strict AQA Examiner grading a student's response for an English exam (Language or Literature).
You must strictly evaluate the student based on AQA English mark scheme requirements.

Key Assessment Objectives (AOs) to look for:
- AO1: Read, understand and respond to texts. (Clear understanding, embedded quotations).
- AO2: Analyse how writers use language and structure to achieve effects. (Perceptive analysis of methods, terminology, effect on reader).
- AO3: Show understanding of the relationships between texts and the contexts in which they were written. (Relevant contextual links).
- AO4: Evaluate texts critically and support this with appropriate textual references.

CRITICAL INSTRUCTION: You MUST scale your expectations and feedback length based on the marks available for each question:
- For 1-3 mark questions: Look for a single valid point. DO NOT penalize for lack of embedded quotes, terminology, or depth. Keep feedback extremely brief (max 1-2 short sentences).
- For 4-6 mark questions: Look for basic structure (PEEL/PETAL). Evaluate clarity of point, evidence, and simple explanation. Keep feedback concise (max 3 bullet points).
- For 8+ mark questions: Apply full rigorous AQA standards. Expect embedded quotes, terminology, perceptive analysis, and structured arguments. Provide a detailed error log detailing exact mistakes and missed analytical opportunities.

Do not penalize them if they do not use a standard 'PEE' paragraph structure on long questions, provided their analysis is fluent, perceptive, and analytical.
Identify flaws in their response based on the provided passage/source material. Be ruthless but fair, adhering to the mark-scaling rules above. Do not output a final score yet.`;

      const markerUserMessage = `Passage Summary (for thematic reference):
${gradingConfig.passage || "None provided"}

Assignment: Write ${gradingConfig.paragraphs} paragraphs using ${gradingConfig.structure} structure.

Student Submission:
${finalSubmissionText}`;

      const markerRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: markerUserMessage }],
          systemPrompt: markerSystemPrompt,
          model: markerModel,
          maxTokens: 1500,
          curriculumLevel,
          curriculumSubject,
          extraTopicDetails: `AQA English essay grading criteria`,
        }),
      });
      const markerData = await markerRes.json();
      if (!markerData.text) {
        console.error("Marker API error:", markerData);
        throw new Error(`Marker failed: ${markerData.message || "No response received."}`);
      }
      if (markerData.usage) deductCredits(markerData.usage.inputTokens, markerData.usage.outputTokens, markerModel);
      const markerLog = markerData.text;

      setGradingStatus("judge");
      const judgeSystemPrompt = `You are The Judge, an encouraging educator. You will receive an essay's qualitative error log produced by a strict examiner based on the AQA English Mark Scheme. 

Your task is to translate this raw log into a final percentage score (0-100%) and a concise summary for the student. Be encouraging but accurate to the examiner's notes. 

You MUST respond with ONLY a raw JSON object matching this schema exactly:
{
  "final_score": 85,
  "grade_letter": "Level 5",
  "category_breakdown": {
    "AO1 (Understanding & Quotes)": 20,
    "AO2 (Language & Structure)": 30,
    "AO3 (Context)": 20,
    "AO4 (Critical Evaluation)": 15
  },
  "key_issues": ["Issue 1", "Issue 2"],
  "improvement_points": ["Actionable step 1", "Actionable step 2"],
  "student_summary": "A brief, encouraging paragraph summarizing their performance."
}
Do not use markdown code blocks. Output pure JSON.`;

      const judgeUserMessage = `Based solely on the error log below, extract the final fair score and breakdown. Assign the grade letter, and provide 2-3 key issues and 2-3 actionable improvement points.\n\nMarker's Error Log:\n${markerLog}`;

      const judgeRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: judgeUserMessage }],
          systemPrompt: judgeSystemPrompt,
          model: grading,
          maxTokens: 800,
          curriculumLevel,
          curriculumSubject,
          chatMode: "Strict Syllabus",
          extraTopicDetails: `AQA grading synthesis`,
        }),
      });
      const judgeData = await judgeRes.json();
      if (!judgeData.text) throw new Error("Judge failed");
      
      if (judgeData.usage) deductCredits(judgeData.usage.inputTokens, judgeData.usage.outputTokens, grading);
      
      let parsedJson;
      try {
        const cleaned = judgeData.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        parsedJson = JSON.parse(cleaned);
      } catch (e) {
        console.error("JSON parsing error:", e, judgeData.text);
        throw new Error("Failed to parse Judge's verdict.");
      }

      setGradingResult({
        ...parsedJson,
        marker_log: markerLog
      });
      setHasSaved(false);
      setGradingStatus("complete");
    } catch (e) {
      console.error(e);
      setGradingStatus("error");
    }
  };

  if (!role) {
    return (
      <div className="space-y-8 animate-in fade-in">
        <div>
          <p className="label-title mb-1.5">Study tools</p>
          <div className="flex items-center gap-3">
            <h1 className="page-title m-0">Essay</h1>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1">AQA Syllabus</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            How will you be using Essay today?
          </p>
        </div>

        {isLoaded && tierRank < TIER_RANK.Core && !FREE_ACCESS_MODE && (
          <PaywallOverlay 
            tierRequired="Core"
            title="Essay Tool Locked"
            description="Upgrade to the Core plan to access custom AI writing exercises and detailed essay grading."
          />
        )}
        
        <div className={cn("grid md:grid-cols-2 gap-6 max-w-2xl", tierRank < TIER_RANK.Core && !FREE_ACCESS_MODE && "opacity-20 pointer-events-none blur-[2px]")}>
          <button 
            onClick={() => {
              setRole("student");
              setSourceType("ai");
              setEssayStep(2);
            }}
            className="flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group relative overflow-hidden shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-primary/20">
              <PenTool className="w-7 h-7" />
            </div>
            <p className="section-title mb-2 relative z-10">Create a writing test now</p>
            <p className="text-sm text-muted-foreground relative z-10">
              Grade my own essays and get actionable feedback to improve my writing.
            </p>
          </button>

          <button 
            onClick={() => setRole("teacher")}
            className="flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group relative overflow-hidden shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-primary/20">
              <BookOpenCheck className="w-7 h-7" />
            </div>
            <p className="section-title mb-2 relative z-10">Grade essays</p>
            <p className="text-sm text-muted-foreground relative z-10">
              Grade my students' essays, manage rubrics, and track class progress.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (role === "teacher") {
    return (
      <div className="space-y-8 max-w-4xl animate-in fade-in pb-12">
        <div className="flex items-start justify-between">
          <div>
            <p className="label-title mb-1.5">Study tools</p>
            <h1 className="page-title">
              Essay <span className="text-muted-foreground font-normal text-lg ml-2">(Grading)</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Upload essays for full detailed AI feedback.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setRole("student")} className="gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              Switch to Practice
            </Button>
            <Button variant="ghost" size="sm" onClick={handleStartOver} className="text-muted-foreground hover:text-foreground">
              Start Over
            </Button>
          </div>
        </div>

        {teacherStep === 1 && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in">
            <h2 className="text-xl font-semibold text-foreground">Prepare Essay for Marking</h2>
            
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Source Material</h3>
              <div className="grid gap-6">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center flex flex-col items-center justify-center hover:bg-muted/50 transition-colors">
                  {teacherImage ? (
                    <img src={teacherImage} alt="Uploaded text" className="max-h-48 object-contain rounded-lg mb-4 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-4">
                      <Upload className="w-5 h-5" />
                    </div>
                  )}
                  <p className="text-sm font-medium text-foreground mb-4">
                    {teacherImage ? "Image uploaded" : "Upload an image of the essay or source material (Optional)"}
                  </p>
                  <input 
                    type="file" 
                    id="teacherImageUpload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleImageUpload(e, setTeacherImage)} 
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('teacherImageUpload')?.click()}>
                    {teacherImage ? "Change Image" : "Select Image"}
                  </Button>
                </div>
                
                <div className="flex items-center justify-center gap-4 text-muted-foreground text-sm">
                  <div className="flex-1 h-px bg-border"></div>
                  <span>OR / AND</span>
                  <div className="flex-1 h-px bg-border"></div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Passage Text Box</label>
                  <textarea
                    value={gradingConfig.passage}
                    onChange={(e) => setGradingConfig({...gradingConfig, passage: e.target.value})}
                    className="w-full min-h-[150px] p-4 rounded-xl border border-border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                    placeholder="Paste the source passage here..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Configuration</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Number of Questions / Paragraphs</label>
                  <select 
                    value={gradingConfig.paragraphs}
                    onChange={(e) => setGradingConfig({...gradingConfig, paragraphs: Number(e.target.value)})}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {Array.from({ length: maxParagraphs }, (_, i) => i + 1).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Type of Paragraphs</label>
                  <select 
                    value={gradingConfig.structure}
                    onChange={(e) => setGradingConfig({...gradingConfig, structure: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {["PEE", "PEEL", "PETAL", "TEEL", "Freeform"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button size="lg" onClick={() => {
                setGradingAnswers(prev => {
                  const arr = [...prev];
                  while(arr.length < gradingConfig.paragraphs) arr.push({question: "", answer: ""});
                  if(arr.length > gradingConfig.paragraphs) arr.length = gradingConfig.paragraphs;
                  return arr;
                });
                setTeacherStep(2);
                setGradingStatus("idle");
                setGradingResult(null);
              }}>
                Proceed to Marking View <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {teacherStep === 2 && (
          <div className="space-y-12 animate-in slide-in-from-bottom-4 fade-in">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setTeacherStep(1)} className="rounded-full shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold text-foreground">Marking View</h2>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-lg font-semibold text-foreground">Student Submission</h3>
                <span className="text-xs font-medium px-2.5 py-1 bg-secondary rounded-full text-secondary-foreground">
                  {gradingConfig.paragraphs} Paragraph{gradingConfig.paragraphs > 1 ? 's' : ''} • {gradingConfig.structure}
                </span>
              </div>

              {gradingAnswers.map((ans, idx) => (
                <div key={idx} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm relative group">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                      {idx + 1}
                    </span>
                    <label className="text-sm font-semibold text-foreground">
                      Paragraph {idx + 1}
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-primary uppercase tracking-wider">Question / Task</label>
                    <textarea
                      value={ans.question}
                      onChange={(e) => {
                        const copy = [...gradingAnswers];
                        copy[idx].question = e.target.value;
                        setGradingAnswers(copy);
                      }}
                      className="w-full min-h-[60px] p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                      placeholder="Enter the question being answered..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Answer</label>
                    <textarea
                      value={ans.answer}
                      onChange={(e) => {
                        const copy = [...gradingAnswers];
                        copy[idx].answer = e.target.value;
                        setGradingAnswers(copy);
                      }}
                      className="w-full min-h-[150px] p-4 rounded-xl border border-border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                      placeholder={`Student's ${gradingConfig.structure} response...`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-6 pb-20 border-t border-border">
              {gradingStatus === "idle" ? (
                <div className="flex flex-col items-end gap-2">
                  <Button size="lg" className="px-8 shadow-sm gap-2" onClick={handleGradeEssay}>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit for AI Grading
                  </Button>
                </div>
              ) : gradingStatus === "error" ? (
                <ApiErrorFallback message="An error occurred while grading the essay." onRetry={handleGradeEssay} />
              ) : gradingStatus !== "complete" ? (
                <div className="flex items-center gap-3 px-8 py-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-semibold text-sm">
                    {gradingStatus === "ocr" && "Extracting text from image..."}
                    {gradingStatus === "marker" && "The Marker (DeepSeek) is analyzing..."}
                    {gradingStatus === "judge" && "The Judge (Gemini) is evaluating..."}
                  </span>
                </div>
              ) : gradingResult ? (
                <div className="w-full bg-card border border-border rounded-xl p-8 shadow-lg mt-8 animate-in slide-in-from-bottom-4 fade-in">
                  <div className="flex items-start justify-between border-b border-border pb-6 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Grading Verdict</h3>
                      <p className="text-sm text-muted-foreground mt-1">Evaluated by DeepSeek V4 Flash & Gemini Flash-Lite</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</span>
                        <span className="text-3xl font-bold text-foreground">{gradingResult.final_score}/100</span>
                      </div>
                      <div className="h-10 w-px bg-border mx-2"></div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</span>
                        <span className="text-4xl font-black text-primary">{gradingResult.grade_letter}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-secondary/30 border border-secondary mb-8">
                    <h4 className="text-sm font-bold text-foreground mb-2">Educator Summary</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{gradingResult.student_summary}</p>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Category Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {gradingResult.category_breakdown && Object.entries(gradingResult.category_breakdown).map(([cat, score]) => (
                        <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-sm">
                          <span className="text-sm font-medium text-foreground">{cat}</span>
                          <span className="text-sm font-bold text-primary">{score}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Key Issues
                      </h4>
                      <ul className="space-y-2">
                        {gradingResult.key_issues?.map((issue, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-green-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Improvement Points
                      </h4>
                      <ul className="space-y-2">
                        {gradingResult.improvement_points?.map((point, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <details className="group border border-border rounded-lg bg-muted/20">
                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <span>View The Marker's Raw Log (DeepSeek)</span>
                      <span className="transition group-open:rotate-180">
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </summary>
                    <div className="p-4 pt-0 border-t border-border mt-2">
                      <div className="prose prose-sm prose-stone max-w-none text-muted-foreground whitespace-pre-wrap">
                        {gradingResult.marker_log}
                      </div>
                    </div>
                  </details>
                  
                  <div className="mt-8 flex justify-end gap-3 border-t border-border pt-6">
                    <Button variant="outline" onClick={handleStartOver}>New Essay</Button>
                    <Button variant="outline" onClick={() => {
                        setGradingStatus("idle");
                        setGradingResult(null);
                        setHasSaved(false);
                    }}>Mark Another Submission</Button>
                    <Button 
                      onClick={saveToHistory}
                      disabled={isSaving || hasSaved}
                      className="gap-2 min-w-[160px]"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {hasSaved ? "Saved to History" : "Save to History"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in pb-12">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-title mb-1.5">Study tools</p>
          <h1 className="page-title">
            Essay <span className="text-muted-foreground font-normal text-lg ml-2">(Practice)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ask AI to create a custom writing exercise.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {essayStep !== 3 && (
            <>
              <Button variant="outline" size="sm" onClick={() => {
                setRole("teacher");
                setTeacherStep(1);
              }} className="gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                Switch to Grading
              </Button>
              <Button variant="ghost" size="sm" onClick={handleStartOver} className="text-muted-foreground hover:text-foreground">
                Start Over
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Configuration View */}
      {essayStep === 2 && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setRole(null)} className="rounded-full shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold text-foreground">Configure your practice exercise</h2>
          </div>

          {sourceType === "real" && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Source Material</h3>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center flex flex-col items-center justify-center hover:bg-muted/50 transition-colors">
                {realImage ? (
                  <img src={realImage} alt="Uploaded text" className="max-h-48 object-contain rounded-lg mb-4 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-4">
                    <Upload className="w-5 h-5" />
                  </div>
                )}
                <p className="text-sm font-medium text-foreground mb-1">
                  {realImage ? "Image uploaded successfully" : "Upload an image of your text"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">PNG, JPG up to 10MB</p>
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setRealImage, setOcrText)}
                />
                <Button variant="outline" size="sm" onClick={() => document.getElementById('imageUpload')?.click()}>
                  {realImage ? "Change Image" : "Select Image"}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Paste Text or Edit Extracted OCR Text</label>
                <textarea
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  className="w-full min-h-[150px] p-4 rounded-xl border border-border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Paste your text here, or upload an image above to extract text..."
                />
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Exercise Parameters</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {sourceType === "ai" && (
                <div className="col-span-full space-y-4 mb-2">
                  <label className="text-sm font-medium text-foreground uppercase tracking-wider opacity-70">Exam Mode</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setConfig({
                        ...config, 
                        questionType: "AQA Exam Simulator", 
                        yearGroup: config.yearGroup === "KS3" ? "GCSE" : config.yearGroup
                      })}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        config.questionType === "AQA Exam Simulator"
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/50 bg-background/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          config.questionType === "AQA Exam Simulator" ? "border-primary bg-primary" : "border-muted-foreground"
                        )}>
                          {config.questionType === "AQA Exam Simulator" && <div className="w-2.5 h-2.5 bg-background rounded-full" />}
                        </div>
                        <span className="font-bold text-base">AQA Based Sim</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-8">Strictly timed AQA-standard formatting.</p>
                    </button>

                    <button
                      onClick={() => setConfig({...config, questionType: "Custom"})}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        config.questionType === "Custom"
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/50 bg-background/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          config.questionType === "Custom" ? "border-primary bg-primary" : "border-muted-foreground"
                        )}>
                          {config.questionType === "Custom" && <div className="w-2.5 h-2.5 bg-background rounded-full" />}
                        </div>
                        <span className="font-bold text-base">Custom Build</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-8">Total control over difficulty and length.</p>
                    </button>
                  </div>
                </div>
              )}

              {sourceType === "ai" && config.subject === "English Literature" && config.questionType !== "AQA Exam Simulator" && (
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-foreground">Style / Era</label>
                  <select 
                    value={config.style}
                    onChange={handleStyleChange}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {["Shakespeare", "19th Century", "Poem", "Modern Texts"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Subject</label>
                <select 
                  value={config.subject}
                  onChange={(e) => setConfig({...config, subject: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {["English Language", "English Literature"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Year Group</label>
                <select 
                  value={config.yearGroup}
                  onChange={(e) => setConfig({...config, yearGroup: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {(config.questionType === "AQA Exam Simulator" ? ["GCSE", "A-Levels"] : ["KS3", "GCSE", "A-Levels"]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Difficulty Tier</label>
                <select 
                  value={config.difficulty}
                  onChange={(e) => setConfig({...config, difficulty: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {["Foundation", "Higher"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {config.questionType === "AQA Exam Simulator" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Test Size</label>
                  <select 
                    value={config.testSize}
                    onChange={(e) => setConfig({...config, testSize: e.target.value})}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Small">Small (30 mins)</option>
                    <option value="Medium">Medium (45 mins)</option>
                    <option value="Large">Large (1 hr)</option>
                  </select>
                </div>
              )}

              {config.questionType !== "AQA Exam Simulator" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Passage Length</label>
                  <select 
                    value={config.length}
                    onChange={handleLengthChange}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {["Short", "Medium", "Long"].map(s => (
                      <option key={s} value={s}>
                        {s} {(tier === "Free" || tier === "Core") && (s === "Medium" || s === "Long") ? "(Premium)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-2 col-span-full">
                <label className="text-sm font-medium text-foreground mb-2 block">Analysis Focus (Max 2)</label>
                <div className="flex flex-wrap gap-2">
                  {["Balanced", "|", "Theme", "Character", "Language", "Structural", "Context"].map(type => {
                    if (type === "|") return <div key="|" className="w-px h-8 bg-border mx-1 self-center" />;
                    const isSelected = config.analysisTypes?.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          if (type === "Balanced") {
                            setConfig({...config, analysisTypes: ["Balanced"]});
                            return;
                          }
                          
                          let newTypes = isSelected 
                            ? (config.analysisTypes || []).filter(t => t !== type)
                            : [...(config.analysisTypes || []).filter(t => t !== "Balanced"), type];
                            
                          if (newTypes.length > 2) {
                            newTypes = newTypes.slice(newTypes.length - 2); // Keep the two most recent
                          }
                          
                          if (newTypes.length === 0) newTypes.push("Balanced"); // Fallback to Balanced
                          setConfig({...config, analysisTypes: newTypes});
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
                          isSelected ? "bg-primary text-background border-primary shadow-sm" : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {config.questionType !== "AQA Exam Simulator" && (
                <div className="space-y-2 col-span-full">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">Question Composition</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Timed Mode</span>
                      <button 
                        onClick={() => setConfig({...config, isTimedCustom: !config.isTimedCustom})}
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative flex items-center",
                          config.isTimedCustom ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-background rounded-full absolute transition-transform",
                          config.isTimedCustom ? "translate-x-6" : "translate-x-1"
                        )} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-6 bg-muted/20 p-6 rounded-xl border border-border">
                    <div className="flex items-center justify-between gap-6">
                      <label className="text-sm text-muted-foreground w-1/3 min-w-[180px]">Short Answers (1-2pts)</label>
                      <div className="flex items-center gap-4 flex-1">
                        <input 
                          type="range" min="0" max="5" 
                          value={config.questionCounts.short}
                          onChange={(e) => setConfig({...config, questionCounts: {...config.questionCounts, short: parseInt(e.target.value)}})}
                          className="flex-1 accent-primary cursor-pointer"
                        />
                        <span className="text-base font-bold w-6 text-right">{config.questionCounts.short}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-6">
                      <label className="text-sm text-muted-foreground w-1/3 min-w-[180px]">Simple Paragraphs (3-4pts)</label>
                      <div className="flex items-center gap-4 flex-1">
                        <input 
                          type="range" min="0" max="5" 
                          value={config.questionCounts.simple}
                          onChange={(e) => setConfig({...config, questionCounts: {...config.questionCounts, simple: parseInt(e.target.value)}})}
                          className="flex-1 accent-primary cursor-pointer"
                        />
                        <span className="text-base font-bold w-6 text-right">{config.questionCounts.simple}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-6">
                      <label className="text-sm text-muted-foreground w-1/3 min-w-[180px]">Detailed Paragraphs (5-6pts)</label>
                      <div className="flex items-center gap-4 flex-1">
                        <input 
                          type="range" min="0" max="3" 
                          value={config.questionCounts.detailed}
                          onChange={(e) => setConfig({...config, questionCounts: {...config.questionCounts, detailed: parseInt(e.target.value)}})}
                          className="flex-1 accent-primary cursor-pointer"
                        />
                        <span className="text-base font-bold w-6 text-right">{config.questionCounts.detailed}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="flex flex-col items-end gap-3 pt-4 border-t border-border mt-4">
            <Button 
              size="lg" 
              onClick={handleGenerateExercise}
              disabled={isGenerating || !config.subject}
              className="px-8 shadow-sm"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <>Generate Exercise <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
            
            {sourceType === "ai" ? (
              <button 
                onClick={() => setSourceType("real")}
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
              >
                Upload Real Piece Instead <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button 
                onClick={() => setSourceType("ai")}
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
              >
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /> Use AI Generator Instead
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Writing Page */}
      {essayStep === 3 && (
        <div className="space-y-12 animate-in slide-in-from-bottom-4 fade-in">
          
          <div className="flex items-center gap-4">
            {(!generatedPassage || isGenerating) && (
              <Button variant="ghost" size="icon" onClick={() => setEssayStep(2)} className="rounded-full shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-xl font-semibold text-foreground">Practice Exercise</h2>
          </div>
          
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">Generating passage and question...</p>
            </div>
          ) : setupError ? (
            <ApiErrorFallback message="Failed to generate the practice setup." onRetry={handleGenerateExercise} />
          ) : (
            <>
              {/* Source Passage */}
              <div className="bg-[#FAF9F6] dark:bg-muted/20 border border-border rounded-xl p-8 md:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/40 rounded-l-xl"></div>
                <h3 className="text-lg font-serif font-medium text-foreground mb-4">
                  {sourceType === "ai" ? `${config.style} Passage` : "Source Material"}
                </h3>
                <div className="prose prose-sm md:prose-base prose-stone dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {generatedPassage}
                </div>
              </div>

              {/* Answer Boxes */}
              <div className="space-y-6 mt-8">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-lg font-semibold text-foreground">Your Response</h3>
                  <span className="text-xs font-medium px-2.5 py-1 bg-secondary rounded-full text-secondary-foreground">
                    {studentAnswers.length} Question{studentAnswers.length > 1 ? 's' : ''} • {config.questionType === "AQA Exam Simulator" ? "AQA" : "Custom"} Structure
                  </span>
                </div>

                {studentAnswers.map((answer, idx) => {
                  const questionsList = generatedQuestion ? generatedQuestion.split('\n').filter(q => q.trim().length > 0) : [];
                  const specificQuestion = questionsList[idx] || `Question ${idx + 1}`;
                  const match = specificQuestion.match(/\b([1-9][0-9]?)\s*marks?\b/i);
                  const marks = match ? parseInt(match[1]) : (specificQuestion.toLowerCase().includes("short answer") ? 2 : 8);
                  
                  let minHeight = "min-h-[250px]";
                  if (marks <= 2) minHeight = "min-h-[100px]";
                  else if (marks === 3) minHeight = "min-h-[150px]";
                  
                  return (
                    <div key={idx} className="space-y-4 relative group bg-card border border-border rounded-xl p-6 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-primary">
                            Task {idx + 1}
                          </label>
                          <p className="text-foreground font-medium text-sm leading-relaxed">
                            {specificQuestion}
                          </p>
                        </div>
                      </div>
                      
                      <textarea
                        value={answer || ""}
                        onChange={(e) => {
                          const copy = [...studentAnswers];
                          copy[idx] = e.target.value;
                          setStudentAnswers(copy);
                        }}
                        className={cn(
                          "w-full p-5 rounded-xl border border-border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm leading-relaxed",
                          minHeight
                        )}
                        placeholder="Write your answer here..."
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-6 pb-20 border-t border-border">
                <Button size="lg" className="px-8 shadow-sm" onClick={handleSubmitStudentEssay}>
                  Submit Essay for AQA Marking
                </Button>
              </div>

              {essayTimerState === "expired" && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-card border border-border/50 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold font-serif text-foreground">Time's Up!</h2>
                    <p className="text-muted-foreground">Your recommended AQA time limit for this question has expired. What would you like to do?</p>
                    <div className="flex gap-4 pt-4">
                      <Button variant="outline" className="flex-1 py-6" onClick={() => {
                        setEssayTimeLeft(300); // Add 5 minutes
                        setEssayTimerState("running");
                      }}>
                        Add 5 Mins
                      </Button>
                      <Button className="flex-1 py-6 bg-red-500 hover:bg-red-600 text-white" onClick={handleSubmitStudentEssay}>
                        Finish & Mark
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {essayTimerState === "forfeited" && (
                <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-card border border-destructive/30 shadow-2xl shadow-destructive/20 rounded-3xl p-10 max-w-lg w-full text-center space-y-8 animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4 relative">
                      <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping opacity-20" />
                      <AlertTriangle className="w-12 h-12" />
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-4xl font-black tracking-tight text-foreground uppercase">Test Forfeited</h2>
                      <p className="text-lg text-muted-foreground font-medium max-w-[80%] mx-auto leading-relaxed">
                        You left the exam window during an active test. Under strict AQA conditions, this immediately voids your paper.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <Button className="w-full py-7 text-lg font-bold shadow-xl rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleStartOver}>
                        Acknowledge & Return to Menu
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* STEP 4: Student Marking Result */}
      {essayStep === 4 && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in pb-12">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setEssayStep(3)} className="rounded-full shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold text-foreground">AQA Marking Engine</h2>
          </div>

          {gradingStatus === "error" ? (
            <ApiErrorFallback message="An error occurred while marking the essay." onRetry={() => handleMarkEssayStudent(gradingAnswers)} />
          ) : gradingStatus !== "complete" ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="font-semibold text-sm text-muted-foreground">
                {gradingStatus === "marker" && "The Strict AQA Examiner (DeepSeek) is analyzing..."}
                {gradingStatus === "judge" && "The Judge (Gemini) is evaluating the score..."}
                {gradingStatus === "idle" && "Initializing marking engine..."}
              </span>
            </div>
          ) : gradingResult ? (
            <div className="w-full bg-card border border-border rounded-xl p-8 shadow-lg">
              <div className="flex items-start justify-between border-b border-border pb-6 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Final Result</h3>
                  <p className="text-sm text-muted-foreground mt-1">Evaluated strictly against AQA Mark Schemes</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</span>
                    <span className="text-3xl font-bold text-foreground">{gradingResult.final_score}/100</span>
                  </div>
                  <div className="h-10 w-px bg-border mx-2"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</span>
                    <span className="text-4xl font-black text-primary">{gradingResult.grade_letter}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/30 border border-secondary mb-8">
                <h4 className="text-sm font-bold text-foreground mb-2">Examiner Summary</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{gradingResult.student_summary}</p>
              </div>

              <div className="mb-8">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Assessment Objectives Breakdown</h4>
                <div className="grid grid-cols-2 gap-4">
                  {gradingResult.category_breakdown && Object.entries(gradingResult.category_breakdown).map(([cat, score]) => (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-sm">
                      <span className="text-sm font-medium text-foreground">{cat}</span>
                      <span className="text-sm font-bold text-primary">{score}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-red-500 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Key Issues
                  </h4>
                  <ul className="space-y-2">
                    {gradingResult.key_issues?.map((issue, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Actionable Improvements
                  </h4>
                  <ul className="space-y-2">
                    {gradingResult.improvement_points?.map((pt, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">•</span> {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <details className="group border border-border rounded-xl bg-background overflow-hidden">
                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <span>View The Raw Examiner's Log (DeepSeek)</span>
                  <span className="transition group-open:rotate-180">
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </summary>
                <div className="p-4 pt-0 border-t border-border mt-2">
                  <div className="prose prose-sm prose-stone max-w-none text-muted-foreground whitespace-pre-wrap">
                    {gradingResult.marker_log}
                  </div>
                </div>
              </details>
              
              <div className="mt-8 flex justify-end gap-3 border-t border-border pt-6">
                <Button variant="outline" onClick={handleStartOver}>New Practice</Button>
                <Button 
                  onClick={saveToHistory}
                  disabled={isSaving || hasSaved}
                  className="gap-2 min-w-[160px]"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {hasSaved ? "Saved to History" : "Save to History"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {essayStep === 3 && essayTimerState !== "idle" && (
        <div className="fixed top-24 right-8 z-50 flex items-center gap-3 bg-background/40 backdrop-blur-xl px-6 py-3 rounded-full border border-border/50 font-bold tabular-nums tracking-widest text-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <Clock className={cn("w-6 h-6", essayTimeLeft < 60 ? "text-red-500 animate-pulse" : "text-primary")} />
          <span className={cn(essayTimeLeft < 60 ? "text-red-500" : "text-foreground")}>
            {Math.floor(essayTimeLeft / 60).toString().padStart(2, "0")}:{(essayTimeLeft % 60).toString().padStart(2, "0")}
          </span>
        </div>
      )}

    </div>
  );
}
