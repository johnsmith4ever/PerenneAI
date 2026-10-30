"use client";
import { usePersistentState } from "@/hooks/use-persistent-state";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useUser } from "@clerk/nextjs";
import { insertFeatureAction, deleteFeatureAction, fetchFeatureAction, upsertChatAction } from "@/actions/supabase";
import { useSubscription, ModelType, TIER_RANK, FREE_ACCESS_MODE, getTierModels } from "@/hooks/use-subscription";
import { 
  Upload, FileText, ArrowRight, Image as ImageIcon, 
  Cpu, Sparkles, ArrowLeft, PenTool, BookOpenCheck, Loader2, CheckCircle2,
  XCircle, TrendingUp, ChevronDown, Save, Lock, Clock, AlertTriangle, X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ApiErrorFallback } from "@/components/ui/api-error-fallback";


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

const ENGLISH_MARKER_SYSTEM_PROMPT = `You are an experienced AQA English examiner. Mark the student's answers fairly and accurately, as a real examiner would, using only the AOs each question targets.

MARKING RULES
1. Mark each question out of its own mark total, using the level descriptors below. Do NOT invent a /100 score. Return marks per question and I will calculate the total in code.
2. Only assess the AOs the question actually tests. For an unseen passage (Language-style), assess AO1 (understanding, quotations) and AO2 (language/structure methods, effects, terminology). Do NOT assess AO3 (context) or AO4 unless the question explicitly asks "to what extent do you agree" or states a context. Never penalise missing context on an unseen passage. Return ao1_marks and ao2_marks for each question (summing to marks_awarded).
3. Reward what is there. Credit any valid, well-supported interpretation, even if it differs from the examples. Do not penalise a point for lacking extra techniques the mark scheme doesn't require.
4. Level descriptors: Use a consistent level label format: "Level 4", "Level 3", "Level 2", "Level 1" for all questions, never "Secure" or "Full". For 8-mark questions: Level 4 (7-8) perceptive, detailed, well-chosen quotations, precise terminology; Level 3 (5-6) clear, consistent analysis; Level 2 (3-4) some analysis, some terminology; Level 1 (1-2) simple comment. Mark at the level the response demonstrates overall (best fit), not the lowest flaw. For 1-mark questions: a correct method/effect or impression with evidence = Level 1 (1 mark). For 3-mark questions: 1 mark per valid developed point with evidence and effect, up to Level 3 (3 marks).
5. FACT-CHECK BEFORE CRITICISING. Before listing any weakness, check it against the passage and the student's actual words. Delete any criticism that is wrong, trivial or about something the student already did. Be careful with terminology (simile = uses "like/as" to compare; personification; synecdoche vs euphemism; tricolon/triplet; sibilance requires repeated s sounds close together). Never say a question was unanswered unless it truly is. Never attribute lost marks to missing PETAL labels. Structure labelling can be mentioned as a tip but is not a mark-losing issue. Before writing any criticism, check it against the text. Examples to avoid: describing Elias as silent (it is the sea that is 'silent'), and treating 'thin as needles' as anything other than a simile.
5b. OMISSION CHECK. Before stating that the student does or doesn't mention something (e.g. the narrator, a character, a technique), re-read their actual answer text word by word. Only claim an omission if you have confirmed that specific element is genuinely absent from their response. Do not infer omission from a weak or underdeveloped mention — if they referenced it at all, they mentioned it.
6. SPECIFIC FEEDBACK RULES:
- what_you_did_well: Must be 1-2 sentences of examiner commentary in your own words, naming the specific strength and why it earns credit. Quote at most 8 words from the student's answer. NEVER paste back the student's answer.
- improvements: For any answer below full marks, give up to 3 specific, fact-checked points ordered by mark value. For full-mark answers, give ONE optional "to push even higher" suggestion, clearly labelled as optional and not affecting the mark. Don't invent flaws. Each point must quote the student's words and say what to add. EXCEPTION: For 1-mark questions that earned full marks (1/1), skip the optional suggestion entirely (leave improvements as an empty array []).
- model_sentence: Always provide a concise model sentence illustrating the improvement whenever there is an improvement. For 1-mark questions that earned full marks (1/1), skip the model_sentence entirely (leave as empty string "").
7. examiner_summary: Must name one specific strength and one specific next step, referring to the student's actual content, with no generic phrases.

OUTPUT FORMAT (Return valid JSON ONLY, no fences, no markdown):
{
  "questions": [
    {
      "number": 1,
      "marks_awarded": 0,
      "marks_available": 1,
      "ao1_marks": 0,
      "ao2_marks": 0,
      "level": "Level 1",
      "what_you_did_well": ["1-2 sentences of commentary in marker's own words naming specific strength and credit, quoting <=8 words"],
      "improvements": ["Up to 3 specific points quoting student words and what to add; or 1 optional push-higher suggestion (empty [] if 1-mark question with 1/1)"],
      "model_sentence": "A clear model sentence illustrating the improvement (empty \"\" if 1-mark question with 1/1)"
    }
  ],
  "examiner_summary": "1 specific strength and 1 specific next step referring to actual student content"
}

SELF-CHECK before replying: (a) re-read the passage and confirm every criticism is true against the text (e.g. Elias is not silent; 'thin as needles' is a simile), (b) confirm marks match the level descriptors and level is strictly formatted as 'Level 4', 'Level 3', etc. (never 'Secure' or 'Full'), (c) confirm no AO3/AO4 penalties on an unseen passage, (d) ensure what_you_did_well quotes <= 8 words and never dumps the answer, (e) never attribute lost marks to missing PETAL labels, (f) for 1-mark questions with 1/1, ensure optional suggestion and model_sentence are skipped.`;

interface QuestionFeedback {
  number: number;
  marks_awarded: number;
  marks_available: number;
  ao1_marks?: number;
  ao2_marks?: number;
  level?: string;
  what_you_did_well?: string[];
  improvements?: string[];
  model_sentence?: string;
}

export interface QuestionIssueGroup {
  questionNumber: number;
  lostMarks: number;
  heading: string; // e.g. "Q4 (-1 mark)"
  issues: string[];
}

interface GradingResult {
  final_score: number;
  total_marks_awarded?: number;
  total_marks_available?: number;
  grade_letter: string;
  category_breakdown: Record<string, any>;
  key_issues: string[];
  issue_groups?: QuestionIssueGroup[];
  improvement_points: string[];
  optional_suggestions?: string[];
  student_summary: string;
  marker_log: string;
  questions?: QuestionFeedback[];
}

function formatLevelLabel(rawLevel?: string, awarded?: number, available?: number): string {
  if (rawLevel && typeof rawLevel === "string") {
    const trimmed = rawLevel.trim();
    const match = trimmed.match(/(?:level\s*|l)?\s*([1-4])/i);
    if (match) {
      return `Level ${match[1]}`;
    }
  }
  if (typeof awarded === "number" && typeof available === "number" && available > 0) {
    if (available === 1) return "Level 1";
    const pct = awarded / available;
    if (pct >= 0.75) return "Level 4";
    if (pct >= 0.5) return "Level 3";
    if (pct >= 0.25) return "Level 2";
    return "Level 1";
  }
  return "Level 1";
}

function computeAQAGrade(percentage: number): string {
  if (percentage >= 82) return "Grade 9";
  if (percentage >= 73) return "Grade 8";
  if (percentage >= 64) return "Grade 7";
  if (percentage >= 54) return "Grade 6";
  if (percentage >= 44) return "Grade 5";
  if (percentage >= 34) return "Grade 4";
  if (percentage >= 24) return "Grade 3";
  return "Grade 2";
}

/**
 * Splits raw generated question text into:
 *   - instructionLine: a leading instruction (e.g. "Read the passage carefully…") if present, else ""
 *   - realQuestions: the actual questions, with leading "Q1." / "1." / "Q1 " prefixes stripped
 *
 * A line is treated as an instruction (not a real question) when it:
 *   - does NOT contain a [N mark(s)] bracket, AND
 *   - starts with a read/instruction keyword, OR
 *   - contains no question mark and no mark bracket
 */
function splitQuestions(raw: string): { instructionLine: string; realQuestions: string[] } {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let instructionLine = "";
  const realQuestions: string[] = [];

  const INSTRUCTION_RE = /^(?:read|please\s+read|answer\s+all|use\s+the|the\s+following|note\s*:|instructions?:)/i;
  const MARK_BRACKET_RE = /\[\s*\d+\s*marks?\s*\]/i;

  for (const line of lines) {
    const hasMarkBracket = MARK_BRACKET_RE.test(line);
    const isInstruction = !hasMarkBracket && (INSTRUCTION_RE.test(line) || (!line.includes('?') && !hasMarkBracket));

    if (isInstruction && instructionLine === "" && realQuestions.length === 0) {
      // Only absorb it as the instruction if we haven't seen any real question yet
      instructionLine = line;
    } else {
      // Strip leading Q-number prefix: "Q1. ", "Q1 ", "1. ", "1) "
      const cleaned = line.replace(/^(?:Q\s*)?\d+[.)\s]+\s*/i, "").trim();
      realQuestions.push(cleaned || line);
    }
  }

  return { instructionLine, realQuestions };
}

function validateMarkingJSON(rawText: string): { valid: boolean; data?: any; error?: string } {
  let cleaned = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
  let jsonStr = cleaned;
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) jsonStr = match[0];

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    try {
      const sanitized = jsonStr
        .replace(/,\s*([\}\]])/g, '$1')
        .replace(/[\u0000-\u001F]+/g, ' ');
      parsed = JSON.parse(sanitized);
    } catch {
      return { valid: false, error: "Output could not be parsed as JSON." };
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return { valid: false, error: "Parsed JSON is not an object." };
  }

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return { valid: false, error: "Missing or empty 'questions' array in JSON." };
  }

  for (let idx = 0; idx < parsed.questions.length; idx++) {
    const q = parsed.questions[idx];
    const awarded = Number(q.marks_awarded);
    const available = Number(q.marks_available);

    if (isNaN(awarded) || isNaN(available)) {
      return { valid: false, error: `Question ${q.number || idx + 1} has non-numeric marks.` };
    }
    if (awarded > available) {
      return { valid: false, error: `Question ${q.number || idx + 1} marks_awarded (${awarded}) exceeds marks_available (${available}).` };
    }
    if (awarded < 0) {
      return { valid: false, error: `Question ${q.number || idx + 1} has negative marks_awarded.` };
    }
  }

  return { valid: true, data: parsed };
}

function extractJudgeVerdict(
  rawText: string,
  markerLog: string,
  isUnseenPaper = true,
  hasEvaluationQuestion = false,
  modelName = "claude-haiku-5-5"
): GradingResult {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
  let data: any = null;

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch {
      try {
        const sanitized = jsonMatch[0]
          .replace(/,\s*([\}\]])/g, '$1')
          .replace(/[\u0000-\u001F]+/g, ' ');
        data = JSON.parse(sanitized);
      } catch {}
    }
  }

  if (!data) {
    try {
      data = JSON.parse(cleaned);
    } catch {}
  }

  data = data || {};

  // Per-question marks parsing
  let questions: QuestionFeedback[] = [];
  let totalAwarded = 0;
  let totalAvailable = 0;
  let totalAO1 = 0;
  let totalAO2 = 0;
  let hasAOData = false;

  if (Array.isArray(data.questions) && data.questions.length > 0) {
    questions = data.questions.map((q: any, i: number) => {
      const available = Math.max(1, Number(q.marks_available) || 1);
      const awarded = Math.max(0, Math.min(available, Number(q.marks_awarded) || 0));
      totalAwarded += awarded;
      totalAvailable += available;

      let ao1: number | undefined = undefined;
      let ao2: number | undefined = undefined;
      if (typeof q.ao1_marks === "number" || (typeof q.ao1_marks === "string" && q.ao1_marks.trim() !== "")) {
        ao1 = Math.max(0, Number(q.ao1_marks) || 0);
        totalAO1 += ao1;
        hasAOData = true;
      }
      if (typeof q.ao2_marks === "number" || (typeof q.ao2_marks === "string" && q.ao2_marks.trim() !== "")) {
        ao2 = Math.max(0, Number(q.ao2_marks) || 0);
        totalAO2 += ao2;
        hasAOData = true;
      }

      // Consistent level format: "Level 4", "Level 3", etc., never "Secure" or "Full"
      const level = formatLevelLabel(q.level, awarded, available);

      let what_you_did_well = Array.isArray(q.what_you_did_well)
        ? q.what_you_did_well
        : (q.what_you_did_well ? [q.what_you_did_well] : []);
      let improvements = Array.isArray(q.improvements)
        ? q.improvements
        : (q.improvements ? [q.improvements] : []);
      let model_sentence = q.model_sentence || "";

      // Item 2: For 1-mark questions that earned full marks, skip optional suggestion and model_sentence entirely
      if (available === 1 && awarded === 1) {
        improvements = [];
        model_sentence = "";
      }

      return {
        number: q.number || (i + 1),
        marks_awarded: awarded,
        marks_available: available,
        ao1_marks: ao1,
        ao2_marks: ao2,
        level,
        what_you_did_well,
        improvements,
        model_sentence,
      };
    });
  }

  // Calculate score in code from sum(marks_awarded) / sum(marks_available)
  let score: number;
  if (totalAvailable > 0) {
    score = Math.round((totalAwarded / totalAvailable) * 100);
  } else {
    if (typeof data.final_score === "number") score = data.final_score;
    else if (typeof data.score === "number") score = data.score;
    else if (typeof data.marks === "number") score = data.marks;
    else if (typeof data.percentage === "number") score = data.percentage;
    else score = 70;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Calculate AQA Grade letter in code
  const grade = data.grade_letter || data.grade || computeAQAGrade(score);

  // Extract examiner summary (specific strength & next step)
  let summary = data.examiner_summary || data.student_summary || data.summary || data.feedback || "";

  // AO Breakdown: Calculate in code from ao1_marks and ao2_marks.
  // If the data isn't available, remove the percentages entirely rather than showing made-up ones.
  let breakdown: Record<string, any> = {};
  if (hasAOData && (totalAO1 + totalAO2 > 0)) {
    const totalAO = totalAO1 + totalAO2;
    const ao1Pct = Math.round((totalAO1 / totalAO) * 100);
    const ao2Pct = Math.round((totalAO2 / totalAO) * 100);
    breakdown["AO1 (Understanding & Evidence)"] = `${totalAO1} marks (${ao1Pct}%)`;
    breakdown["AO2 (Language & Structure)"] = `${totalAO2} marks (${ao2Pct}%)`;
  }

  // Build "Key issues" and "Actionable improvements" by aggregating the per-question improvements
  // Group mark deficits once per question (e.g. "Q4 (-1 mark)"), without "-1 mark" on every bullet.
  // Keep "Optional, to push higher" suggestions in a separate list.
  const sortedByDeficit = [...questions].sort(
    (a, b) => (b.marks_available - b.marks_awarded) - (a.marks_available - a.marks_awarded)
  );

  let key_issues: string[] = [];
  let improvement_points: string[] = [];
  let issue_groups: QuestionIssueGroup[] = [];
  let optional_suggestions: string[] = [];

  for (const q of sortedByDeficit) {
    const lostMarks = q.marks_available - q.marks_awarded;

    if (lostMarks > 0 && q.improvements && q.improvements.length > 0) {
      const heading = `Q${q.number} (-${lostMarks} mark${lostMarks > 1 ? 's' : ''})`;
      const cleanIssues: string[] = [];

      for (const imp of q.improvements) {
        if (typeof imp !== "string") continue;
        let clean = imp.trim();
        // Remove redundant leading Q prefix if model outputted one on the bullet
        clean = clean.replace(/^Q\d+\s*\(-?\d+\s*marks?\):?\s*/i, "").trim();
        if (clean && !cleanIssues.includes(clean)) {
          cleanIssues.push(clean);
          key_issues.push(`Q${q.number}: ${clean}`);
          if (!improvement_points.includes(clean)) {
            improvement_points.push(clean);
          }
        }
      }

      if (cleanIssues.length > 0) {
        issue_groups.push({
          questionNumber: q.number,
          lostMarks,
          heading,
          issues: cleanIssues,
        });
      }
    } else if (lostMarks === 0 && q.marks_available > 1 && q.improvements && q.improvements.length > 0) {
      // Full marks on multi-mark questions: keep optional suggestions in separate section
      for (const imp of q.improvements) {
        if (typeof imp !== "string") continue;
        let clean = imp.trim();
        // Strip any repetition of the section heading prefix the model sometimes adds
        clean = clean.replace(/^(?:to\s+push\s+(?:even\s+)?higher\s*(?:\(optional[^)]*\))?:?\s*|optional(?:,?\s*to\s*push\s*(?:even\s*)?higher)?[^:]*:?\s*)/i, "").trim();
        if (clean) {
          const formatted = `Q${q.number} (Optional): ${clean}`;
          if (!optional_suggestions.includes(formatted)) {
            optional_suggestions.push(formatted);
          }
        }
      }
    }
  }

  if (key_issues.length === 0) {
    key_issues = ["No significant issues."];
  }
  if (improvement_points.length === 0) {
    improvement_points = ["No significant issues."];
  }

  return {
    final_score: score,
    total_marks_awarded: totalAvailable > 0 ? totalAwarded : undefined,
    total_marks_available: totalAvailable > 0 ? totalAvailable : undefined,
    grade_letter: grade,
    category_breakdown: breakdown,
    key_issues,
    issue_groups: issue_groups.length > 0 ? issue_groups : undefined,
    improvement_points,
    optional_suggestions: optional_suggestions.length > 0 ? optional_suggestions : undefined,
    student_summary: summary,
    marker_log: markerLog,
    questions: questions.length > 0 ? questions : undefined,
  };
}

export default function EssayPage() {
  const { openUpgradeModal } = useUpgradeModal();
  const router = useRouter();
  const { user } = useUser();
  const { tier, deductCredits, canAfford, isLoaded, assistant, heavy, judge, grading } = useSubscription();
  const { curriculumLevel, curriculumSubject } = useCurriculum();
const [role, setRole, roleLoaded] = usePersistentState<Role>("essay_role", null);
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
  
  const [essayTimeLeft, setEssayTimeLeft] = usePersistentState<number>("essay_time_left", 0);
  const [essayTimerState, setEssayTimerState] = usePersistentState<"idle" | "running" | "expired" | "forfeited">("essay_timer_state", "idle");
  const [showCreditWarning, setShowCreditWarning] = useState<{ active: boolean, isUploadFlow: boolean }>({ active: false, isUploadFlow: false });
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (essayTimerState === "running") {
        e.preventDefault();
        e.returnValue = "You are currently taking a timed Essay session. Navigating away means you will instantly forfeit the exam. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [essayTimerState]);

  useEffect(() => {
    if (essayTimerState === "running" && essayTimeLeft > 0) {
      const timer = setInterval(() => setEssayTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (essayTimerState === "running" && essayTimeLeft === 0) {
      setEssayTimerState("expired");
    }
  }, [essayTimerState, essayTimeLeft, setEssayTimeLeft, setEssayTimerState]);

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
const [gradingAnswers, setGradingAnswers] = usePersistentState<GradingAnswer[]>("essay_grading_answers", [{ question: "", answer: "" }]);

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
    setGradingAnswers([{ question: "", answer: "" }]);
    setGradingStatus("idle");
    setGradingResult(null);
    setHasSaved(false);
  };

  const [lastModelUsed, setLastModelUsed] = usePersistentState<string>("essay_last_model", "claude-haiku-5-5");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const hasAutoSynthesizedRef = useRef(false);

  const executeGrading = async (
    markerUserMessage: string,
    unseenPaper: boolean,
    hasAO4Question: boolean
  ): Promise<{ verdict: GradingResult; modelUsed: string }> => {
    let rawText = "";
    let actualModel = "claude-haiku-5-5";

    const parseResponse = async (response: Response) => {
      try {
        return await response.json();
      } catch {
        throw new Error(`Server returned non-JSON response (${response.status})`);
      }
    };

    try {
      // 1. Primary Attempt with Claude Haiku (claude-haiku-5-5)
      let res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: markerUserMessage }],
          systemPrompt: ENGLISH_MARKER_SYSTEM_PROMPT,
          model: "claude-haiku-5-5",
          temperature: 0.2,
          curriculumLevel: curriculumLevel || "GCSE",
          curriculumSubject: config.subject || "English",
          chatMode: "Quick Answer",
          extraTopicDetails: "AQA English Examiner Grading & Standard Mark Schemes",
        }),
      });

      let data = await parseResponse(res);
      if (!res.ok || data.status === "error" || !data.text) {
        throw new Error(data?.message || `Status ${res.status}`);
      }

      if (data.usage) {
        deductCredits(data.usage.inputTokens, data.usage.outputTokens, "claude-haiku-5-5");
      }
      rawText = data.text;

      // Validate JSON & marks
      let validation = validateMarkingJSON(rawText);
      if (!validation.valid) {
        console.warn(`[English Marker] Claude Haiku JSON validation failed (${validation.error}). Retrying once with Claude Haiku...`);
        const retryRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "user", content: markerUserMessage },
              { role: "assistant", content: rawText },
              {
                role: "user",
                content: `CRITICAL ERROR: Your previous response was invalid: ${validation.error}. Please re-read the rules and provide valid JSON strictly following the schema. Ensure that for every question, marks_awarded is a number between 0 and marks_available (marks_awarded CANNOT exceed marks_available). Output ONLY the JSON object.`,
              },
            ],
            systemPrompt: ENGLISH_MARKER_SYSTEM_PROMPT,
            model: "claude-haiku-5-5",
            temperature: 0.2,
            curriculumLevel: curriculumLevel || "GCSE",
            curriculumSubject: config.subject || "English",
            chatMode: "Quick Answer",
            extraTopicDetails: "AQA English Examiner Grading & Standard Mark Schemes",
          }),
        });

        const retryData = await parseResponse(retryRes);
        if (retryData?.usage) {
          deductCredits(retryData.usage.inputTokens, retryData.usage.outputTokens, "claude-haiku-5-5");
        }
        if (retryData?.text) rawText = retryData.text;

        const retryValidation = validateMarkingJSON(rawText);
        if (!retryValidation.valid) {
          throw new Error(`Claude Haiku retry still invalid: ${retryValidation.error}`);
        }
      }
    } catch (haikuErr: any) {
      console.warn(`[English Marker] Claude Haiku failed (${haikuErr.message}). Falling back to GPT 6 Luna (gpt-4o)...`);
      actualModel = "GPT 6 Luna (gpt-4o fallback)";

      const fbRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: markerUserMessage }],
          systemPrompt: ENGLISH_MARKER_SYSTEM_PROMPT,
          model: "GPT 6 Luna",
          temperature: 0.2,
          curriculumLevel: curriculumLevel || "GCSE",
          curriculumSubject: config.subject || "English",
          chatMode: "Quick Answer",
          extraTopicDetails: "AQA English Examiner Grading & Standard Mark Schemes",
        }),
      });

      const fbData = await parseResponse(fbRes);
      if (!fbRes.ok || fbData.status === "error" || !fbData.text) {
        console.error("[English Marker] Fallback to GPT 6 Luna also failed:", fbData);
        throw new Error(fbData?.message || "Marking failed on both Claude Haiku and fallback model.");
      }
      if (fbData.usage) {
        deductCredits(fbData.usage.inputTokens, fbData.usage.outputTokens, "GPT 6 Luna");
      }
      rawText = fbData.text;
    }

    const verdict = extractJudgeVerdict(rawText, rawText, unseenPaper, hasAO4Question, actualModel);
    return { verdict, modelUsed: actualModel };
  };

  const synthesizeSummaryWithClaudeHaiku = async (logText: string) => {
    if (!logText || !logText.trim()) {
      toast.error("No examiner log found to summarise.");
      return;
    }
    setIsSynthesizing(true);
    setGradingStatus("judge");
    try {
      const isUnseen = config.subject === "English Language" || !config.style?.includes("Literature");
      const hasAO4 = gradingAnswers.some(a => a.question.toLowerCase().includes("agree") || a.question.toLowerCase().includes("evaluate"));

      if (gradingAnswers.length > 0 && gradingAnswers[0].answer) {
        const typedAnswers = gradingAnswers.map((a, i) => `Question ${i+1}:\nQ: ${a.question}\nA: ${a.answer}`).join("\n\n");
        const passageText = gradingConfig.passage || generatedSummary || generatedPassage || "None provided";
        const markerUserMessage = `Passage:\n${passageText}\n\nStudent Submission:\n${typedAnswers}`;

        const { verdict, modelUsed } = await executeGrading(markerUserMessage, isUnseen, hasAO4);
        setLastModelUsed(modelUsed);
        setGradingResult(verdict);
        setGradingStatus("complete");
        toast.success(`AQA Mark Summary generated with ${modelUsed}!`);
        await saveToHistory(verdict);
      } else {
        const verdict = extractJudgeVerdict(logText, logText, isUnseen, hasAO4, lastModelUsed);
        setGradingResult(verdict);
        setGradingStatus("complete");
        await saveToHistory(verdict);
      }
    } catch (err: any) {
      console.error("Grading error:", err);
      toast.error("Failed to generate summary: " + (err.message || "Unknown error"));
      setGradingStatus("complete");
    } finally {
      setIsSynthesizing(false);
    }
  };

  useEffect(() => {
    if (
      gradingResult?.marker_log &&
      (!gradingResult.final_score || !gradingResult.grade_letter) &&
      !isSynthesizing &&
      !hasAutoSynthesizedRef.current
    ) {
      hasAutoSynthesizedRef.current = true;
      synthesizeSummaryWithClaudeHaiku(gradingResult.marker_log);
    }
  }, [gradingResult?.marker_log, gradingResult?.final_score, gradingResult?.grade_letter, isSynthesizing]);

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

  const handleGenerateExercise = async (e?: React.FormEvent, isUploadFlow = false, skipWarning = false) => {
    if (e) e.preventDefault();
    
    if (!isLoaded) return;
    
    if (tierRank === 0 && !skipWarning) {
      setShowCreditWarning({ active: true, isUploadFlow });
      return;
    }

    if (!canAfford(3000, heavy)) {
      openUpgradeModal("You do not have enough daily credits to generate an essay setup. Please try again tomorrow or upgrade your plan.", "Upgrade Plan", "/subscriptions");
      return;
    }

    if (!isUploadFlow && !config.subject) {
      openUpgradeModal("You do not have enough daily credits to generate an essay setup. Please try again tomorrow or upgrade your plan.", "Upgrade Plan", "/subscriptions");
      return;
    }

    setIsGenerating(true);
    setEssayStep(3);
    setEssayTimerState("idle");
    setEssayTimeLeft(0);
    
    let allowedParagraphs = 1;
    if (tierRank >= TIER_RANK.Premium) allowedParagraphs = 8;
    else if (tierRank >= TIER_RANK.Pro) allowedParagraphs = 5;
    else if (tierRank >= TIER_RANK.Core) allowedParagraphs = 3;

    const isAQA = config.questionType === "AQA Exam Simulator";
    const isTimed = config.questionType === "AQA Exam Simulator";
    const customTotal = config.questionCounts.short + config.questionCounts.simple + config.questionCounts.detailed;
    
    let aqaTotal = 5;
    if (isAQA) {
      if (config.style === "Modern Texts") aqaTotal = 4; // Fixed: 1+1+3+8 = 4 questions
      else if (config.testSize === "Small") aqaTotal = 4;
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
            curriculumLevel,
            curriculumSubject: config.subject, // Override the global context so it doesn't force biology restrictions for english essays
            chatMode: "Standard", // Always use standard for English since we don't have English AQA specs in DB yet
            extraTopicDetails: isAQA ? `AQA Specification Passage for ${config.subject}` : undefined,
          }),
        });
        const passageData = await passageRes.json();
        if (passageData.status === "error" || !passageData.text) {
          throw new Error(passageData.message || "Failed to generate passage");
        }
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
            curriculumLevel,
            curriculumSubject: config.subject,
            extraTopicDetails: `AQA English summary of passage`,
          }),
        });
        const summaryData = await summaryRes.json();
        if (summaryData.status === "error" || !summaryData.text) {
          throw new Error(summaryData.message || "Failed to generate summary");
        }
        if (summaryData.usage) deductCredits(summaryData.usage.inputTokens, summaryData.usage.outputTokens, heavy);
        setGeneratedSummary(summaryData.text);
      }

      let aqaPrompt = "";
      if (config.style === "Modern Texts") {
        // Fixed Modern Texts structure: 1 + 1 + 3 + 8 = 13 marks
        aqaPrompt = "exactly 4 questions in this order: Q1 a short retrieval question [1 mark], Q2 a short retrieval question [1 mark], Q3 a short paragraph question [3 marks], Q4 a long paragraph question [8 marks] (Use the PETAL structure).";
      } else if (config.testSize === "Small") {
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
            ? `Based on this passage, create a highly realistic AQA exam for ${config.yearGroup} students at ${config.difficulty} tier. Generate exactly: ${aqaPrompt} Focus the questions on analyzing ${analysisFocusText}. EVERY question MUST end with its mark total in square brackets — use "[1 mark]" (singular) for 1-mark questions and "[N marks]" (plural, e.g. "[3 marks]", "[8 marks]") for all others. Do NOT use markdown bold (**) anywhere in the question text. For any paragraph or 8-mark questions, you MUST explicitly state '(Use the PETAL structure)' in the question text. Do not include any intro. You MUST write out the ACTUAL question text (e.g. "How does the writer use language to describe..."), NOT just "Question 1". Separate each question with a newline.\n\nPassage:\n${finalPassage}`
            : `Based on this passage, create a custom exam for ${config.yearGroup} students at a ${config.difficulty} level. Generate exactly ${config.questionCounts.short} short answer questions (1-2pts), ${config.questionCounts.simple} simple paragraph questions (3-4pts), and ${config.questionCounts.detailed} detailed paragraph (PETALS) questions (5-6pts). Focus the questions on analyzing ${analysisFocusText}. EVERY question MUST end with its mark total in square brackets — use "[1 mark]" (singular) for 1-mark questions and "[N marks]" (plural) for all others. Do NOT use markdown bold (**) anywhere in the question text. For any paragraph or 8-mark questions, you MUST explicitly state '(Use the PETAL structure)' in the question text. Do not include any intro. You MUST write out the ACTUAL question text (e.g. "How does the writer use language to describe..."), NOT just "Question 1". Separate each question with a newline.\n\nPassage:\n${finalPassage}` 
          }],
          systemPrompt: "You are an expert literature teacher creating exam questions. Never use markdown bold (**) in question text. Every question must end with its mark allocation in square brackets using the correct singular/plural form: [1 mark] or [N marks].",
          model: heavy,
          curriculumLevel,
          curriculumSubject: config.subject,
          extraTopicDetails: `AQA English question creation for passage`,
        }),
      });
      const qData = await qRes.json();
      if (qData.status === "error" || !qData.text) {
        throw new Error(qData.message || "Failed to generate questions");
      }
      if (qData.usage) deductCredits(qData.usage.inputTokens, qData.usage.outputTokens, heavy);
      // Strip any residual markdown bold from generated question text
      setGeneratedQuestion(qData.text.replace(/\*\*/g, ""));
      
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
    if (!canAfford(4000, "claude-haiku-5-5")) {
      openUpgradeModal("You do not have enough daily credits to grade this essay. Please try again tomorrow.", "Upgrade Plan", "/subscriptions");
      return;
    }
    try {
      const typedAnswers = answers.map((a, i) => `Question ${i+1}:\nQ: ${a.question}\nA: ${a.answer}`).join("\n\n");
      const finalSubmissionText = `[Typed Answers]:\n${typedAnswers}`;
      const passageText = generatedSummary || generatedPassage || "None provided";

      setGradingStatus("marker");
      const markerUserMessage = `Passage:\n${passageText}\n\nStudent Submission:\n${finalSubmissionText}`;

      const isUnseen = config.subject === "English Language" || !config.style?.includes("Literature");
      const hasAO4 = answers.some(a => a.question.toLowerCase().includes("agree") || a.question.toLowerCase().includes("evaluate"));

      const { verdict, modelUsed } = await executeGrading(markerUserMessage, isUnseen, hasAO4);
      setLastModelUsed(modelUsed);
      setGradingResult(verdict);
      setGradingStatus("complete");
      setHasSaved(false);
      await saveToHistory(verdict);
    } catch (e) {
      console.error("[English Marker Error]:", e);
      setGradingStatus("error");
    }
  };

  const handleSubmitStudentEssay = () => {
    setEssayTimerState("idle");
    setEssayTimeLeft(0);
    setEssayStep(4);
    const { realQuestions } = splitQuestions(generatedQuestion || "");
    const populatedAnswers = studentAnswers.map((ans, idx) => ({
      question: realQuestions[idx] || `Question ${idx + 1}`,
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

  const saveToHistory = async (overrideResult?: GradingResult) => {
    const resToSave = overrideResult || gradingResult;
    if (!user || !resToSave || hasSaved) return;
    setIsSaving(true);
    try {
      const saveRes = await insertFeatureAction("essay_sims", {
        prompt: gradingConfig.passage || "Image uploaded",
        essay: gradingAnswers.map((a, i) => `Paragraph ${i+1}:\nQ: ${a.question}\nA: ${a.answer}`).join("\n\n"),
        grade: {
          final_score: resToSave.final_score,
          total_marks_awarded: resToSave.total_marks_awarded,
          total_marks_available: resToSave.total_marks_available,
          grade_letter: resToSave.grade_letter,
          marker_log: resToSave.marker_log,
          key_issues: resToSave.key_issues,
          issue_groups: resToSave.issue_groups,
          improvement_points: resToSave.improvement_points,
          optional_suggestions: resToSave.optional_suggestions,
          questions: resToSave.questions,
        }
      });
      if (saveRes && !saveRes.ok) {
        toast.error("Couldn't save essay to history.");
        return;
      }
      setHasSaved(true);
      toast.success("Essay saved to your account history!");
    } catch (e) {
      console.error("[essay] saveToHistory failed:", e);
      toast.error("Couldn't save essay to history.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGradeEssay = async () => {
    if (!isLoaded) return;
    if (!canAfford(4000, "claude-haiku-5-5")) {
      openUpgradeModal("You do not have enough daily credits to grade this essay. Please try again tomorrow or upgrade your plan.", "Upgrade Plan", "/subscriptions");
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
      const passageText = gradingConfig.passage || "None provided";
      const markerUserMessage = `Passage:\n${passageText}\n\nStudent Submission:\n${finalSubmissionText}`;

      const isUnseen = config.subject === "English Language" || !config.style?.includes("Literature");
      const hasAO4 = gradingAnswers.some(a => a.question.toLowerCase().includes("agree") || a.question.toLowerCase().includes("evaluate"));

      const { verdict, modelUsed } = await executeGrading(markerUserMessage, isUnseen, hasAO4);
      setLastModelUsed(modelUsed);
      setGradingResult(verdict);
      setGradingStatus("complete");
      setHasSaved(false);
      await saveToHistory(verdict);
    } catch (e) {
      console.error("[English Marker Error]:", e);
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

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
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

            <Button variant="ghost" size="sm" onClick={handleStartOver} className="text-muted-foreground hover:text-foreground">
              Start Over
            </Button>
          </div>
        </div>

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

            <div className="space-y-8 mt-12">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-lg font-semibold text-foreground">Student Submission</h3>
                <span className="text-xs font-medium px-2.5 py-1 bg-secondary rounded-full text-secondary-foreground">
                  {gradingAnswers.length} Paragraph{gradingAnswers.length > 1 ? 's' : ''}
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
                    {gradingAnswers.length > 1 && (
                      <button 
                        onClick={() => {
                          const copy = [...gradingAnswers];
                          copy.splice(idx, 1);
                          setGradingAnswers(copy);
                        }}
                        className="ml-auto text-muted-foreground hover:text-red-500 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                      >
                        ✕ Remove
                      </button>
                    )}
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
                      placeholder={`Student's response...`}
                    />
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full py-6 border-dashed border-2 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors gap-2" 
                onClick={() => setGradingAnswers([...gradingAnswers, { question: "", answer: "" }])}
              >
                + Add Question
              </Button>
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
                    {gradingStatus === "marker" && "The Marker is analyzing..."}
                    {gradingStatus === "judge" && "The Judge is evaluating..."}
                  </span>
                </div>
              ) : gradingResult ? (
                <div className="w-full bg-card border border-border rounded-xl p-8 shadow-lg mt-8 animate-in slide-in-from-bottom-4 fade-in">
                  <div className="flex items-start justify-between border-b border-border pb-6 mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-foreground">Grading Verdict</h3>
                        {gradingResult.marker_log && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSynthesizing}
                            onClick={() => synthesizeSummaryWithClaudeHaiku(gradingResult.marker_log)}
                            className="gap-1.5 text-xs h-7 px-2.5 border-primary/30 hover:border-primary text-foreground"
                          >
                            {isSynthesizing ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                            {gradingResult.final_score !== undefined && gradingResult.final_score !== null ? "Re-grade with Claude Haiku" : "Grade with Claude Haiku"}
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Evaluated with <span className="font-semibold text-foreground">{lastModelUsed}</span> strictly against AQA Mark Schemes
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</span>
                        <span className="text-3xl font-bold text-foreground">
                          {gradingResult.total_marks_awarded !== undefined && gradingResult.total_marks_available !== undefined
                            ? `${gradingResult.total_marks_awarded}/${gradingResult.total_marks_available} (${gradingResult.final_score}%)`
                            : gradingResult.final_score !== undefined && gradingResult.final_score !== null
                            ? `${gradingResult.final_score}%`
                            : "Pending"}
                        </span>
                      </div>
                      <div className="h-10 w-px bg-border mx-2"></div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</span>
                        <span className="text-4xl font-black text-primary">{gradingResult.grade_letter || "Pending"}</span>
                      </div>
                    </div>
                  </div>

                  {isSynthesizing && (
                    <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Claude Haiku is synthesising the AQA Mark Summary...</p>
                          <p className="text-xs text-muted-foreground">Evaluating answers against official AQA grade descriptors & mark scheme.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(!gradingResult.final_score || !gradingResult.grade_letter) && !isSynthesizing && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Examiner Log Complete — Mark Summary Pending</p>
                        <p className="text-xs text-muted-foreground">Synthesise the raw examiner evaluation into an official AQA grade, percentage score, and AO breakdown.</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => synthesizeSummaryWithClaudeHaiku(gradingResult.marker_log)}
                        className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Grade with Claude Haiku
                      </Button>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-secondary/30 border border-secondary mb-8">
                    <h4 className="text-sm font-bold text-foreground mb-2">Examiner Summary</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {gradingResult.student_summary || (isSynthesizing ? "Generating summary with Claude Haiku..." : "No summary available yet. Click 'Grade with Claude Haiku' above.")}
                    </p>
                  </div>

                  {gradingResult.questions && gradingResult.questions.length > 0 && (
                    <div className="mb-8 space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Question-by-Question Marks</h4>
                      <div className="space-y-3">
                        {gradingResult.questions.map((q) => (
                          <div key={q.number} className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-foreground">
                                Question {q.number} {q.marks_available >= 4 && q.level ? `• ${q.level}` : ""}
                              </span>
                              <span className={cn(
                                "text-xs font-bold px-3 py-1 rounded-full border",
                                q.marks_awarded === q.marks_available 
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                  : "bg-primary/10 text-primary border-primary/20"
                              )}>
                                {q.marks_awarded} / {q.marks_available} marks
                              </span>
                            </div>

                            {q.what_you_did_well && q.what_you_did_well.length > 0 && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                <span className="text-emerald-500 font-semibold block">What went well:</span>
                                <ul className="list-disc list-inside space-y-0.5 ml-1">
                                  {q.what_you_did_well.map((item, idx) => (
                                    <li key={idx} className="leading-relaxed">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {q.improvements && q.improvements.length > 0 && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                <span className="text-amber-500 font-semibold block">Improvements:</span>
                                <ul className="list-disc list-inside space-y-0.5 ml-1">
                                  {q.improvements.map((item, idx) => (
                                    <li key={idx} className="leading-relaxed">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {q.model_sentence && (
                              <div className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg border border-border/40">
                                <span className="not-italic font-semibold text-foreground mr-1.5">Model sentence:</span>
                                &ldquo;{q.model_sentence}&rdquo;
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Assessment Objectives Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {gradingResult.category_breakdown && Object.entries(gradingResult.category_breakdown).length > 0 ? (
                        Object.entries(gradingResult.category_breakdown).map(([cat, score]) => (
                          <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-sm">
                            <span className="text-sm font-medium text-foreground">{cat}</span>
                            <span className="text-sm font-bold text-primary">{score}</span>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-xs text-muted-foreground italic p-3 border border-dashed border-border rounded-lg text-center">
                          {isSynthesizing ? "Calculating AO breakdown with Claude Haiku..." : "AO percentage breakdown not available for this paper. Only assessed criteria are shown."}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Key Issues
                      </h4>
                      {gradingResult.issue_groups && gradingResult.issue_groups.length > 0 ? (
                        <ul className="space-y-2">
                          {gradingResult.issue_groups.map((group) => (
                            <li key={group.questionNumber} className="text-sm text-foreground flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                              <span>
                                <span className="font-bold text-destructive">{group.heading}:</span>{" "}
                                {group.issues[0]}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="space-y-2">
                          {gradingResult.key_issues && gradingResult.key_issues.length > 0 ? (
                            gradingResult.key_issues.map((issue, i) => (
                              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                                {issue}
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-muted-foreground italic">
                              {isSynthesizing ? "Extracting key issues with Claude Haiku..." : "No significant issues."}
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-green-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Actionable Improvements
                      </h4>
                      {gradingResult.issue_groups && gradingResult.issue_groups.length > 0 ? (
                        <div className="space-y-4">
                          {gradingResult.issue_groups.map((group) => {
                            const q = gradingResult.questions?.find(item => item.number === group.questionNumber);
                            return (
                              <div key={group.questionNumber} className="p-3.5 rounded-xl border border-green-600/20 bg-green-600/5 space-y-2">
                                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-green-600/15 text-green-600">
                                  Q{group.questionNumber} Action Steps
                                </span>
                                <ul className="space-y-1.5 pl-1">
                                  {group.issues.map((issue, idx) => (
                                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 shrink-0" />
                                      <span>{issue}</span>
                                    </li>
                                  ))}
                                </ul>
                                {q?.model_sentence && (
                                  <div className="text-xs text-muted-foreground italic bg-background/60 p-2.5 rounded-lg border border-green-600/15 mt-2">
                                    <span className="not-italic font-semibold text-foreground mr-1">Model sentence:</span>
                                    &ldquo;{q.model_sentence}&rdquo;
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {gradingResult.improvement_points && gradingResult.improvement_points.length > 0 ? (
                            gradingResult.improvement_points.map((point, i) => (
                              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 shrink-0" />
                                {point}
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-muted-foreground italic">
                              {isSynthesizing ? "Extracting actionable improvements with Claude Haiku..." : "No significant issues."}
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>

                  {gradingResult.optional_suggestions && gradingResult.optional_suggestions.length > 0 && (
                    <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 mb-8 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          Optional — To Push Even Higher
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These extension suggestions are for full-mark responses. They did not cost any marks and are optional ways to develop your analysis further.
                      </p>
                      <ul className="space-y-2 pl-1">
                        {gradingResult.optional_suggestions.map((sug, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <details className="group border border-border rounded-lg bg-muted/20">
                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <span>Show raw log</span>
                      <span className="transition group-open:rotate-180">
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </summary>
                    <div className="p-4 pt-0 border-t border-border mt-2">
                      <pre className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap font-mono text-xs overflow-x-auto p-2">
                        {gradingResult.marker_log?.replace(/```json/gi, '').replace(/```/gi, '').trim()}
                      </pre>
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
                      onClick={() => saveToHistory()}
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

                {/* Instruction banner — shown once above the tasks, never numbered */}
                {(() => {
                  const { instructionLine } = splitQuestions(generatedQuestion || "");
                  return instructionLine ? (
                    <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 py-0.5">
                      {instructionLine}
                    </p>
                  ) : null;
                })()}

                {studentAnswers.map((answer, idx) => {
                  const { realQuestions } = splitQuestions(generatedQuestion || "");
                  const specificQuestion = realQuestions[idx] || `Question ${idx + 1}`;
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
                {gradingStatus === "marker" && "The Strict AQA Examiner is analyzing..."}
                {gradingStatus === "judge" && "The Judge is evaluating the score..."}
                {gradingStatus === "idle" && "Initializing marking engine..."}
              </span>
            </div>
          ) : gradingResult ? (
            <div className="w-full bg-card border border-border rounded-xl p-8 shadow-lg">
              <div className="flex items-start justify-between border-b border-border pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-foreground">Final Result</h3>
                    {gradingResult.marker_log && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSynthesizing}
                        onClick={() => synthesizeSummaryWithClaudeHaiku(gradingResult.marker_log)}
                        className="gap-1.5 text-xs h-7 px-2.5 border-primary/30 hover:border-primary text-foreground"
                      >
                        {isSynthesizing ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                        {gradingResult.final_score !== undefined && gradingResult.final_score !== null ? "Re-grade with Claude Haiku" : "Grade with Claude Haiku"}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Evaluated with <span className="font-semibold text-foreground">{lastModelUsed}</span> strictly against AQA Mark Schemes
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</span>
                    <span className="text-3xl font-bold text-foreground">
                      {gradingResult.total_marks_awarded !== undefined && gradingResult.total_marks_available !== undefined
                        ? `${gradingResult.total_marks_awarded}/${gradingResult.total_marks_available} (${gradingResult.final_score}%)`
                        : gradingResult.final_score !== undefined && gradingResult.final_score !== null
                        ? `${gradingResult.final_score}%`
                        : "Pending"}
                    </span>
                  </div>
                  <div className="h-10 w-px bg-border mx-2"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</span>
                    <span className="text-4xl font-black text-primary">{gradingResult.grade_letter || "Pending"}</span>
                  </div>
                </div>
              </div>

              {isSynthesizing && (
                <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Claude Haiku is synthesising the AQA Mark Summary...</p>
                      <p className="text-xs text-muted-foreground">Evaluating answers against official AQA grade descriptors & mark scheme.</p>
                    </div>
                  </div>
                </div>
              )}

              {(!gradingResult.final_score || !gradingResult.grade_letter) && !isSynthesizing && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Examiner Log Complete — Mark Summary Pending</p>
                    <p className="text-xs text-muted-foreground">Synthesise the raw examiner evaluation into an official AQA grade, percentage score, and AO breakdown.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => synthesizeSummaryWithClaudeHaiku(gradingResult.marker_log)}
                    className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Grade with Claude Haiku
                  </Button>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-secondary/30 border border-secondary mb-8">
                <h4 className="text-sm font-bold text-foreground mb-2">Examiner Summary</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {gradingResult.student_summary || (isSynthesizing ? "Generating summary with Claude Haiku..." : "No summary available yet. Click 'Grade with Claude Haiku' above.")}
                </p>
              </div>

              {gradingResult.questions && gradingResult.questions.length > 0 && (
                <div className="mb-8 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Question-by-Question Marks</h4>
                  <div className="space-y-3">
                    {gradingResult.questions.map((q) => (
                      <div key={q.number} className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">
                            Question {q.number} {q.marks_available >= 4 && q.level ? `• ${q.level}` : ""}
                          </span>
                          <span className={cn(
                            "text-xs font-bold px-3 py-1 rounded-full border",
                            q.marks_awarded === q.marks_available 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-primary/10 text-primary border-primary/20"
                          )}>
                            {q.marks_awarded} / {q.marks_available} marks
                          </span>
                        </div>

                        {q.what_you_did_well && q.what_you_did_well.length > 0 && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <span className="text-emerald-500 font-semibold block">What went well:</span>
                            <ul className="list-disc list-inside space-y-0.5 ml-1">
                              {q.what_you_did_well.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {q.improvements && q.improvements.length > 0 && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <span className="text-amber-500 font-semibold block">Improvements:</span>
                            <ul className="list-disc list-inside space-y-0.5 ml-1">
                              {q.improvements.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {q.model_sentence && (
                          <div className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg border border-border/40">
                            <span className="not-italic font-semibold text-foreground mr-1.5">Model sentence:</span>
                            &ldquo;{q.model_sentence}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Assessment Objectives Breakdown</h4>
                <div className="grid grid-cols-2 gap-4">
                  {gradingResult.category_breakdown && Object.entries(gradingResult.category_breakdown).length > 0 ? (
                    Object.entries(gradingResult.category_breakdown).map(([cat, score]) => (
                      <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-sm">
                        <span className="text-sm font-medium text-foreground">{cat}</span>
                        <span className="text-sm font-bold text-primary">{score}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-xs text-muted-foreground italic p-3 border border-dashed border-border rounded-lg text-center">
                      {isSynthesizing ? "Calculating AO breakdown with Claude Haiku..." : "AO percentage breakdown not available for this paper. Only assessed criteria are shown."}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Key Issues
                  </h4>
                  {gradingResult.issue_groups && gradingResult.issue_groups.length > 0 ? (
                    <ul className="space-y-2">
                      {gradingResult.issue_groups.map((group) => (
                        <li key={group.questionNumber} className="text-sm text-foreground flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                          <span>
                            <span className="font-bold text-destructive">{group.heading}:</span>{" "}
                            {group.issues[0]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-2">
                      {gradingResult.key_issues && gradingResult.key_issues.length > 0 ? (
                        gradingResult.key_issues.map((issue, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                            {issue}
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-muted-foreground italic">
                          {isSynthesizing ? "Extracting key issues with Claude Haiku..." : "No significant issues."}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-green-600 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Actionable Improvements
                  </h4>
                  {gradingResult.issue_groups && gradingResult.issue_groups.length > 0 ? (
                    <div className="space-y-4">
                      {gradingResult.issue_groups.map((group) => {
                        const q = gradingResult.questions?.find(item => item.number === group.questionNumber);
                        return (
                          <div key={group.questionNumber} className="p-3.5 rounded-xl border border-green-600/20 bg-green-600/5 space-y-2">
                            <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-green-600/15 text-green-600">
                              Q{group.questionNumber} Action Steps
                            </span>
                            <ul className="space-y-1.5 pl-1">
                              {group.issues.map((issue, idx) => (
                                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 shrink-0" />
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                            {q?.model_sentence && (
                              <div className="text-xs text-muted-foreground italic bg-background/60 p-2.5 rounded-lg border border-green-600/15 mt-2">
                                <span className="not-italic font-semibold text-foreground mr-1">Model sentence:</span>
                                &ldquo;{q.model_sentence}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {gradingResult.improvement_points && gradingResult.improvement_points.length > 0 ? (
                        gradingResult.improvement_points.map((pt, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 shrink-0" />
                            {pt}
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-muted-foreground italic">
                          {isSynthesizing ? "Extracting actionable improvements with Claude Haiku..." : "No significant issues."}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {gradingResult.optional_suggestions && gradingResult.optional_suggestions.length > 0 && (
                <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 mb-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <h4 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Optional — To Push Even Higher
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These extension suggestions are for full-mark responses. They did not cost any marks and are optional ways to develop your analysis further.
                  </p>
                  <ul className="space-y-2 pl-1">
                    {gradingResult.optional_suggestions.map((sug, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="group border border-border rounded-xl bg-background overflow-hidden">
                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <span>Show raw log</span>
                  <span className="transition group-open:rotate-180">
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </summary>
                <div className="p-4 pt-0 border-t border-border mt-2">
                  <pre className="prose prose-sm prose-stone max-w-none text-muted-foreground whitespace-pre-wrap font-mono text-xs overflow-x-auto p-2">
                    {gradingResult.marker_log?.replace(/```json/gi, '').replace(/```/gi, '').trim()}
                  </pre>
                </div>
              </details>
              
              <div className="mt-8 flex justify-end gap-3 border-t border-border pt-6">
                <Button variant="outline" onClick={handleStartOver}>New Practice</Button>
                <Button 
                  onClick={() => saveToHistory()}
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

      {showCreditWarning.active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden relative p-6 text-center">
            <button onClick={() => setShowCreditWarning({ active: false, isUploadFlow: false })} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4 font-serif">Credit Warning</h3>
            <p className="text-sm text-muted-foreground mb-8">
              This generation is highly resource-intensive and will likely use up all your remaining Free credits. Are you sure you want to proceed?
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  const isUpload = showCreditWarning.isUploadFlow;
                  setShowCreditWarning({ active: false, isUploadFlow: false });
                  handleGenerateExercise(undefined, isUpload, true);
                }} 
                className="w-full py-3 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 font-bold transition-colors border border-amber-500/20"
              >
                Yes, Proceed
              </button>
              <button onClick={() => setShowCreditWarning({ active: false, isUploadFlow: false })} className="w-full py-3 rounded-xl bg-muted text-foreground hover:bg-muted/80 font-bold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
