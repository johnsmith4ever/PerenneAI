import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase.from('maths_questions').insert([
    {
      user_id: 'test_user',
      question: 'Test Q',
      solution: {
        topic: 'Maths: Test',
        user_answer: 'Test A',
        grading: { marks_awarded: 1, marks_available: 2, feedback: 'Good', correct: false },
        score_pct: 50
      }
    }
  ]);
  console.log('Error:', error);
  console.log('Success if Error is null');
}
main();
