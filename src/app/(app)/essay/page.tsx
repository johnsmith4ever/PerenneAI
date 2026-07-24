"use client";

import { useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useSubscription, ModelType, TIER_RANK } from "@/hooks/use-subscription";
import { 
  Upload, FileText, ArrowRight, Image as ImageIcon, 
  Cpu, Sparkles, ArrowLeft, PenTool, BookOpenCheck, Loader2, CheckCircle2,
  XCircle, TrendingUp, ChevronDown, Save, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Role = "student" | "teacher" | null;
type SourceType = "ai" | "real" | null;

interface EssayConfig {
  style: string;
  yearGroup: string;
  paragraphs: number;
  difficulty: string;
  structure: string;
  subject: string;
  length: string;
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
  key_issues: string[];
  improvement_points: string[];
  marker_log: string;
}

export default function EssayPage() {
  const router = useRouter();
  const [role, setRole] = usePersistentState<Role>("essay_role", null);
  const { user } = useUser();
  const { tier, canAfford, deductCredits, isLoaded: subLoaded } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  
  // Always render up to 8 paragraphs, but gate selection in the handler
  const maxParagraphs = 8;
  
  // Student flow state
  const [essayStep, setEssayStep] = usePersistentState<number>("essay_step", 1);
  const [sourceType, setSourceType] = usePersistentState<SourceType>("essay_source", null);
  const [config, setConfig] = usePersistentState<EssayConfig>("essay_config", {
    style: "Modernist",
    yearGroup: "Year 10",
    paragraphs: 3,
    difficulty: "Standard",
    structure: "PEEL",
    subject: "English Lit",
    length: "Medium"
  });
  
  const [realImage, setRealImage] = usePersistentState<string | null>("essay_real_img", null);
  const [ocrText, setOcrText] = usePersistentState<string>("essay_ocr_text", "");

  const [generatedPassage, setGeneratedPassage] = usePersistentState<string>("essay_gen_passage", "");
  const [generatedSummary, setGeneratedSummary] = usePersistentState<string>("essay_gen_summary", "");
  const [generatedQuestion, setGeneratedQuestion] = usePersistentState<string>("essay_gen_question", "");
  const [studentAnswers, setStudentAnswers] = usePersistentState<string[]>("essay_student_answers", []);
  
  const [isGenerating, setIsGenerating] = useState(false);

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
    if (val === "Long" && tierRank < TIER_RANK.Premium) {
      router.push("/subscriptions");
      return;
    }
    if (val === "Medium" && tierRank < TIER_RANK.Pro) {
      router.push("/subscriptions");
      return;
    }
    setConfig({...config, length: val});
  };

  const handleParagraphsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    if ((tierRank < TIER_RANK.Core && val > 1) || 
        (tierRank < TIER_RANK.Pro && val > 3) || 
        (tierRank < TIER_RANK.Premium && val > 5)) {
      router.push("/subscriptions");
      return;
    }
    setConfig({...config, paragraphs: val});
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val !== "Modernist" && tierRank < TIER_RANK.Pro) {
      router.push("/subscriptions");
      return;
    }
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
    if (!subLoaded) return;
    if (!canAfford(3000, "Polaris 1")) {
      alert("You do not have enough daily credits to generate an essay setup. Please try again tomorrow or upgrade your plan.");
      return;
    }

    setIsGenerating(true);
    setEssayStep(3);
    const actualParagraphs = Math.min(config.paragraphs, maxParagraphs);
    setStudentAnswers(Array(actualParagraphs).fill(""));

    try {
      let finalPassage = "";
      
      if (sourceType === "ai") {
        const actualLength = config.length;
        const passageTokens = tierRank >= TIER_RANK.Pro ? 3000 : 1200;

        const passageRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Write a ${(actualLength || "Medium").toLowerCase()} ${config.style || "Contemporary"} passage suitable for ${config.yearGroup} students at a ${config.difficulty} level. Subject: ${config.subject}. Do not include a title or any intro, just the raw passage text.` }],
            systemPrompt: `You are a master literary author. Write richly crafted, immersive passages with vivid imagery, strong voice, and authentic style. Prioritise atmosphere, characterisation, and thematic depth. Write in the exact style requested — match the diction, syntax, and tone of the period or movement. Do not summarise or explain; simply write the passage.`,
            model: tierRank >= TIER_RANK.Pro ? "Apollo V4 Pro" : "Apollo V4 Flash",
            maxTokens: passageTokens,
          }),
        });
        const passageData = await passageRes.json();
        if (passageData.usage) deductCredits(passageData.usage.inputTokens, passageData.usage.outputTokens, tierRank >= TIER_RANK.Pro ? "Apollo V4 Pro" : "Apollo V4 Flash");
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
            model: "Apollo V4 Flash",
            maxTokens: 200,
          }),
        });
        const summaryData = await summaryRes.json();
        if (summaryData.usage) deductCredits(summaryData.usage.inputTokens, summaryData.usage.outputTokens, "Apollo V4 Flash");
        setGeneratedSummary(summaryData.text);
      }

      const qRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Based on this passage, create a single essay question/task suitable for ${config.yearGroup} students at a ${config.difficulty} level, which they will answer using ${config.paragraphs} paragraphs of ${config.structure} structure. Do not include any intro, just the question itself.\n\nPassage:\n${finalPassage}` }],
          systemPrompt: "You are an expert literature teacher creating exam questions.",
          model: "Polaris 1",
          maxTokens: 150,
        }),
      });
      const qData = await qRes.json();
      if (qData.usage) deductCredits(qData.usage.inputTokens, qData.usage.outputTokens, "Polaris 1");
      setGeneratedQuestion(qData.text);
      
    } catch (e) {
      console.error(e);
      setGeneratedPassage("Failed to generate passage. Please try again.");
      setGeneratedQuestion("Failed to generate question. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitToGrading = () => {
    setGradingConfig({
      structure: config.structure,
      paragraphs: config.paragraphs,
      passage: generatedSummary || generatedPassage
    });

    const populatedAnswers = studentAnswers.map(ans => ({
      question: generatedQuestion,
      answer: ans
    }));
    
    setGradingAnswers(populatedAnswers);
    setTeacherImage(sourceType === "real" ? realImage : null);
    
    setRole("teacher");
    setTeacherStep(2);
    setGradingStatus("idle");
    setGradingResult(null);
    setHasSaved(false);
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
    if (!subLoaded) return;
    const markerModel: ModelType = "Bastion 3.5 Flash";
    
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
            model: "Bastion 3.5 Flash",
          }),
        });
        const ocrData = await ocrRes.json();
        if (ocrData.usage) deductCredits(ocrData.usage.inputTokens, ocrData.usage.outputTokens, "Bastion 3.5 Flash");
        if (ocrData.text) {
          finalSubmissionText += `[Extracted from Image Submission]:\n${ocrData.text}\n\n`;
        }
      }

      const typedAnswers = gradingAnswers.map((a, i) => `Paragraph ${i+1}:\nQuestion: ${a.question}\nAnswer: ${a.answer}`).join("\n\n");
      finalSubmissionText += `[Typed Answers]:\n${typedAnswers}`;

      setGradingStatus("marker");
      const markerSystemPrompt = `You are The Marker, a fair and balanced essay analyst. You will be given a passage summary, assignment instructions, and a student submission. Evaluate the submission constructively. Look for missing ${gradingConfig.structure} elements, major factual errors, or thematic misunderstandings. Do NOT be overly strict or nitpick minor stylistic choices. Output a concise markdown error log highlighting only legitimate flaws.`;

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
          maxTokens: 400,
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
      const judgeSystemPrompt = `You are The Judge, an encouraging and fair educator. Evaluate essay error logs produced by The Marker. You MUST respond with ONLY a raw JSON object — no markdown code fences. The exact schema is: { "final_score": number (0-100), "grade_letter": string (A*-U), "key_issues": string[], "improvement_points": string[] }`;

      const judgeUserMessage = `Based solely on the error log below, calculate a fair final score (0-100). Be generous and encouraging—do NOT grade harshly unless there are major structural or factual failures. A competent essay with minor flaws should still receive an A or B (70-90). Assign the grade letter, and provide 2-3 key issues and 2-3 actionable improvement points.\n\nMarker's Error Log:\n${markerLog}`;

      const judgeRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: judgeUserMessage }],
          systemPrompt: judgeSystemPrompt,
          model: "Bastion 3.5 Flash",
          maxTokens: 400,
        }),
      });
      const judgeData = await judgeRes.json();

      if (!judgeData.text) {
        console.error("Judge API error:", judgeData);
        throw new Error(`Judge failed: ${judgeData.message || "No response received."}`);
      }
      if (judgeData.usage) deductCredits(judgeData.usage.inputTokens, judgeData.usage.outputTokens, "Bastion 3.5 Flash");
      
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
          <h1 className="page-title">Essay</h1>
          <p className="text-sm text-muted-foreground mt-1">
            How will you be using Essay today?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
          <button 
            onClick={() => setRole("student")}
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
              {gradingStatus === "idle" || gradingStatus === "error" ? (
                <div className="flex flex-col items-end gap-2">
                  <Button size="lg" className="px-8 shadow-sm gap-2" onClick={handleGradeEssay}>
                    <CheckCircle2 className="w-4 h-4" />
                    {gradingStatus === "error" ? "Retry AI Grading" : "Submit for AI Grading"}
                  </Button>
                  {gradingStatus === "error" && <p className="text-xs text-destructive font-medium">An error occurred during grading. Please try again.</p>}
                </div>
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
        </div>
      </div>

      {essayStep === 1 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in">
          <h2 className="text-xl font-semibold text-foreground">Where should the literature come from?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => {
                setSourceType("ai");
                setEssayStep(2);
              }}
              className="flex flex-col items-center text-center p-8 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center mb-4 transition-colors">
                <Cpu className="w-6 h-6" />
              </div>
              <p className="section-title mb-2">AI-Generated Literature</p>
              <p className="text-sm text-muted-foreground">
                Let AI craft a brand new passage for you to analyze based on your specifications.
              </p>
            </button>

            <button
              onClick={() => {
                setSourceType("real");
                setEssayStep(2);
              }}
              className="flex flex-col items-center text-center p-8 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center mb-4 transition-colors">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="section-title mb-2">Real Piece Upload</p>
              <p className="text-sm text-muted-foreground">
                Upload a photo or text of a real literature piece (e.g., from an exam paper) to practice on.
              </p>
            </button>
          </div>
        </div>
      )}

      {essayStep === 2 && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setEssayStep(1)} className="rounded-full shrink-0">
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
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-foreground">Style</label>
                  <select 
                    value={config.style}
                    onChange={handleStyleChange}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {["Victorian", "Gothic", "Modernist", "Romantic", "Shakespearean", "Dystopian", "Contemporary"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {tierRank < TIER_RANK.Pro && <Lock className="absolute right-3 top-[38px] w-3 h-3 text-muted-foreground" />}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Subject</label>
                <select 
                  value={config.subject}
                  onChange={(e) => setConfig({...config, subject: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {["English Lit", "English Language", "History", "RE", "Geography"].map(s => (
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
                  {["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Difficulty</label>
                <select 
                  value={config.difficulty}
                  onChange={(e) => setConfig({...config, difficulty: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {["Foundation", "Standard", "Higher", "A-Level Stretch"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Number of Paragraphs to Write</label>
                <select 
                  value={config.paragraphs}
                  onChange={handleParagraphsChange}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Array.from({ length: maxParagraphs }, (_, i) => i + 1).map(s => {
                    const isLocked = (tierRank < TIER_RANK.Core && s > 1) || (tierRank < TIER_RANK.Pro && s > 3) || (tierRank < TIER_RANK.Premium && s > 5);
                    return (
                      <option key={s} value={s}>
                        {s} Paragraph{s > 1 ? 's' : ''} {isLocked ? "(Premium)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Structure Type</label>
                <select 
                  value={config.structure}
                  onChange={(e) => setConfig({...config, structure: e.target.value})}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {["PEE", "PEEL", "PETAL", "TEEL", "Freeform"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              size="lg" 
              className="gap-2" 
              onClick={handleGenerateExercise}
              disabled={(sourceType === "real" && !realImage && !ocrText) || isGenerating}
            >
              <Sparkles className="w-4 h-4" />
              Generate Exercise
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Writing Page */}
      {essayStep === 3 && (
        <div className="space-y-12 animate-in slide-in-from-bottom-4 fade-in">
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setEssayStep(2)} className="rounded-full shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold text-foreground">Practice Exercise</h2>
          </div>
          
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">Generating passage and question...</p>
            </div>
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

              {/* Question / Task */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  Your Task
                </h3>
                <p className="text-foreground font-medium">
                  {generatedQuestion}
                </p>
              </div>

              {/* Answer Boxes */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-lg font-semibold text-foreground">Your Response</h3>
                  <span className="text-xs font-medium px-2.5 py-1 bg-secondary rounded-full text-secondary-foreground">
                    {config.paragraphs} Paragraph{config.paragraphs > 1 ? 's' : ''} • {config.structure} Structure
                  </span>
                </div>

                {Array.from({ length: config.paragraphs }).map((_, idx) => (
                  <div key={idx} className="space-y-3 relative group">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                        {idx + 1}
                      </span>
                      <label className="text-sm font-semibold text-foreground">
                        Paragraph {idx + 1}
                      </label>
                    </div>
                    
                    <textarea
                      value={studentAnswers[idx] || ""}
                      onChange={(e) => {
                        const copy = [...studentAnswers];
                        copy[idx] = e.target.value;
                        setStudentAnswers(copy);
                      }}
                      className="w-full min-h-[200px] p-5 rounded-xl border border-border bg-card text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm leading-relaxed"
                      placeholder={
                        config.structure === "Freeform" 
                          ? "Write your paragraph here..." 
                          : `Structure your paragraph using ${config.structure}. Start with your main point...`
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-6 pb-20 border-t border-border">
                <Button size="lg" className="px-8 shadow-sm" onClick={handleSubmitToGrading}>
                  Submit Essay for Grading
                </Button>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
