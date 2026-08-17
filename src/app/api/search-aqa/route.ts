import { NextResponse } from "next/server";
import { embed } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    const { query, subject } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ status: "error", message: "Query is required" }, { status: 400 });
    }

    const mistralProvider = createMistral({ apiKey: process.env.MISTRAL_API_KEY_2 });
    
    const { embedding } = await embed({
      model: mistralProvider.textEmbeddingModel("mistral-embed"),
      value: query,
    });
    const threshold = subject === "Mathematics" || subject === "Maths" ? 0.70 : 0.70;
    const dbSubject = subject === "Maths" ? "Mathematics" : subject;
    
    // We check if this query matches ANY AQA subject
    const { data: specs, error: specError } = await supabase.rpc("match_aqa_specs", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 5,
      filter_subject: dbSubject || null,
      filter_level: null
    });

    if (specError) {
      console.error("AQA search error:", specError);
      return NextResponse.json({ status: "error", message: specError.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", results: specs || [] });
  } catch (error: any) {
    console.error("Search AQA Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
