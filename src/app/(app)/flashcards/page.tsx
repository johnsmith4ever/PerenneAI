"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useUser } from "@clerk/nextjs";
import { insertHistoryAction, deleteHistoryAction, fetchUserHistoryAction, upsertChatAction } from "@/actions/supabase";
import {
  Sparkles,
  RotateCcw,
  Plus,
  Pencil,
  Check,
  X,
  Save,
  Trash2,
  Loader2,
  Shuffle,
  Eye,
  EyeOff,
  CheckCircle2,
  ChevronDown,
  BookOpenCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, ModelType, TIER_RANK } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

type Flashcard = { term: string; definition: string };
type AppMode = "input" | "studying" | "results" | "editing";
type InputTab = "manual" | "ai";
type ExitDirection = "left" | "right" | null;

export default function FlashcardsPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { curriculumLevel, setCurriculumLevel, curriculumSubject, setCurriculumSubject } = useCurriculum();
  const { tier, canAfford, deductCredits, isLoaded: subLoaded , assistant } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;

  // Input state
  const [inputTab, setInputTab] = usePersistentState<InputTab>("flashcards_input_tab", "manual");
  const [manualDeckTitle, setManualDeckTitle] = useState("");
  const [manualCards, setManualCards] = useState<Flashcard[]>([
    { term: "", definition: "" },
    { term: "", definition: "" },
    { term: "", definition: "" },
  ]);
  const [topic, setTopic] = usePersistentState("flashcards_topic", "");
  const [textContent, setTextContent] = usePersistentState("flashcards_text", "");
  const [imageBase64, setImageBase64] = usePersistentState<string | null>("flashcards_image", null);
  const [cardCount, setCardCount] = usePersistentState<string>("flashcards_count", "Auto");
  const [flashcardGenMode, setFlashcardGenMode] = usePersistentState<"Standard" | "Syllabus">("flashcards_gen_mode", "Syllabus");
  const [extraTopicDetails, setExtraTopicDetails] = usePersistentState("flashcards_extra_details", "");
  const [isGenerating, setIsGenerating] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("topic");
      if (t) {
        setInputTab("ai");
        setTopic(t);
      }
    }
  }, []);

  // Card state
  const [allCards, setAllCards] = usePersistentState<Flashcard[]>("flashcards_all", []);
  const [studyCards, setStudyCards] = usePersistentState<Flashcard[]>("flashcards_study", []);
  const [mode, setMode] = usePersistentState<AppMode>("flashcards_mode", "input");
  const [deckTitle, setDeckTitle] = usePersistentState("flashcards_title", "");
  const [isDatabaseMatch, setIsDatabaseMatch] = usePersistentState<boolean | null>("flashcards_db_match", null);

  // Study state
  const [currentIndex, setCurrentIndex] = usePersistentState("flashcards_index", 0);
  const [isFlipped, setIsFlipped] = usePersistentState("flashcards_flipped", false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [exitDirection, setExitDirection] = useState<ExitDirection>(null);
  const [correctCards, setCorrectCards] = usePersistentState<Flashcard[]>("flashcards_correct", []);
  const [wrongCards, setWrongCards] = usePersistentState<Flashcard[]>("flashcards_wrong", []);
  const [roundNumber, setRoundNumber] = usePersistentState("flashcards_round", 1);
  const [shuffleSpin, setShuffleSpin] = useState(false);

  // Track progress toggle
  const [trackProgress, setTrackProgress] = usePersistentState("flashcards_track", true);

  // Edit state
  const [editCards, setEditCards] = usePersistentState<Flashcard[]>("flashcards_edit", []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() && !textContent.trim() && !imageBase64) return;
    if (!subLoaded) return;
    
    const isPremiumPlus = tierRank >= TIER_RANK.Premium;
    const modelUsed: ModelType = assistant;

    // Quick pre-flight check
    if (!canAfford(2000, modelUsed)) {
      alert("You do not have enough daily credits to generate these flashcards. Please try again tomorrow or upgrade your plan.");
      return;
    }

    if (flashcardGenMode === "Syllabus" && !topic.trim()) {
      alert("Topic is required when using Syllabus Strict mode.");
      return;
    }

    setIsGenerating(true);
    try {
      const payloadText = flashcardGenMode === "Syllabus" ? "" : textContent;
      const payloadImage = flashcardGenMode === "Syllabus" ? null : imageBase64;
      
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: topic.trim(), 
          text: payloadText,
          imageBase64: payloadImage,
          tierRank,
          cardCount,
          curriculumLevel,
          curriculumSubject,
          extraDetails: extraTopicDetails.trim() || undefined,
          model: modelUsed
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        if (data.textUsage) deductCredits(data.textUsage.inputTokens, data.textUsage.outputTokens, modelUsed);
        if (data.imageUsage) deductCredits(data.imageUsage.inputTokens, data.imageUsage.outputTokens, "Gemini 3.6 Flash");
        setAllCards(data.data);
        const finalTitle = data.title || topic || "Flashcard Deck";
        setDeckTitle(finalTitle);
        setIsDatabaseMatch(data.isDatabaseMatch ?? null);
        setHasSaved(false);
        startStudyRound(data.data);

        // Auto-save to history
        if (user) {
          insertHistoryAction("flashcards_history", {
            user_id: user.id,
            title: finalTitle,
            topic: topic || "Generated Deck",
            cards: data.data.map((c: any) => ({ ...c, failed: false }))
          }).then(() => setHasSaved(true)).catch(console.error);
        }
      } else {
        alert("Error: " + data.message);
      }
    } catch {
      alert("Failed to generate flashcards.");
    } finally {
      setIsGenerating(false);
    }
  };

  const shuffleArray = (arr: Flashcard[]) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startStudyRound = (cards: Flashcard[]) => {
    setStudyCards(shuffleArray(cards));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFlipping(false);
    setExitDirection(null);
    setCorrectCards([]);
    setWrongCards([]);
    setMode("studying");
  };

  const handleFlip = useCallback(() => {
    if (isFlipping || exitDirection) return;
    setIsFlipping(true);
    setIsFlipped((prev) => !prev);
    setTimeout(() => setIsFlipping(false), 500);
  }, [isFlipping, exitDirection]);

  const handleShuffle = () => {
    setShuffleSpin(true);
    setTimeout(() => setShuffleSpin(false), 600);
    setStudyCards(shuffleArray(studyCards));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFlipping(false);
    setExitDirection(null);
    setCorrectCards([]);
    setWrongCards([]);
  };

  // Animate card exit then advance
  const animateAndAdvance = (dir: "left" | "right", isCorrect: boolean) => {
    if (exitDirection) return;
    setExitDirection(dir);
    if (trackProgress) {
      if (isCorrect) {
        setCorrectCards((prev) => [...prev, studyCards[currentIndex]]);
      } else {
        setWrongCards((prev) => [...prev, studyCards[currentIndex]]);
      }
    }
    setTimeout(() => {
      setExitDirection(null);
      setIsFlipped(false);
      setIsFlipping(false);
      if (currentIndex < studyCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setMode("results");
      }
    }, 420);
  };

  const handleCorrect = useCallback(() => {
    animateAndAdvance("right", true);
  }, [exitDirection, trackProgress, studyCards, currentIndex]);

  const handleWrong = useCallback(() => {
    animateAndAdvance("left", false);
  }, [exitDirection, trackProgress, studyCards, currentIndex]);

  const handleTryAgain = () => {
    setRoundNumber((prev) => prev + 1);
    startStudyRound(wrongCards);
  };

  const handleRestartAll = () => {
    setRoundNumber(1);
    startStudyRound(allCards);
  };

  const handleNewCards = () => {
    setMode("input");
    setTopic("");
    setTextContent("");
    setImageBase64(null);
    setAllCards([]);
    setDeckTitle("");
    setRoundNumber(1);
    setHasSaved(false);
    setManualDeckTitle("");
    setManualCards([
      { term: "", definition: "" },
      { term: "", definition: "" },
      { term: "", definition: "" },
    ]);
  };

  const handleStartManual = () => {
    const validCards = manualCards.filter(c => c.term.trim() && c.definition.trim());
    if (validCards.length < 1) return;
    setAllCards(validCards);
    const finalTitle = manualDeckTitle.trim() || "My Deck";
    setDeckTitle(finalTitle);
    setRoundNumber(1);
    setHasSaved(false);
    startStudyRound(validCards);

    // Auto-save to history
    if (user) {
      insertHistoryAction("flashcards_history", {
        user_id: user.id,
        title: finalTitle,
        topic: "Manual Deck",
        cards: validCards.map((c: any) => ({ ...c, failed: false }))
      }).then(() => setHasSaved(true)).catch(console.error);
    }
  };

  const saveToHistory = async () => {
    if (!user || allCards.length === 0) return;
    setIsSaving(true);
    try {
      await insertHistoryAction("flashcards_history", {
        user_id: user.id,
        title: deckTitle || "Untitled Deck",
        topic: topic || "Generated Deck",
        cards: allCards.map(c => ({
          ...c,
          failed: wrongCards.some(wc => wc.term === c.term)
        }))
      });
      
      setHasSaved(true);
    } catch (e) {
      console.error("Error saving flashcard history:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnterEdit = () => {
    setEditCards(allCards.map((c) => ({ ...c })));
    setMode("editing");
  };

  const handleSaveEdits = () => {
    const filtered = editCards.filter(
      (c) => c.term.trim() || c.definition.trim()
    );
    setAllCards(filtered);
    startStudyRound(filtered);
    setRoundNumber(1);
  };

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    if (mode !== "studying") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleWrong();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleCorrect();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, handleFlip, handleCorrect, handleWrong]);

  // ─── INPUT MODE ───
  if (mode === "input") {
    const validManualCount = manualCards.filter(c => c.term.trim() && c.definition.trim()).length;

    return (
      <div className="max-w-2xl mx-auto pb-16 animate-in fade-in">
        <div className="mb-8">
          <p className="label-title mb-1.5">Study tools</p>
          <div className="flex items-center gap-3">
            <h1 className="page-title m-0">Flashcards</h1>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1">AQA Syllabus</span>
          </div>
        </div>

        {/* ── Tab toggle ── */}
        <div className="flex bg-muted p-1 rounded-xl w-full mb-8">
          <button
            onClick={() => setInputTab("manual")}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
              inputTab === "manual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            ✏️ Create Manually
          </button>
          <button
            onClick={() => setInputTab("ai")}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
              inputTab === "ai" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Build with AI
          </button>
        </div>

        {/* ── MANUAL TAB ── */}
        {inputTab === "manual" && (
          <div className="space-y-6">
            {/* Deck title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Deck Title
              </label>
              <input
                type="text"
                value={manualDeckTitle}
                onChange={(e) => setManualDeckTitle(e.target.value)}
                placeholder="e.g. Cell Biology, French Revolution..."
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
              />
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {manualCards.map((card, i) => (
                <div key={i} className="relative bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Card {i + 1}</span>
                    {manualCards.length > 1 && (
                      <button
                        onClick={() => setManualCards(manualCards.filter((_, idx) => idx !== i))}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Term</label>
                      <input
                        type="text"
                        value={card.term}
                        onChange={(e) => {
                          const updated = [...manualCards];
                          updated[i] = { ...updated[i], term: e.target.value };
                          setManualCards(updated);
                        }}
                        placeholder="Enter term..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Definition</label>
                      <input
                        type="text"
                        value={card.definition}
                        onChange={(e) => {
                          const updated = [...manualCards];
                          updated[i] = { ...updated[i], definition: e.target.value };
                          setManualCards(updated);
                        }}
                        placeholder="Enter definition..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add card */}
            <button
              onClick={() => setManualCards([...manualCards, { term: "", definition: "" }])}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Card
            </button>

            {/* Start studying */}
            <Button
              className="w-full gap-2 mt-2"
              size="lg"
              onClick={handleStartManual}
              disabled={validManualCount < 1}
            >
              <BookOpenCheck className="w-4 h-4" />
              Study {validManualCount > 0 ? `${validManualCount} Card${validManualCount !== 1 ? "s" : ""}` : "Deck"}
            </Button>
          </div>
        )}

        {/* ── AI TAB ── */}
        {inputTab === "ai" && (
          <div className="space-y-5">
            {/* Mode Toggle */}
            <div className="flex bg-muted p-1 rounded-xl w-full mb-1">
              <button
                onClick={() => setFlashcardGenMode("Syllabus")}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  flashcardGenMode === "Syllabus" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Syllabus Strict
              </button>
              <button
                onClick={() => setFlashcardGenMode("Standard")}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                  flashcardGenMode === "Standard" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Standard
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Topic {flashcardGenMode === "Syllabus" ? "(Required)" : "(Optional)"}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Cell Biology, French Revolution..."
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Extra Details <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={extraTopicDetails}
                onChange={(e) => setExtraTopicDetails(e.target.value)}
                placeholder="Any specific areas to focus on, keywords to include, or hints for the AI..."
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                rows={3}
              />
            </div>

            {flashcardGenMode === "Standard" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Content
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste your notes, textbook content, or key terms here..."
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                    rows={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Upload Image (optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
                    />
                    {imageBase64 && (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Attached
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {flashcardGenMode === "Syllabus" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Level
                  </label>
                  <div className="relative">
                    <select
                      value={curriculumLevel}
                      onChange={(e) => setCurriculumLevel(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                    >
                      <option value="KS3">KS3</option>
                      <option value="GCSE">GCSE</option>
                      <option value="A-Level">A-Level</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Subject
                  </label>
                  <div className="relative">
                    <select
                      value={curriculumSubject}
                      onChange={(e) => setCurriculumSubject(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                    >
                      <option value="Biology">Biology</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Physics">Physics</option>
                      <option value="Geography">Geography</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Number of Cards
              </label>
              <div className="relative">
                <select
                  value={cardCount}
                  onChange={(e) => setCardCount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                >
                  <option value="Auto">Auto (Let AI decide)</option>
                  {Array.from({ length: 16 }, (_, i) => i + 5)
                    .filter(num => tierRank >= TIER_RANK.Core || num <= 10)
                    .map((num) => (
                    <option key={num} value={num.toString()}>
                      {num} Cards {num > 10 && tierRank < TIER_RANK.Core ? "(Core)" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <Button
              className="w-full gap-2 mt-4"
              size="lg"
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                (!topic.trim() && !textContent.trim() && !imageBase64)
              }
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Flashcards
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }


  // ─── STUDY MODE ───
  if (mode === "studying") {
    const card = studyCards[currentIndex];
    const totalSeen = correctCards.length + wrongCards.length;
    const progress = (totalSeen / studyCards.length) * 100;

    // Card exit styles
    const cardExitStyle: React.CSSProperties =
      exitDirection === "right"
        ? {
            transform: "translateX(120%) rotate(12deg)",
            opacity: 0,
            transition: "transform 0.4s cubic-bezier(0.4,0,0.6,1), opacity 0.35s ease",
          }
        : exitDirection === "left"
        ? {
            transform: "translateX(-120%) rotate(-12deg)",
            opacity: 0,
            transition: "transform 0.4s cubic-bezier(0.4,0,0.6,1), opacity 0.35s ease",
          }
        : {};

    // Overlay tint when exiting
    const overlayColor =
      exitDirection === "right"
        ? "rgba(34,197,94,0.18)"
        : exitDirection === "left"
        ? "rgba(239,68,68,0.18)"
        : "transparent";

    return (
      <div className="flex flex-col h-[calc(100vh-72px)] max-w-4xl mx-auto px-4 animate-in fade-in overflow-hidden">

        {/* ── Score bar ── */}
        <div className="flex items-center justify-between pt-4 pb-2 shrink-0">
          {/* Correct */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 shadow-sm">
              <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
            </div>
            <span className="text-xl font-bold text-emerald-600 tabular-nums w-8">
              {correctCards.length}
            </span>
          </div>

          {/* Title + progress */}
          <div className="flex flex-col items-center gap-0.5 flex-1 mx-4">
            <h1 className="font-serif text-xl font-bold text-foreground tracking-tight leading-tight text-center truncate max-w-sm">
              {deckTitle}
            </h1>
            {isDatabaseMatch === false && (
              <div className="mt-1 flex justify-center">
                <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
                  Not in Database
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {currentIndex + 1}&nbsp;/&nbsp;{studyCards.length}
              {roundNumber > 1 && (
                <span className="ml-1.5 text-primary font-semibold">
                  · Round {roundNumber}
                </span>
              )}
            </p>
          </div>

          {/* Wrong */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-red-500 tabular-nums w-8 text-right">
              {wrongCards.length}
            </span>
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100 shadow-sm">
              <X className="w-4 h-4 text-red-500" strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Start Over Button - Top Right */}
        <div className="absolute top-4 right-4 z-10 hidden md:block">
          <Button variant="outline" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={handleNewCards}>
            <Plus className="w-4 h-4" /> New Flashcards
          </Button>
        </div>

        {/* ── Progress bar ── */}
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden shrink-0 mb-3">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ── Flashcard area ── */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-2">
          <div
            className="w-full max-w-3xl relative"
            style={{ perspective: "1200px", height: "min(440px, 58vh)" }}
          >
            {/* Card wrapper — handles exit animation */}
            <div
              onClick={handleFlip}
              className="absolute inset-0 cursor-pointer select-none"
              style={cardExitStyle}
            >
              {/* Colour overlay on exit */}
              <div
                className="absolute inset-0 rounded-2xl z-10 pointer-events-none transition-colors duration-200"
                style={{ background: overlayColor, borderRadius: "1rem" }}
              />

              {/* 3D flip inner */}
              <div
                className={cn(
                  "relative w-full h-full",
                  isFlipped ? "flashcard-flipped" : ""
                )}
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-[2rem] border border-border/50 bg-gradient-to-br from-card to-card/90 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center p-8 md:p-14 overflow-hidden backdrop-blur-xl"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  {/* Decorative Orbs */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="px-3 py-1 mb-8 rounded-full border border-border/50 bg-muted/50 backdrop-blur-sm flex items-center gap-2 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                        Term · tap to flip
                      </p>
                    </div>
                    <p className="text-2xl md:text-4xl font-bold text-foreground leading-relaxed text-center max-w-2xl tracking-tight">
                      {card.term}
                    </p>
                  </div>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 rounded-[2rem] border border-border/50 bg-gradient-to-br from-card to-card/90 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center p-8 md:p-14 overflow-hidden backdrop-blur-xl"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  {/* Decorative Orbs */}
                  <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] translate-y-1/2 translate-x-1/2 pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center w-full h-full justify-center">
                    <div className="px-3 py-1 mb-6 rounded-full border border-border/50 bg-muted/50 backdrop-blur-sm flex items-center gap-2 shadow-sm">
                      <BookOpenCheck className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                        Definition
                      </p>
                    </div>
                    <div className="overflow-y-auto w-full max-h-[80%] flex flex-col items-center justify-center custom-scrollbar px-4">
                      <p className="text-lg md:text-2xl text-foreground/90 font-medium leading-relaxed text-center max-w-2xl">
                        {card.definition}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action buttons (always visible) ── */}
        <div className="flex items-center justify-center gap-5 pt-3 pb-2 shrink-0">
          {/* Wrong */}
          <button
            onClick={handleWrong}
            disabled={!!exitDirection}
            className="group flex items-center gap-3 px-7 py-3.5 rounded-2xl border-2 border-red-200 bg-white dark:bg-card dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 dark:hover:border-red-800 active:scale-95 transition-all shadow-sm disabled:opacity-50"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/50 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
              <X className="w-5 h-5 text-red-500" strokeWidth={3} />
            </div>
            <span className="text-sm font-semibold text-red-600">
              {trackProgress ? "Still learning" : "Skip"}
            </span>
          </button>

          {/* Flip hint (centre) */}
          <button
            onClick={handleFlip}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/70 text-muted-foreground text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Flip
          </button>

          {/* Correct */}
          <button
            onClick={handleCorrect}
            disabled={!!exitDirection}
            className="group flex items-center gap-3 px-7 py-3.5 rounded-2xl border-2 border-emerald-200 bg-white dark:bg-card dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-400 dark:hover:border-emerald-800 active:scale-95 transition-all shadow-sm disabled:opacity-50"
          >
            <span className="text-sm font-semibold text-emerald-600">
              {trackProgress ? "Got it" : "Next"}
            </span>
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/50 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
              <Check className="w-5 h-5 text-emerald-600" strokeWidth={3} />
            </div>
          </button>
        </div>

        {/* ── Controls row: Shuffle + Track progress ── */}
        <div className="flex items-center justify-center gap-4 pt-2 pb-4 shrink-0">

          {/* Shuffle button */}
          <button
            onClick={handleShuffle}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
              bg-gradient-to-r from-[#d97757] to-[#c4623f] text-white shadow-md
              hover:from-[#c4623f] hover:to-[#b5522f] hover:shadow-lg active:scale-95"
          >
            <Shuffle
              className={cn(
                "w-4 h-4 transition-transform duration-500",
                shuffleSpin && "rotate-180"
              )}
            />
            Shuffle
          </button>

          {/* Track progress toggle — pill drag switch */}
          <button
            onClick={() => setTrackProgress((p) => !p)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all
              bg-gradient-to-r from-[#78716c] to-[#57534e] text-white shadow-md
              hover:from-[#57534e] hover:to-[#44403c] hover:shadow-lg active:scale-95"
          >
            {/* Toggle pill */}
            <span
              className={cn(
                "relative inline-flex w-10 h-5.5 rounded-full border-2 border-white/60 transition-colors duration-300",
                trackProgress ? "bg-white/30" : "bg-black/20"
              )}
              style={{ minWidth: "2.5rem", height: "1.375rem" }}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300",
                  trackProgress ? "left-[calc(100%-1.125rem)]" : "left-0.5"
                )}
              />
            </span>
            {trackProgress ? "Tracking" : "No Track"}
          </button>

          {/* Keyboard hint */}
          <div className="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground/50">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Space</kbd>
            flip
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">←</kbd>
            wrong
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">→</kbd>
            correct
          </div>
        </div>
        <div className="md:hidden flex justify-center pb-4 shrink-0">
           <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={handleNewCards}>
             <Plus className="w-4 h-4" /> New Flashcards
           </Button>
        </div>
      </div>
    );
  }

  // ─── RESULTS MODE ───
  if (mode === "results") {
    const total = correctCards.length + wrongCards.length;
    const pct = total > 0 ? Math.round((correctCards.length / total) * 100) : 0;

    if (!trackProgress) {
      return (
        <div className="max-w-2xl mx-auto pb-12 animate-in fade-in">
          <div className="text-center mb-12 pt-12">
            <p className="label-title mb-4">Deck Complete</p>
            <h2 className="font-serif text-3xl font-bold text-foreground tracking-tight mb-2">
              {deckTitle}
            </h2>
            <p className="text-muted-foreground text-sm">
              You&apos;ve gone through all {studyCards.length} cards.
            </p>
          </div>
          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <Button size="lg" className="w-full gap-2" onClick={handleRestartAll}>
              <RotateCcw className="w-4 h-4" /> Study Again
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setTrackProgress(true); handleRestartAll(); }}
            >
              <Eye className="w-4 h-4" /> Restart with Tracking
            </Button>
            <Button size="lg" variant="outline" className="w-full gap-2" onClick={handleEnterEdit}>
              <Pencil className="w-4 h-4" /> Edit Cards
            </Button>
            <Button size="lg" variant="outline" className="w-full gap-2" onClick={saveToHistory} disabled={isSaving || hasSaved}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {hasSaved ? "Saved to History" : "Save to History"}
            </Button>
            <Button size="lg" variant="outline" className="w-full gap-2" onClick={handleNewCards}>
              <Plus className="w-4 h-4" /> New Flashcards
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto pb-12 animate-in fade-in">
        <div className="text-center mb-10 pt-8">
          <p className="label-title mb-2">Round {roundNumber} Complete</p>
          <h2 className="font-serif text-3xl font-bold text-foreground tracking-tight mb-6">
            {deckTitle}
          </h2>

          {/* Score ring */}
          <div className="relative inline-flex items-center justify-center w-40 h-40 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-4xl font-bold text-primary">{pct}%</span>
          </div>

          <div className="flex items-center justify-center gap-8 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />
              </div>
              <span className="text-sm font-semibold">{correctCards.length} correct</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-red-500" strokeWidth={3} />
              </div>
              <span className="text-sm font-semibold">{wrongCards.length} wrong</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {pct === 100
              ? "Perfect! You know all the cards."
              : `${wrongCards.length} card${wrongCards.length === 1 ? "" : "s"} to review next round.`}
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          {wrongCards.length > 0 && (
            <Button size="lg" className="w-full gap-2" onClick={handleTryAgain}>
              <RotateCcw className="w-4 h-4" /> Next Round ({wrongCards.length} card{wrongCards.length === 1 ? "" : "s"})
            </Button>
          )}
          {pct === 100 && (
            <Button size="lg" className="w-full gap-2" onClick={handleRestartAll}>
              <RotateCcw className="w-4 h-4" /> Study All Again
            </Button>
          )}
          <Button size="lg" variant="outline" className="w-full gap-2" onClick={handleEnterEdit}>
            <Pencil className="w-4 h-4" /> Edit Cards
          </Button>
          <Button size="lg" variant="outline" className="w-full gap-2" onClick={saveToHistory} disabled={isSaving || hasSaved}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {hasSaved ? "Saved to History" : "Save to History"}
          </Button>
          <Button size="lg" variant="outline" className="w-full gap-2" onClick={handleNewCards}>
            <Plus className="w-4 h-4" /> New Flashcards
          </Button>
        </div>
      </div>
    );
  }

  // ─── EDIT MODE ───
  if (mode === "editing") {
    return (
      <div className="max-w-3xl mx-auto pb-12 animate-in fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="label-title mb-1.5">Edit mode</p>
            <h1 className="page-title">Edit Flashcards</h1>
            <p className="text-sm text-muted-foreground mt-1">{editCards.length} cards</p>
          </div>
          <Button className="gap-2" onClick={handleSaveEdits}>
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>

        <div className="space-y-3">
          {editCards.map((card, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
              <span className="text-xs font-bold text-muted-foreground mt-3 w-6 shrink-0">{i + 1}</span>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Term</label>
                  <input
                    type="text"
                    value={card.term}
                    onChange={(e) => {
                      const updated = [...editCards];
                      updated[i] = { ...updated[i], term: e.target.value };
                      setEditCards(updated);
                    }}
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Definition</label>
                  <input
                    type="text"
                    value={card.definition}
                    onChange={(e) => {
                      const updated = [...editCards];
                      updated[i] = { ...updated[i], definition: e.target.value };
                      setEditCards(updated);
                    }}
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <button
                onClick={() => setEditCards(editCards.filter((_, idx) => idx !== i))}
                className="mt-3 p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full mt-4 gap-2 border-dashed"
          onClick={() => setEditCards([...editCards, { term: "", definition: "" }])}
        >
          <Plus className="w-4 h-4" /> Add Card
        </Button>
      </div>
    );
  }

  return null;
}
