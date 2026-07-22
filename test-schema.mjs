import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
  
  // Try to insert a dummy record to see if we get a schema error
  // Actually, we can fetch one row to see its keys
  supabase.from("quiz_history").select("*").limit(1).then(({ data, error }) => {
    if (error) console.error("Error:", error);
    else if (data && data.length > 0) console.log("Columns:", Object.keys(data[0]));
    else console.log("No data, but query succeeded");
  });
}
