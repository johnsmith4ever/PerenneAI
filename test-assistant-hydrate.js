import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const userId = "user_3GgA0XKCmochgAw5Y94j62UBgza";
  const { data, error } = await supabaseAdmin.from("chat_history").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50);
  console.log("Chat history:", data.length);
  
  const { data: stateData } = await supabaseAdmin.from("user_state").select("*").eq("user_id", userId).eq("key", "assistant_active_chat_id");
  console.log("User state for active chat:", stateData);
}

run();
