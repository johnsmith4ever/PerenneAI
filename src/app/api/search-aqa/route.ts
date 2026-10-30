import { mistralProvider } from "@/lib/mistral-fallback";
import { NextResponse } from "next/server";
import { embed } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

/** Returns true for any error that means the DB/network is unavailable */
function isDbUnavailable(msg?: string, details?: string): boolean {
  const text = `${msg ?? ""} ${details ?? ""}`;
  return (
    text.includes("fetch failed") ||
    text.includes("ENOTFOUND") ||
    text.includes("ECONNREFUSED") ||
    text.includes("521") ||
    text.includes("Web server is down") ||
    text.trimStart().startsWith("<!") // raw HTML response (e.g. Cloudflare 521 page)
  );
}

function normalizeTopicQuery(raw: string): string {
  let t = raw.trim();
  const replacements: [RegExp, string][] = [
    [/\bkerbs?\s+cycle\b/gi, "krebs cycle"],
    [/\bkerbs?\b/gi, "krebs cycle"],
    [/\bkrebb?s\s+cycle\b/gi, "krebs cycle"],
    [/\bkrebs\b/gi, "krebs cycle"],
    [/\bcalven\s+cycle\b/gi, "calvin cycle"],
    [/\bphotosyn[a-z]*\b/gi, "photosynthesis"],
    [/\bresperat[a-z]*\b/gi, "respiration"],
    [/\bhomeosta[a-z]*\b/gi, "homeostasis"],
    [/\belectroly[a-z]*\b/gi, "electrolysis"],
    [/\bmitosiss\b/gi, "mitosis"],
    [/\bmeoisis\b/gi, "meiosis"],
    [/\bcalcuim\b/gi, "calcium"],
    [/\bdistilation\b/gi, "distillation"],
    [/\bchromatogrophy\b/gi, "chromatography"],
    [/\bendotherme?ic\b/gi, "endothermic"],
    [/\bexotherme?ic\b/gi, "exothermic"],
  ];
  for (const [pattern, repl] of replacements) {
    if (pattern.test(t)) {
      t = t.replace(pattern, repl);
    }
  }
  return t;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    const { query, subject, level } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ status: "error", message: "Query is required" }, { status: 400 });
    }

    const normQuery = normalizeTopicQuery(query);

    // Attempt to get embedding; gracefully return empty results if Mistral is unavailable/unauthorised
    let embedding: number[];
    try {
      const res = await embed({
        model: mistralProvider.textEmbeddingModel("mistral-embed"),
        value: normQuery,
      });
      embedding = res.embedding;
    } catch (embErr: any) {
      console.warn("AQA search: embedding failed, returning empty results:", embErr?.message?.slice(0, 100));
      return NextResponse.json({ status: "success", results: [] });
    }

    // Calibrated threshold: authentic syllabus matches score 0.74 - 0.92,
    // while irrelevant phrases (e.g. "I like balls") score <= 0.72.
    const threshold = 0.735;
    const dbSubject = subject === "Maths" ? "Mathematics" : subject;

    const { data: specs, error: specError } = await supabase.rpc("match_aqa_specs", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 15,
      filter_subject: dbSubject || null,
      filter_level: level || null
    });

    if (specError) {
      const unavailable = isDbUnavailable(specError.message, specError.details);
      console.error("AQA search error:", specError.message?.slice(0, 200));
      return NextResponse.json(
        {
          status: "error",
          message: unavailable
            ? "The database is currently unavailable. Please try again in a few minutes."
            : specError.message,
        },
        { status: unavailable ? 503 : 500 }
      );
    }

    // Deduplicate results by subject, level, and content prefix
    const seen = new Set<string>();
    const uniqueResults: any[] = [];
    for (const item of (specs || [])) {
      const key = `${item.subject}_${item.level}_${(item.content || "").slice(0, 60).toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(item);
      }
      if (uniqueResults.length >= 6) break;
    }

    return NextResponse.json({ status: "success", results: uniqueResults });
  } catch (error: any) {
    const cause = error?.cause?.message || error?.cause?.code || "";
    const unavailable = isDbUnavailable(error.message, cause);
    console.error("Search AQA Error:", error.message?.slice(0, 200), cause ? `| Cause: ${cause}` : "");
    return NextResponse.json(
      {
        status: "error",
        message: unavailable
          ? "The database is currently unavailable. Please try again in a few minutes."
          : error.message,
      },
      { status: unavailable ? 503 : 500 }
    );
  }
}
