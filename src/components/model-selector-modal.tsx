"use client";

import { X, Cpu, Layers, Sparkles, Scale, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelType } from "@/hooks/use-subscription";
import { useModelPreferences, ModelCategory } from "@/hooks/use-model-preferences";
import { cn } from "@/lib/utils";

const ALL_MODELS: (ModelType | "default")[] = [
  "default",
  "Gemini 3.6 Flash",
  "Gemini 3.5 Pro",
  "Deepseek-V4-Flash",
  "Deepseek-V4-Pro",
  "Claude 4.5 Haiku",
  "Claude 5 Pro",
  "GPT Luna",
  "GPT Terra"
];

export function ModelSelectorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { preferences, updatePreference } = useModelPreferences();

  if (!isOpen) return null;

  const categories: { id: ModelCategory; label: string; icon: any; defaultDesc: string }[] = [
    { id: "generation", label: "General Generation", icon: Sparkles, defaultDesc: "Uses your Tier's default engine" },
    { id: "heavy", label: "Question Generation", icon: Layers, defaultDesc: "Uses your Tier's default engine" },
    { id: "grading", label: "Grading & Marking", icon: Check, defaultDesc: "Uses your Tier's default engine" },
    { id: "judge", label: "Judgement", icon: Scale, defaultDesc: "Uses your Tier's default engine" }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 max-w-2xl w-full relative shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Cpu className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-black text-white tracking-tight">AI Engine Selector</h2>
            <p className="text-sm text-slate-400">Override the default AI engines for specific tasks.</p>
          </div>
        </div>

        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 rounded-lg">
                  <cat.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{cat.label}</h3>
                  <p className="text-xs text-slate-400">{cat.defaultDesc}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {ALL_MODELS.map((model) => {
                  const isSelected = preferences[cat.id] === model;
                  return (
                    <button
                      key={model}
                      onClick={() => updatePreference(cat.id, model)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-full transition-all border",
                        isSelected
                          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                          : "bg-black/40 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {model === "default" ? "Default" : model}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Button onClick={onClose} className="w-full bg-white text-black hover:bg-slate-200 py-6 font-bold rounded-xl">
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
