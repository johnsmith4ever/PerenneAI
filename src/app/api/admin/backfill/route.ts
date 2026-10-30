import { mistralProvider } from "@/lib/mistral-fallback";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMistral } from "@ai-sdk/mistral";
import { embedMany } from "ai";



const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_key"
);

import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || adminSecret.trim() === "") {
      return NextResponse.json({ error: "Server configuration error: ADMIN_SECRET not set" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expectedHeader = `Bearer ${adminSecret}`;
    const expectedHash = crypto.createHash("sha256").update(expectedHeader).digest();
    const actualHash = crypto.createHash("sha256").update(authHeader).digest();

    if (!crypto.timingSafeEqual(expectedHash, actualHash)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch up to 100 points that are missing embeddings
    const { data: missingRows, error: fetchError } = await adminSupabase
      .from("aqa_specifications")
      .select("id, content")
      .is("embedding", null)
      .limit(100);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!missingRows || missingRows.length === 0) {
      return NextResponse.json({ status: "success", message: "No missing embeddings found!" });
    }

    // Generate embeddings in a batch
    const values = missingRows.map(r => r.content);
    
    console.log(`Generating embeddings for ${values.length} rows...`);
    const { embeddings } = await embedMany({
      model: mistralProvider.textEmbeddingModel("mistral-embed"),
      values,
    });

    // Update each row in Supabase
    let successCount = 0;
    for (let i = 0; i < missingRows.length; i++) {
      const { error: updateError } = await adminSupabase
        .from("aqa_specifications")
        .update({ embedding: embeddings[i] })
        .eq("id", missingRows[i].id);

      if (updateError) {
        console.error(`Failed to update embedding for id ${missingRows[i].id}`, updateError);
      } else {
        successCount++;
      }
    }

    return NextResponse.json({ 
      status: "success", 
      message: `Successfully backfilled ${successCount} embeddings.`,
      remaining: missingRows.length === 100 ? "More remaining" : "Done"
    });

  } catch (e: any) {
    console.error("Error backfilling embeddings:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
