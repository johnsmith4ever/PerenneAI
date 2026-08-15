require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
sb.from('aqa_specifications').select('id, content').is('embedding', null).limit(1).then(async ({ data }) => {
  console.log('Missing:', data);
  if (data.length > 0) {
    const arr = Array(1024).fill(0.1);
    const { error } = await sb.from('aqa_specifications').update({ embedding: arr }).eq('id', data[0].id);
    console.log('Update Error:', error);
  }
});
