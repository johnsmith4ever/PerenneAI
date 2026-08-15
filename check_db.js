const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('aqa_specifications').select('subject').limit(100);
  if (error) console.error(error);
  else {
    const subjects = [...new Set(data.map(d => d.subject))];
    console.log("Subjects in DB:", subjects);
    console.log("Total rows fetched:", data.length);
  }
}
check();
