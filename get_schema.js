const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('quiz_history').select('*').limit(1);
  console.log("Keys:", data && data.length > 0 ? Object.keys(data[0]) : "No data");
  console.log("Error:", error);
}
run();
