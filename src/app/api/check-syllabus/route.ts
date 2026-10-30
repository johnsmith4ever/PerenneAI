import { mistralProvider } from "@/lib/mistral-fallback";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { embed } from "ai";
import { supabase } from "@/lib/supabase";

function normalizeLevel(level?: string | null): string | null {
  if (!level) return null;
  const l = String(level).trim().toLowerCase();
  if (l.includes("a-level") || l.includes("a level") || l === "alevel") return "A-Level";
  if (l.includes("gcse")) return "GCSE";
  if (l.includes("as")) return "AS";
  return null;
}

function normalizeSubject(subject?: string | null): string | null {
  if (!subject) return null;
  const s = String(subject).trim().toLowerCase();
  if (s === "biology" || s.startsWith("bio")) return "Biology";
  if (s === "chemistry" || s.startsWith("chem")) return "Chemistry";
  if (s === "physics" || s.startsWith("phys")) return "Physics";
  if (s === "mathematics" || s === "maths" || s === "math") return "Mathematics";
  if (s === "geography" || s.startsWith("geog")) return "Geography";
  return String(subject).trim();
}

function normalizeTopicQuery(raw: string): string {
  let t = raw.trim();
  // Common student misspellings & variations in science topics
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
    const { topic, subject, curriculumLevel } = await req.json();

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json({ found: false, existsInAqa: false, error: "Missing topic" }, { status: 400 });
    }

    const normTopic = normalizeTopicQuery(topic);

    const { embedding } = await embed({
      model: mistralProvider.textEmbeddingModel("mistral-embed"),
      value: normTopic,
    });

    const normSubject = normalizeSubject(subject);
    const normLevel = normalizeLevel(curriculumLevel);
    // Authentic 2-3 word science topics score between 0.74 - 0.92; non-syllabus/noise scores <= 0.72
    const threshold = 0.735;

    // 1. Check if the topic matches the chosen subject (and level if available)
    if (normSubject) {
      const { data: subjectSpecs, error: subjectErr } = await supabase.rpc("match_aqa_specs", {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: 5,
        filter_subject: normSubject,
        filter_level: normLevel
      });

      if (!subjectErr && subjectSpecs && subjectSpecs.length > 0) {
        return NextResponse.json({
          found: true,
          existsInAqa: true,
          isSubjectMatch: true,
          matchedSubject: normSubject,
          matches: subjectSpecs.length
        });
      }

      // If level was specified, try subject without level constraint
      if (normLevel) {
        const { data: subjectAnyLevelSpecs } = await supabase.rpc("match_aqa_specs", {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: 5,
          filter_subject: normSubject,
          filter_level: null
        });

        if (subjectAnyLevelSpecs && subjectAnyLevelSpecs.length > 0) {
          return NextResponse.json({
            found: true,
            existsInAqa: true,
            isSubjectMatch: true,
            matchedSubject: normSubject,
            matches: subjectAnyLevelSpecs.length
          });
        }
      }
    }

    // 2. Check globally across ALL AQA subjects to see if it exists in the database
    const { data: allSpecs, error: allErr } = await supabase.rpc("match_aqa_specs", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 5,
      filter_subject: null,
      filter_level: null
    });

    if (!allErr && allSpecs && allSpecs.length > 0) {
      // If any of the returned specs specifically mentions words from the topic in that subject, prefer it
      const topicWords = normTopic.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
      let bestSpec = allSpecs[0];
      for (const spec of allSpecs) {
        const text = (spec.content || "").toLowerCase();
        if (topicWords.some(w => text.includes(w))) {
          bestSpec = spec;
          break;
        }
      }

      const matchedSubject = bestSpec.subject;
      const isMatch = normSubject ? matchedSubject.toLowerCase() === normSubject.toLowerCase() : true;
      return NextResponse.json({
        found: isMatch,
        existsInAqa: true,
        isSubjectMatch: isMatch,
        matchedSubject,
        matches: allSpecs.length
      });
    }

    // 3. Not found anywhere in the AQA syllabus
    return NextResponse.json({
      found: false,
      existsInAqa: false,
      isSubjectMatch: false
    });

  } catch (error: any) {
    console.error("Syllabus check failure:", error);
    return NextResponse.json({ found: false, existsInAqa: false, error: error.message }, { status: 500 });
  }
}
