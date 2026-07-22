"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, ModelType, TIER_RANK } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

type Flashcard = { term: string; definition: string };
type AppMode = "input" | "studying" | "results" | "editing";
type ExitDirection = "left" | "right" | null;

export default function FlashcardsPage() {
  const { tier, canAfford, deductCredits, isLoaded: subLoaded } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;

  // Input state
  const [topic, setTopic] = usePersistentState("flashcards_topic", "");
  const [textContent, setTextContent] = usePersistentState("flashcards_text", "");
  const [imageBase64, setImageBase64] = usePersistentState<string | null>("flashcards_image", null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Card state
  const [allCards, setAllCards] = usePersistentState<Flashcard[]>("flashcards_all", []);
  const [studyCards, setStudyCards] = usePersistentState<Flashcard[]>("flashcards_study", []);
  const [mode, setMode] = usePersistentState<AppMode>("flashcards_mode", "input");
  const [deckTitle, setDeckTitle] = usePersistentState("flashcards_title", "");

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
    const modelUsed: ModelType = isPremiumPlus ? "Apollo V4 Flash" : "Polaris 1";

    // Quick pre-flight check
    if (!canAfford(2000, modelUsed)) {
      alert("You do not have enough daily credits to generate these flashcards. Please try again tomorrow or upgrade your plan.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, text: textContent, imageBase64, tierRank }),
      });
      const data = await res.json();
      if (data.status === "success") {
        if (data.textUsage) deductCredits(data.textUsage.inputTokens, data.textUsage.outputTokens, modelUsed);
        if (data.imageUsage) deductCredits(data.imageUsage.inputTokens, data.imageUsage.outputTokens, "Bastion 3.5 Flash");
        setAllCards(data.data);
        setDeckTitle(data.title || topic || "Flashcard Deck");
        setHasSaved(false);
        startStudyRound(data.data);
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
  };

  const saveToHistory = async () => {
    if (!user || allCards.length === 0) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("flashcards_history").insert({
        user_id: user.id,
        title: deckTitle || "Untitled Deck",
        topic: topic || "Generated Deck",
        cards: allCards
      });
      if (error) throw error;
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
    return (
      <div className="max-w-2xl mx-auto pb-12 animate-in fade-in">
        <div className="mb-8">
          <p className="label-title mb-1.5">Study tools</p>
          <h1 className="page-title">Flashcards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste your notes or upload an image to generate flashcards.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Topic (optional)
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
                  className="absolute inset-0 rounded-2xl border border-border bg-card shadow-lg flex flex-col items-center justify-center p-8 md:p-14"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-6">
                    Term · tap to flip
                  </p>
                  <p className="text-2xl md:text-3xl font-semibold text-foreground leading-relaxed text-center max-w-2xl">
                    {card.term}
                  </p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 rounded-2xl border border-border bg-card shadow-lg flex flex-col items-center justify-center p-8 md:p-14"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-6">
                    Definition
                  </p>
                  <p className="text-lg md:text-xl text-foreground leading-relaxed text-center max-w-2xl">
                    {card.definition}
                  </p>
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
