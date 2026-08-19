import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  }
);

async function run() {
  console.log("Upserting...");
  const { data, error } = await supabaseAdmin.from("chat_history").upsert({
    id: "test-chat-action",
    user_id: "test_user_from_action",
    title: "Test",
    messages: [],
    updated_at: new Date().toISOString()
  });
  console.log("Error:", error);
}
run();
