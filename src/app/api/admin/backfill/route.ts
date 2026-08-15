import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMistral } from "@ai-sdk/mistral";
import { embedMany } from "ai";

const mistralProvider = createMistral({
  apiKey: process.env.MISTRAL_API_KEY_2,
});

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_SECRET = process.env.ADMIN_SECRET || "supersecret123";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
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
