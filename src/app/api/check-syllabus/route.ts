import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createMistral } from "@ai-sdk/mistral";
import { embed } from "ai";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const { topic, subject, curriculumLevel } = await req.json();

    if (!topic || !subject || !curriculumLevel) {
      return NextResponse.json({ found: false, error: "Missing parameters" }, { status: 400 });
    }

    const mistralProvider = createMistral({ apiKey: process.env.MISTRAL_API_KEY_2 });
    const { embedding } = await embed({
      model: mistralProvider.textEmbeddingModel("mistral-embed"),
      value: topic,
    });

    const threshold = subject === "Mathematics" || subject === "Maths" ? 0.70 : 0.70;

    const { data: specs, error: specError } = await supabase.rpc("match_aqa_specs", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 1,
      filter_subject: subject,
      filter_level: curriculumLevel
    });

    if (specError) {
      console.error("Syllabus check error:", specError);
      return NextResponse.json({ found: false, error: specError.message }, { status: 500 });
    }

    if (specs && specs.length > 0) {
      return NextResponse.json({ found: true });
    }

    return NextResponse.json({ found: false });

  } catch (error: any) {
    console.error("Syllabus check failure:", error);
    return NextResponse.json({ found: false, error: error.message }, { status: 500 });
  }
}
