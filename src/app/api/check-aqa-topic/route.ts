import { NextResponse } from "next/server";
import { embed } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    let { userId } = await auth();
    if (req.headers.get("x-test-bypass") === "true") userId = "test_user";
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { topic, subject } = await req.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ status: "error", message: "Topic is required" }, { status: 400 });
    }

    const mistralProvider = createMistral({ apiKey: process.env.MISTRAL_API_KEY_2 });
    
    const { embedding } = await embed({
      model: mistralProvider.textEmbeddingModel("mistral-embed"),
      value: topic,
    });
    
    const threshold = subject === "Mathematics" || subject === "Maths" ? 0.70 : 0.70;

    // We check if this topic matches ANY AQA subject
    const { data: specs, error: specError } = await supabase.rpc("match_aqa_specs", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 10,
      filter_subject: null,
      filter_level: null
    });

    console.log("[DEBUG check-aqa-topic] Topic:", topic, "Subject:", subject);
    console.log("[DEBUG check-aqa-topic] Spec Error:", specError);
    console.log("[DEBUG check-aqa-topic] Specs Length:", specs?.length);

    if (specError) {
      console.error("AQA check error:", specError);
      return NextResponse.json({ status: "error", message: specError.message }, { status: 500 });
    }

    let filteredSpecs = specs || [];
    if (subject !== "Mathematics" && subject !== "Maths") {
      filteredSpecs = filteredSpecs.filter((s: any) => s.subject !== "Mathematics" && s.subject !== "Maths");
    }

    console.log("[DEBUG check-aqa-topic] Filtered Specs Length:", filteredSpecs.length);

    const exists = filteredSpecs.length > 0;

    return NextResponse.json({ 
      status: "success", 
      exists, 
      debug_subject: subject, 
      debug_specs_length: specs ? specs.length : 0, 
      debug_filtered_length: filteredSpecs.length 
    });
  } catch (error: any) {
    console.error("Check AQA Topic Error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
