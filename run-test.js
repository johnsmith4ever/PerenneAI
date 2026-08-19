import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error("No URL");

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const userId = "user_3GgA0XKCmochgAw5Y94j62UBgza"; // test user
  const payload = {
    id: "test-chat-5555",
    user_id: userId,
    title: "Test Chat",
    messages: [{ role: "user", content: "Hello" }],
    updated_at: new Date().toISOString()
  };
  
  console.log("Upserting...");
  const { data, error } = await supabaseAdmin.from("chat_history").upsert(payload);
  console.log("Error:", error);
  
  console.log("Fetching...");
  const { data: fetch, error: fetchErr } = await supabaseAdmin.from("chat_history").select("*").eq("id", "test-chat-5555");
  console.log("Fetch Error:", fetchErr);
  console.log("Fetch Length:", fetch?.length);
}

run();
