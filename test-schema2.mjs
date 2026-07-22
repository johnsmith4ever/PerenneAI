import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
  
  // Try to query user_profiles
  supabase.from('user_profiles').select('*').limit(1).then(({ data, error }) => {
    if (error) console.error('Error fetching user_profiles:', error.message);
    else console.log('user_profiles columns:', data.length > 0 ? Object.keys(data[0]) : 'empty but exists');
  });
}
