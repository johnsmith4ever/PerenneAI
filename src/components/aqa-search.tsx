"use client";

import { useState } from "react";
import { Search, Loader2, Book, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AqaTextbookSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch("/api/search-aqa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (data.status === "success") {
        setResults(data.results);
      } else {
        setResults([]);
        console.error(data.message);
      }
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <Book className="w-48 h-48 text-blue-500 transform rotate-12" />
      </div>
      
      <div className="relative z-10 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-bold uppercase tracking-wider mb-3">
            <Book className="w-4 h-4" /> Official AQA Database
          </div>
          <h2 className="text-2xl font-bold font-serif text-white">Search AQA Textbooks & Syllabus</h2>
          <p className="text-slate-400 mt-1">Directly query our verified vector database of AQA specifications to find exactly what you need to know.</p>
        </div>

        <div className="flex items-center gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text"
              placeholder="e.g. Describe the process of mitosis..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button size="lg" className="rounded-2xl px-8 h-[58px] bg-blue-600 hover:bg-blue-500 text-white font-bold" onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search Specs"}
          </Button>
        </div>

        {hasSearched && (
          <div className="mt-8 space-y-4 max-w-4xl">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : results.length > 0 ? (
              <div className="grid gap-4">
                {results.map((r, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {r.subject} {r.level}
                      </span>
                      <span className="text-sm font-medium text-slate-400">Topic {r.topic_code}</span>
                      <span className="ml-auto text-xs font-medium text-emerald-400">{(r.similarity * 100).toFixed(1)}% Match</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-serif whitespace-pre-wrap">{r.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center">
                <AlertCircle className="w-10 h-10 text-slate-500 mb-3" />
                <p className="text-slate-400 font-medium">No direct AQA specification matches found.</p>
                <p className="text-sm text-slate-500 mt-1">Try rewording your query or searching for broader topics.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
