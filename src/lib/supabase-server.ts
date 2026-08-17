import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize the Supabase client with the Service Role Key.
// This bypasses RLS entirely. DO NOT expose this client to the browser.
// Always enforce auth() verification manually before using this client.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
