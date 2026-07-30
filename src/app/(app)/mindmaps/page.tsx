"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Trash2, ZoomIn, ZoomOut, Maximize, Bot, Loader2,
  Sparkles, Network, X, RotateCcw, ChevronRight, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useSubscription, ModelType, TIER_RANK } from "@/hooks/use-subscription";
import { useClerk } from "@clerk/nextjs";

// ─── Types ────────────────────────────────────────────────────────────────────

type MindmapNode = {
  id: string;
  text: string;
  children: MindmapNode[];
};

type AnalysisSection = {
  heading: string;
  points: string[];
};

type Analysis = {
  title: string;
  mainTheme: string;
  sections: AnalysisSection[];
};

// ─── Canvas constants ─────────────────────────────────────────────────────────

const CANVAS_SIZE = 5000;
const CANVAS_CX = CANVAS_SIZE / 2;   // 2500
const CANVAS_CY = CANVAS_SIZE / 2;   // 2500

// Radial distance from a node's center to its children
const RADII: Record<number, number> = { 1: 220, 2: 380, 3: 520, 4: 650 };
const radiusAt = (depth: number) => RADII[depth] ?? 650 + (depth - 4) * 130;

// Approx half-dimensions of each node (for line termination)
const NODE_HW: Record<string, number> = { root: 82, mid: 68, leaf: 56 };
const NODE_HH: Record<string, number> = { root: 22, mid: 18, leaf: 15 };

function nodeSize(depth: number) {
  if (depth === 0) return { hw: NODE_HW.root, hh: NODE_HH.root };
  if (depth <= 2) return { hw: NODE_HW.mid, hh: NODE_HH.mid };
  return { hw: NODE_HW.leaf, hh: NODE_HH.leaf };
}

/** Intersection of a ray from (cx,cy) in direction (dx,dy) with an axis-aligned rounded rect */
function edgePoint(cx: number, cy: number, dx: number, dy: number, hw: number, hh: number) {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx === 0 && ady === 0) return { x: cx, y: cy };
  const t = adx * hh > ady * hw ? hw / adx : hh / ady;
  return { x: cx + dx * t, y: cy + dy * t };
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function computeLayout(root: MindmapNode): Map<string, { x: number; y: number; depth: number }> {
  const map = new Map<string, { x: number; y: number; depth: number }>();
  map.set(root.id, { x: CANVAS_CX, y: CANVAS_CY, depth: 0 });

  function place(node: MindmapNode, px: number, py: number, startA: number, sweepA: number, depth: number) {
    if (!node.children.length) return;
    const n = node.children.length;
    const r = radiusAt(depth);
    node.children.forEach((child, i) => {
      const angle = startA + (i + 0.5) * (sweepA / n);
      const x = px + r * Math.cos(angle);
      const y = py + r * Math.sin(angle);
      map.set(child.id, { x, y, depth });
      const childSweep = sweepA / n;
      place(child, x, y, startA + i * childSweep, childSweep, depth + 1);
    });
  }

  place(root, CANVAS_CX, CANVAS_CY, 0, Math.PI * 2, 1);
  return map;
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

const genId = () => `n_${Math.random().toString(36).substr(2, 9)}`;
const DEFAULT_ROOT: MindmapNode = { id: "root_default", text: "Central Idea", children: [] };

function addChildTo(root: MindmapNode, parentId: string): MindmapNode {
  const newNode: MindmapNode = { id: genId(), text: "", children: [] };
  const ins = (n: MindmapNode): MindmapNode =>
    n.id === parentId ? { ...n, children: [...n.children, newNode] } : { ...n, children: n.children.map(ins) };
  return ins(root);
}

function setText(root: MindmapNode, id: string, text: string): MindmapNode {
  if (root.id === id) return { ...root, text };
  return { ...root, children: root.children.map(c => setText(c, id, text)) };
}

function removeNode(root: MindmapNode, id: string): MindmapNode {
  return { ...root, children: root.children.filter(c => c.id !== id).map(c => removeNode(c, id)) };
}

function flattenNodes(node: MindmapNode): MindmapNode[] {
  return [node, ...node.children.flatMap(flattenNodes)];
}

// ─── Depth-based colour palette ───────────────────────────────────────────────

const PALETTE = [
  { border: "border-primary",         bg: "bg-primary",                        text: "text-white" },
  { border: "border-violet-400",      bg: "bg-violet-50 dark:bg-violet-900/40",  text: "text-violet-900 dark:text-violet-100" },
  { border: "border-sky-400",         bg: "bg-sky-50 dark:bg-sky-900/40",        text: "text-sky-900 dark:text-sky-100" },
  { border: "border-emerald-400",     bg: "bg-emerald-50 dark:bg-emerald-900/40",text: "text-emerald-900 dark:text-emerald-100" },
  { border: "border-orange-400",      bg: "bg-orange-50 dark:bg-orange-900/40",  text: "text-orange-900 dark:text-orange-100" },
];

const LINE_COLORS = ["#a78bfa", "#38bdf8", "#34d399", "#fb923c", "#f472b6"];

function palette(depth: number) {
  return PALETTE[Math.min(depth, PALETTE.length - 1)];
}

// ─── Main component ───────────────────────────────────────────────────────────

  export default function MindmapsPage() {
  const { deductCredits, creditsUsed, dailyLimit, canAfford, tier, isLoaded: subLoaded } = useSubscription();
  const { openUserProfile } = useClerk();

  const [root, setRoot, rootLoaded] = usePersistentState<MindmapNode>("mindmaps_root_v4", DEFAULT_ROOT);
  const [zoom, setZoom] = useState(0.65);
  const [panelOpen, setPanelOpen] = useState(true);

  // Analysis
  const [analysisInput, setAnalysisInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);

  // Canvas panning
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ sx: 0, sy: 0, scrollX: 0, scrollY: 0 });

  // Layout
  const layout = useMemo(() => computeLayout(root), [root]);
  const allNodes = useMemo(() => flattenNodes(root), [root]);

  // Credits display
  const safeUsed = creditsUsed ?? 0;
  const rawPct = subLoaded ? Math.min(100, (safeUsed / dailyLimit) * 100) : 0;

  // ── Center canvas when page loads ──────────────────────────────────────────
  const centerCanvas = useCallback(() => {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        const { clientWidth: cw, clientHeight: ch } = containerRef.current;
        containerRef.current.scrollLeft = CANVAS_CX * zoom - cw / 2;
        containerRef.current.scrollTop  = CANVAS_CY * zoom - ch / 2;
      }
    });
  }, [zoom]);

  // Center on first real load
  useEffect(() => {
    if (rootLoaded) {
      // Small delay to ensure DOM is painted
      const t = setTimeout(centerCanvas, 80);
      return () => clearTimeout(t);
    }
  }, [rootLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tree operations ────────────────────────────────────────────────────────
  const addChild  = useCallback((id: string) => setRoot(r => addChildTo(r, id)), [setRoot]);
  const updateText = useCallback((id: string, t: string) => setRoot(r => setText(r, id, t)), [setRoot]);
  const deleteNode = useCallback((id: string) => setRoot(r => removeNode(r, id)), [setRoot]);
  const resetMap   = () => { if (confirm("Clear the current mindmap?")) setRoot({ id: genId(), text: "Central Idea", children: [] }); };

  // ── Pan ────────────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".mm-node")) return;
    setIsDragging(true);
    dragRef.current = {
      sx: e.clientX, sy: e.clientY,
      scrollX: containerRef.current?.scrollLeft ?? 0,
      scrollY: containerRef.current?.scrollTop  ?? 0,
    };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    containerRef.current.scrollLeft = dragRef.current.scrollX - (e.clientX - dragRef.current.sx);
    containerRef.current.scrollTop  = dragRef.current.scrollY - (e.clientY - dragRef.current.sy);
  };
  const onMouseUp = () => setIsDragging(false);

  // ── DeepSeek analysis ──────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!analysisInput.trim()) return;
    if (TIER_RANK[tier] < TIER_RANK["Core"]) {
      alert("DeepSeek analysis requires the Core plan or higher.");
      openUserProfile();
      return;
    }
    const model: ModelType = "Apollo V4 Flash";
    setIsAnalyzing(true);
    try {
      const res  = await fetch("/api/analyze-topic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: analysisInput }) });
      const data = await res.json();
      if (data.status === "success") {
        if (data.usage) deductCredits(data.usage.promptTokens ?? data.usage.inputTokens, data.usage.completionTokens ?? data.usage.outputTokens, model, "other");
        setAnalysis(data.data);
      } else { alert("Error: " + data.message); }
    } catch { alert("Failed to analyse."); }
    finally { setIsAnalyzing(false); }
  };

  // ── Build manually ─────────────────────────────────────────────────────────
  const buildManually = () => {
    if (!analysis) return;
    setRoot({
      id: genId(), text: analysis.title,
      children: analysis.sections.map(s => ({
        id: genId(), text: s.heading,
        children: s.points.map(p => ({ id: genId(), text: p, children: [] })),
      })),
    });
  };

  // ── Auto-build with Gemini ─────────────────────────────────────────────────
  const buildWithGemini = async () => {
    if (!analysis) return;
    if (TIER_RANK[tier] < TIER_RANK["Pro"]) {
      alert("Auto-build with Gemini requires the Pro plan or higher.");
      openUserProfile();
      return;
    }
    const model: ModelType = "Bastion 3.5 Flash";
    const structured = `Title: ${analysis.title}\nTheme: ${analysis.mainTheme}\n\n` +
      analysis.sections.map(s => `Section: ${s.heading}\n${s.points.map(p => `- ${p}`).join("\n")}`).join("\n\n");
    setIsBuilding(true);
    try {
      const res  = await fetch("/api/generate-mindmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: structured }) });
      const data = await res.json();
      if (data.status === "success") {
        if (data.usage) deductCredits(data.usage.promptTokens ?? data.usage.inputTokens, data.usage.completionTokens ?? data.usage.outputTokens, model, "other");
        if (data.data) setRoot(data.data);
      } else { alert("Error: " + data.message); }
    } catch { alert("Failed to build with Gemini."); }
    finally { setIsBuilding(false); }
  };

  // ── SVG line renderer ──────────────────────────────────────────────────────
  const lines = useMemo(() => {
    const result: React.ReactNode[] = [];

    function drawEdges(node: MindmapNode, depth: number) {
      const pp = layout.get(node.id);
      if (!pp) return;

      node.children.forEach(child => {
        const cp = layout.get(child.id);
        if (!cp) return;

        const dx = cp.x - pp.x;
        const dy = cp.y - pp.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / len;
        const ny = dy / len;

        // Start: edge of parent node
        const { hw: phw, hh: phh } = nodeSize(depth);
        const src = edgePoint(pp.x, pp.y, nx, ny, phw, phh);

        // End: edge of child node
        const { hw: chw, hh: chh } = nodeSize(depth + 1);
        const dst = edgePoint(cp.x, cp.y, -nx, -ny, chw, chh);

        // Bezier control points — pull 30% of edge length along the direction
        const pull = len * 0.28;
        const cp1 = { x: src.x + nx * pull, y: src.y + ny * pull };
        const cp2 = { x: dst.x - nx * pull, y: dst.y - ny * pull };

        const stroke = LINE_COLORS[(depth - 1) % LINE_COLORS.length];

        result.push(
          <path
            key={`${node.id}→${child.id}`}
            d={`M ${src.x} ${src.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${dst.x} ${dst.y}`}
            stroke={stroke}
            strokeWidth={depth === 1 ? 2.2 : 1.6}
            strokeLinecap="round"
            fill="none"
            opacity={0.6}
          />
        );
        drawEdges(child, depth + 1);
      });
    }

    drawEdges(root, 1);
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // ── Zoom with viewport centering ───────────────────────────────────────────
  const handleZoom = (newZoom: number) => {
    if (!containerRef.current) {
      setZoom(newZoom);
      return;
    }
    const el = containerRef.current;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    // Current center point in unscaled canvas coordinates
    const cx = (el.scrollLeft + cw / 2) / zoom;
    const cy = (el.scrollTop + ch / 2) / zoom;
    
    setZoom(newZoom);
    
    requestAnimationFrame(() => {
      if (containerRef.current) {
        // Adjust scroll so that (cx, cy) remains at the center of the viewport
        containerRef.current.scrollLeft = cx * newZoom - cw / 2;
        containerRef.current.scrollTop = cy * newZoom - ch / 2;
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-2rem)] w-full overflow-hidden">

      {/* ══════════ LEFT PANEL ══════════ */}
      <div
        className={cn(
          "shrink-0 border-r border-border flex flex-col bg-card overflow-hidden transition-all duration-300 ease-in-out",
          panelOpen ? "w-[360px]" : "w-0 border-r-0"
        )}
      >
        <div className="w-[360px] flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-border shrink-0 flex items-start justify-between">
            <div>
              <p className="label-title mb-1" style={{ fontFamily: "var(--font-inter), sans-serif" }}>Visual Organiser</p>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-merriweather), serif" }}>Mindmaps</h1>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed pr-4">DeepSeek reasons through your topic. You build the map — or let Gemini do it.</p>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* Input */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Topic or raw notes</label>
              <textarea
                value={analysisInput}
                onChange={e => setAnalysisInput(e.target.value)}
                className="w-full h-28 rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted-foreground/60"
                placeholder="e.g. 'Climate change', 'The French Revolution', or paste a block of notes..."
              />
              <Button className="w-full gap-2" onClick={handleAnalyze} disabled={isAnalyzing || !analysisInput.trim()}>
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isAnalyzing ? "Analysing…" : "Analyse with DeepSeek"}
              </Button>
            </div>

            {/* Analysis Output */}
            {analysis && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                {/* Title */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Main Topic</p>
                  <input value={analysis.title} onChange={e => setAnalysis(a => a ? { ...a, title: e.target.value } : a)} className="w-full bg-transparent text-sm font-bold text-foreground focus:outline-none" placeholder="Topic title…" />
                  <input value={analysis.mainTheme} onChange={e => setAnalysis(a => a ? { ...a, mainTheme: e.target.value } : a)} className="w-full bg-transparent text-xs text-muted-foreground mt-1 focus:outline-none" placeholder="Main theme…" />
                </div>

                {/* Sections */}
                {analysis.sections.map((sec, si) => (
                  <div key={si} className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
                      <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <input
                        value={sec.heading}
                        onChange={e => setAnalysis(a => { if (!a) return a; const s = [...a.sections]; s[si] = { ...s[si], heading: e.target.value }; return { ...a, sections: s }; })}
                        className="flex-1 bg-transparent text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none min-w-0"
                      />
                      <button onClick={() => setAnalysis(a => a ? { ...a, sections: a.sections.filter((_, i) => i !== si) } : a)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 transition-colors shrink-0"><X size={11} /></button>
                    </div>
                    <div className="p-2.5 space-y-1">
                      {sec.points.map((pt, pi) => (
                        <div key={pi} className="flex items-center gap-1.5 group/pt">
                          <span className="text-primary text-xs shrink-0">•</span>
                          <input
                            value={pt}
                            onChange={e => setAnalysis(a => { if (!a) return a; const s = [...a.sections]; const pts = [...s[si].points]; pts[pi] = e.target.value; s[si] = { ...s[si], points: pts }; return { ...a, sections: s }; })}
                            className="flex-1 bg-transparent text-xs text-foreground focus:outline-none py-0.5 min-w-0"
                          />
                          <button onClick={() => setAnalysis(a => { if (!a) return a; const s = [...a.sections]; s[si] = { ...s[si], points: s[si].points.filter((_, i) => i !== pi) }; return { ...a, sections: s }; })} className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-red-500 opacity-0 group-hover/pt:opacity-100 transition-all shrink-0"><X size={9} /></button>
                        </div>
                      ))}
                      <button onClick={() => setAnalysis(a => { if (!a) return a; const s = [...a.sections]; s[si] = { ...s[si], points: [...s[si].points, ""] }; return { ...a, sections: s }; })} className="text-[10px] text-primary hover:underline pl-3.5 mt-0.5 block">+ Add point</button>
                    </div>
                  </div>
                ))}

                <button onClick={() => setAnalysis(a => a ? { ...a, sections: [...a.sections, { heading: "New Section", points: [""] }] } : a)} className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl px-3 py-2 w-full flex items-center gap-2 transition-colors hover:bg-muted/30"><Plus size={12} />Add Section</button>

                {/* Build Buttons */}
                <div className="space-y-2 pt-1">
                  <Button variant="outline" className="w-full gap-2" onClick={buildManually}><Network size={14} />Build Map Manually</Button>
                  <Button className="w-full gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md" onClick={buildWithGemini} disabled={isBuilding}>
                    {isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot size={14} />}
                    {isBuilding ? "Building…" : "Auto-Build with Gemini"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Usage bar */}
          <div className="px-4 py-3 border-t border-border shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Daily Credits</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{subLoaded ? `${safeUsed.toLocaleString()} / ${dailyLimit.toLocaleString()}` : "Loading…"}</p>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className={cn("h-1.5 rounded-full transition-all", rawPct > 90 ? "bg-red-500" : "bg-primary")} style={{ width: `${rawPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-background">

        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-50 flex items-center gap-1.5 bg-card/90 backdrop-blur-md px-2 py-1.5 rounded-2xl border border-border shadow-lg">
          {/* Panel toggle */}
          <button onClick={() => setPanelOpen(p => !p)} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" title={panelOpen ? "Close panel" : "Open panel"}>
            {panelOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <button onClick={() => handleZoom(Math.max(0.2, parseFloat((zoom - 0.1).toFixed(1))))} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"><ZoomOut size={16} /></button>
          <span className="text-xs font-medium w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => handleZoom(Math.min(2, parseFloat((zoom + 0.1).toFixed(1))))} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"><ZoomIn size={16} /></button>
          <button onClick={() => { handleZoom(0.65); setTimeout(centerCanvas, 50); }} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" title="Reset & re-centre"><Maximize size={14} /></button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <button onClick={resetMap} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors" title="New map"><RotateCcw size={14} /></button>
        </div>

        {/* Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <p className="text-[10px] text-muted-foreground/60 bg-card/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/40">
            Hover node → <strong>+</strong> add branch · click to edit · drag canvas to pan
          </p>
        </div>

        {/* Scrollable Canvas */}
        <div
          ref={containerRef}
          className={cn("w-full h-full overflow-auto", isDragging ? "cursor-grabbing" : "cursor-grab")}
          style={{ scrollbarWidth: "none" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Scaled canvas */}
          <div
            className="relative"
            style={{
              width:  `${CANVAS_SIZE}px`,
              height: `${CANVAS_SIZE}px`,
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {/* Dot-grid */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.18]" style={{ zIndex: 0 }}>
              <defs>
                <pattern id="mmgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="currentColor" className="text-border" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mmgrid)" />
            </svg>

            {/* Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {lines}
            </svg>

            {/* Nodes */}
            <div className="absolute inset-0" style={{ zIndex: 2 }}>
              {allNodes.map(node => {
                const pos = layout.get(node.id);
                if (!pos) return null;
                return (
                  <MindmapNodeCard
                    key={node.id}
                    node={node}
                    x={pos.x}
                    y={pos.y}
                    depth={pos.depth}
                    isRoot={node.id === root.id}
                    onAdd={addChild}
                    onUpdate={updateText}
                    onDelete={node.id === root.id ? undefined : deleteNode}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Node Card ────────────────────────────────────────────────────────────────

function MindmapNodeCard({ node, x, y, depth, isRoot, onAdd, onUpdate, onDelete }: {
  node: MindmapNode; x: number; y: number; depth: number; isRoot: boolean;
  onAdd: (id: string) => void; onUpdate: (id: string, t: string) => void; onDelete?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(node.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setLocal(node.text); }, [node.text]);

  const commit = () => { onUpdate(node.id, local.trim()); setEditing(false); };
  const startEdit = () => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); };

  const { border, bg, text: textColor } = palette(depth);

  // Width scales with depth
  const w = isRoot ? 164 : depth <= 1 ? 144 : 120;

  return (
    <div
      className="mm-node absolute group"
      style={{ left: `${x}px`, top: `${y}px`, transform: "translate(-50%, -50%)", width: `${w}px`, zIndex: editing ? 200 : 10 }}
    >
      {/* Bubble */}
      <div
        className={cn("relative rounded-2xl border-2 px-3 shadow-md cursor-pointer select-none transition-all hover:shadow-lg hover:brightness-105 active:scale-95", border, bg)}
        style={{ minHeight: isRoot ? 44 : 32 }}
        onClick={startEdit}
      >
        {editing ? (
          <textarea
            ref={inputRef}
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setLocal(node.text); setEditing(false); }
            }}
            className={cn("w-full bg-transparent border-none focus:outline-none resize-none leading-snug text-center py-2", isRoot ? "text-sm font-bold" : depth <= 1 ? "text-xs font-semibold" : "text-[11px] font-medium", textColor)}
            rows={2}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p className={cn("text-center break-words leading-snug py-2", isRoot ? "text-sm font-bold" : depth <= 1 ? "text-xs font-semibold" : "text-[11px] font-medium", textColor)}>
            {node.text || <span className="opacity-40 italic font-normal">edit…</span>}
          </p>
        )}
      </div>

      {/* Floating actions */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-20">
        <button
          onMouseDown={e => { e.stopPropagation(); onAdd(node.id); }}
          className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
          title="Add branch"
        >
          <Plus size={12} />
        </button>
        {onDelete && (
          <button
            onMouseDown={e => { e.stopPropagation(); onDelete(node.id); }}
            className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
            title="Delete"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
