import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createMistral } from "@ai-sdk/mistral";
import { embed } from "ai";

const mistralProvider = createMistral({
  apiKey: process.env.MISTRAL_API_KEY_2,
});

// Simple hardcoded secret for basic admin protection. 
// In a real app, use proper clerk admin roles, but this prevents random public access.
const ADMIN_SECRET = process.env.ADMIN_SECRET || "supersecret123";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, level, topicCode, content } = await req.json();

    if (!subject || !level || !topicCode || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Temporarily skip generating embedding to bypass Gemini rate limits
    // We can run a batch embedding script later!
    
    // Check if the exact point already exists to avoid duplicates
    const { data: existing } = await supabase
      .from("aqa_specifications")
      .select("id")
      .eq("subject", subject)
      .eq("level", level)
      .eq("topic_code", topicCode)
      .eq("content", content)
      .single();

    if (existing) {
       return NextResponse.json({ status: "success", data: existing, message: "Already exists" });
    }

    // Generate embedding using Mistral
    const { embedding } = await embed({
      model: mistralProvider.textEmbeddingModel("mistral-embed"),
      value: content,
    });

    // Insert into Supabase vector table
    const { data, error } = await supabase
      .from("aqa_specifications")
      .insert({
        subject,
        level,
        topic_code: topicCode,
        content,
        embedding: embedding, // Mistral outputs exactly 1024 dimensions
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", data });
  } catch (e: any) {
    console.error("Error ingesting spec:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
