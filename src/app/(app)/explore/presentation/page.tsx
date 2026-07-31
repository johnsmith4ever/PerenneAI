"use client";

import { useState, useEffect } from "react";
import { MonitorPlay, ArrowRight, Loader2, ChevronLeft, ChevronRight, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSubscription, TIER_RANK } from "@/hooks/use-subscription";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import pptxgen from "pptxgenjs";

type Slide = {
  title: string;
  bulletPoints: string[];
};

export default function PresentationBuilderPage() {
  const [topic, setTopic] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const { tier, isLoaded, deductCredits } = useSubscription();
  const tierRank = TIER_RANK[tier] || 0;
  const { user } = useUser();

  useEffect(() => {
    const savedData = localStorage.getItem("explore_presentation_data");
    const savedTopic = localStorage.getItem("explore_presentation_topic");
    if (savedData && savedTopic) {
      setSlides(JSON.parse(savedData));
      setTopic(savedTopic);
      localStorage.removeItem("explore_presentation_data");
      localStorage.removeItem("explore_presentation_topic");
    }
  }, []);

  const generatePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, slideCount, extraContext, tierRank }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setSlides(data.data);
        setCurrentSlideIndex(0);
        deductCredits(100, slideCount * 100, "Apollo V4 Flash", "other");
        
        if (user) {
          await supabase.from("explore_history").insert({
            user_id: user.id,
            topic: topic,
            type: "presentation",
            data: data.data
          });
        }
      } else {
        setError(data.message || "Failed to generate.");
      }
    } catch (e: any) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(c => c + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(c => c - 1);
    }
  };

  const downloadPptx = () => {
    if (slides.length === 0) return;
    const pres = new pptxgen();
    
    slides.forEach(slide => {
      const slideObj = pres.addSlide();
      slideObj.addText(slide.title, { x: 1, y: 1, w: "80%", fontSize: 36, bold: true, color: "000000" });
      
      const bulletPoints = slide.bulletPoints.map(p => ({ text: p, options: { bullet: true } }));
      slideObj.addText(bulletPoints, { x: 1, y: 2.5, w: "80%", fontSize: 24, color: "333333" });
    });

    pres.writeFile({ fileName: `${topic || "Presentation"}.pptx` });
  };

  if (isLoaded && tierRank === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in pb-12 text-center pt-20">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-6">
          <MonitorPlay className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold font-serif" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
          Presentation Builder is a Core Feature
        </h1>
        <p className="text-muted-foreground text-xl">
          Upgrade to the Core plan or above to unlock AI-powered presentations and PowerPoint exports.
        </p>
        <Link href="/subscriptions">
          <Button className="mt-8 h-14 px-8 rounded-2xl bg-primary text-white font-bold text-lg">
            View Plans
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in pb-12">
      {/* Header */}
      <div>
        <Link href="/explore" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to Explore
        </Link>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <MonitorPlay className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold font-serif" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
            Presentation Builder
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Transform any topic into a beautiful, slide-ready presentation outline in seconds.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
        <form onSubmit={generatePresentation} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Presentation Topic</label>
              <Input 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The Future of Artificial Intelligence" 
                className="w-full h-14 text-lg rounded-2xl bg-background/50 border-muted-foreground/20 focus-visible:ring-cyan-500"
                disabled={loading}
              />
            </div>
            
            <div className="w-full md:w-32">
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Slides</label>
              <Input 
                type="number"
                min={3}
                max={15}
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="w-full h-14 text-lg rounded-2xl bg-background/50 border-muted-foreground/20 focus-visible:ring-cyan-500"
                disabled={loading}
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || !topic.trim()} 
              className="w-full md:w-auto h-14 px-8 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-lg shadow-lg shadow-cyan-500/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Build"}
            </Button>
          </div>
          <Textarea 
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="Extra details/passage (Optional). e.g., 'Make sure to mention machine learning and neural networks...'"
            className="min-h-[100px] text-base rounded-2xl bg-background/50 border-muted-foreground/20 focus-visible:ring-cyan-500 resize-y"
            disabled={loading}
          />
        </form>
        {error && <p className="text-red-500 mt-4 text-sm font-medium">{error}</p>}
      </div>

      {/* Results Section */}
      {slides.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
          
          {/* Slide Deck Container */}
          <div className="relative aspect-video w-full max-w-4xl mx-auto bg-gradient-to-br from-background to-muted border rounded-3xl shadow-2xl overflow-hidden flex flex-col group">
            
            {/* Top Bar */}
            <div className="h-12 border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <LayoutTemplate className="w-4 h-4" />
                <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/20" />
                <span className="w-3 h-3 rounded-full bg-amber-500/20" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/20" />
              </div>
            </div>

            {/* Slide Content */}
            <div className="flex-1 flex flex-col justify-center px-12 md:px-24 py-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
              
              <div className="relative z-10 space-y-8 animate-in slide-in-from-right-8 fade-in" key={currentSlideIndex}>
                <h2 className="text-3xl md:text-5xl font-bold font-serif leading-tight text-foreground" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
                  {slides[currentSlideIndex].title}
                </h2>
                
                <ul className="space-y-4">
                  {slides[currentSlideIndex].bulletPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-4 text-lg md:text-xl text-muted-foreground leading-relaxed">
                      <span className="mt-2 w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Navigation Buttons */}
            <Button 
              variant="outline"
              size="icon"
              onClick={prevSlide}
              disabled={currentSlideIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 bg-background/80 backdrop-blur-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <Button 
              variant="outline"
              size="icon"
              onClick={nextSlide}
              disabled={currentSlideIndex === slides.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 bg-background/80 backdrop-blur-sm"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>

          {/* Slide Navigation Dots */}
          <div className="flex justify-center gap-2">
            {slides.map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentSlideIndex(i)}
                className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  i === currentSlideIndex ? "bg-cyan-500 w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          <div className="flex justify-center mt-6">
            <Button onClick={downloadPptx} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg">
              Download PowerPoint (.pptx)
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}
