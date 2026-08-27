const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Just try to fetch a row from exam_sims to see its keys
  const { data, error } = await supabase.from('exam_sims').select('*').limit(1);
  if (error) console.error(error);
  else console.log(data.length > 0 ? Object.keys(data[0]) : "Table empty but exists. Error means no table.");
}
check();
