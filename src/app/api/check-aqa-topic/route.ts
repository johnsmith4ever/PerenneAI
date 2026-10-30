import { mistralProvider } from "@/lib/mistral-fallback";
import { NextResponse } from "next/server";
import { embed } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    const { topic, subject } = await req.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ status: "error", message: "Topic is required" }, { status: 400 });
    }

    
    
    let embedding: number[] | null = null;
    try {
      const res = await embed({
        model: mistralProvider.textEmbeddingModel("mistral-embed"),
        value: topic,
      });
      embedding = res.embedding;
    } catch (embErr) {
      console.warn("Embedding check failed, permitting topic:", embErr);
      return NextResponse.json({ status: "success", exists: true });
    }
    
    const dbSubject = subject === "Maths" ? "Mathematics" : subject;
    const threshold = 0.40;

    // Check if this topic matches the specified AQA subject
    const { data: specs, error: specError } = await supabase.rpc("match_aqa_specs", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 5,
      filter_subject: dbSubject || null,
      filter_level: null
    });

    if (specError) {
      console.error("AQA check error:", specError);
      return NextResponse.json({ status: "success", exists: true });
    }

    const exists = specs && specs.length > 0;

    return NextResponse.json({ 
      status: "success", 
      exists: Boolean(exists), 
      debug_subject: subject, 
      debug_specs_length: specs ? specs.length : 0
    });
  } catch (error: any) {
    console.error("Check AQA Topic Error:", error);
    return NextResponse.json({ status: "success", exists: true });
  }
}
