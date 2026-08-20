-- Step 1: Drop old tables
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS user_usage CASCADE;
DROP TABLE IF EXISTS flashcards_history CASCADE;
DROP TABLE IF EXISTS quiz_history CASCADE;
DROP TABLE IF EXISTS essay_history CASCADE;
DROP TABLE IF EXISTS explore_history CASCADE;
DROP TABLE IF EXISTS user_state CASCADE;

-- Step 2: Create new tables with strict explicit user_id and RLS

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own chats" ON chats FOR ALL USING (auth.jwt() ->> 'sub' = user_id) WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  credits_used INTEGER NOT NULL DEFAULT 0,
  last_reset TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own usage" ON usage FOR ALL USING (auth.jwt() ->> 'sub' = user_id) WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own flashcards" ON flashcards FOR ALL USING (auth.jwt() ->> 'sub' = user_id) WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE TABLE maths_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  solution JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE maths_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own maths_questions" ON maths_questions FOR ALL USING (auth.jwt() ->> 'sub' = user_id) WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  data JSONB NOT NULL,
  score INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own quizzes" ON quizzes FOR ALL USING (auth.jwt() ->> 'sub' = user_id) WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE TABLE exam_sims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  data JSONB NOT NULL,
  score INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE exam_sims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own exam_sims" ON exam_sims FOR ALL USING (auth.jwt() ->> 'sub' = user_id) WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE TABLE essay_sims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  essay TEXT NOT NULL,
  grade JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE essay_sims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own essay_sims" ON essay_sims FOR ALL USING (auth.jwt() ->> 'sub' = user_id) WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes" ON notes FOR ALL USING (auth.jwt() ->> 'sub' = user_id) WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE TABLE mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own mind_maps" ON mind_maps FOR ALL USING (auth.jwt() ->> 'sub' = user_id) WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Step 3: Create Indexes for Performance
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_usage_user_id ON usage(user_id);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_maths_questions_user_id ON maths_questions(user_id);
CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_exam_sims_user_id ON exam_sims(user_id);
CREATE INDEX idx_essay_sims_user_id ON essay_sims(user_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_mind_maps_user_id ON mind_maps(user_id);

