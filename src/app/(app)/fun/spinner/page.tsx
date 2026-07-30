"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Trash2, Plus, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Vivid colors for the wheel segments
const COLORS = [
  "#f43f5e", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#d946ef", "#f472b6", "#14b8a6"
];

export default function EliminationSpinnerPage() {
  const [items, setItems] = useState<string[]>(["Maths", "Science", "History", "English"]);
  const [newItem, setNewItem] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [eliminated, setEliminated] = useState<string | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim() && !items.includes(newItem.trim())) {
      setItems([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  const handleRemove = (itemToRemove: string) => {
    setItems(items.filter(i => i !== itemToRemove));
  };

  const spin = () => {
    if (items.length < 2 || isSpinning) return;
    
    setIsSpinning(true);
    setEliminated(null);

    // Randomly select an item to eliminate
    const indexToEliminate = Math.floor(Math.random() * items.length);
    const itemToEliminate = items[indexToEliminate];

    // Calculate rotation to land on the chosen segment
    // Segment size in degrees = 360 / items.length
    // We want the chosen segment to land at the TOP (0 degrees).
    // The top pointer is at 0 deg. The chosen segment's center is at:
    // (index + 0.5) * (360 / items.length)
    // We need to rotate the wheel backwards by that amount, plus a few full spins.
    
    const segmentAngle = 360 / items.length;
    const targetAngle = (indexToEliminate * segmentAngle) + (segmentAngle / 2);
    
    // 5 full extra spins (1800 deg)
    const extraSpins = 360 * 5;
    // We rotate so that the target angle lands at 0 (top), meaning rotation = 360 - targetAngle
    const newRotation = rotation + extraSpins + (360 - targetAngle) - (rotation % 360);

    setRotation(newRotation);

    // Wait for animation to finish (e.g. 4 seconds)
    setTimeout(() => {
      setIsSpinning(false);
      setEliminated(itemToEliminate);
      
      // Delay before actually removing it to let them read the result
      setTimeout(() => {
        setItems(prev => prev.filter(i => i !== itemToEliminate));
        setEliminated(null);
      }, 2500);
      
    }, 4000);
  };

  // Build conic-gradient for the wheel
  const segmentPercentage = 100 / Math.max(1, items.length);
  const gradientStops = items.map((_, i) => {
    const color = COLORS[i % COLORS.length];
    return `${color} ${i * segmentPercentage}% ${(i + 1) * segmentPercentage}%`;
  }).join(", ");

  const conicStyle = items.length > 0 ? {
    background: `conic-gradient(${gradientStops})`,
    transform: `rotate(${rotation}deg)`,
    transition: "transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)"
  } : { background: "#333" };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/fun">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-serif" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
            Elimination Spinner
          </h1>
          <p className="text-sm text-muted-foreground">Spin the wheel to randomly eliminate options until one is left!</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Spinner UI */}
        <div className="relative flex flex-col items-center">
          {/* The Pointer */}
          <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-primary" />
          
          {/* The Wheel */}
          <div 
            ref={wheelRef}
            className="w-72 h-72 rounded-full border-4 border-border shadow-2xl relative overflow-hidden"
            style={conicStyle}
          >
            {/* Labels on the wheel */}
            {items.map((item, i) => {
              const rotation = (i * (360 / items.length)) + (360 / items.length) / 2;
              return (
                <div 
                  key={item + i} 
                  className="absolute w-full h-full left-0 top-0 flex justify-center items-start text-white font-bold drop-shadow-md text-sm pt-4"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <span className="w-24 text-center truncate">{item}</span>
                </div>
              );
            })}
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-background rounded-full border-4 border-border shadow-inner flex items-center justify-center">
              <RefreshCcw className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <Button 
            onClick={spin} 
            disabled={isSpinning || items.length < 2}
            className="mt-8 w-full max-w-[200px] h-12 text-lg font-bold rounded-xl"
            size="lg"
          >
            {isSpinning ? "Spinning..." : "SPIN!"}
          </Button>

          {/* Elimination Alert */}
          {eliminated && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 rounded-3xl animate-in fade-in zoom-in duration-300">
              <div className="bg-destructive text-destructive-foreground px-6 py-4 rounded-2xl shadow-2xl text-center transform scale-110">
                <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Eliminated</p>
                <h2 className="text-3xl font-black">{eliminated}</h2>
              </div>
            </div>
          )}
        </div>

        {/* List UI */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-bold text-lg mb-4 flex items-center justify-between">
            Options <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
          </h2>
          
          <form onSubmit={handleAdd} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newItem} 
              onChange={e => setNewItem(e.target.value)} 
              placeholder="Add new option..."
              className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button type="submit" size="icon" className="rounded-xl shrink-0" disabled={!newItem.trim()}>
              <Plus className="w-5 h-5" />
            </Button>
          </form>

          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No items left!</p>
            </div>
          ) : items.length === 1 ? (
            <div className="text-center py-8 bg-green-500/10 text-green-600 rounded-2xl border border-green-500/20">
              <p className="text-sm font-bold uppercase tracking-wider mb-2">Winner!</p>
              <p className="text-3xl font-black">{items[0]}</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide pr-2">
              {items.map((item, i) => (
                <li key={item + i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium text-sm truncate">{item}</span>
                  </div>
                  <button 
                    onClick={() => handleRemove(item)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
