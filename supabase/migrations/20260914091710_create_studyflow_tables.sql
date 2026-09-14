/*
# StudyFlow AI — initial schema (single-tenant, no auth)

1. New Tables
- `uploads` — stores metadata for files/text the student uploads for roadmap generation.
  - id (uuid, pk), filename (text), file_type (text: pdf/docx/image/text),
    file_size (text, human-readable), content_text (text, nullable — for pasted text or extracted text later),
    created_at (timestamptz)
- `roadmaps` — a generated study roadmap.
  - id (uuid, pk), title (text), source_upload_id (uuid, nullable fk → uploads),
    created_at (timestamptz)
- `roadmap_days` — individual days within a roadmap.
  - id (uuid, pk), roadmap_id (uuid, fk → roadmaps), day_number (int),
    date_label (text), created_at (timestamptz)
- `roadmap_topics` — topics within a day.
  - id (uuid, pk), day_id (uuid, fk → roadmap_days), title (text),
    subject (text), estimated_minutes (int), completed (bool default false),
    created_at (timestamptz)
- `study_sessions` — calendar session blocks.
  - id (uuid, pk), day_of_week (int 0–6), start_hour (numeric),
    end_hour (numeric), title (text), subject (text), color (text),
    missed_count (int default 0), created_at (timestamptz)
- `quiz_results` — stores quiz attempt results (for future analytics).
  - id (uuid, pk), topic_title (text, nullable), score (int),
    total_questions (int), created_at (timestamptz)
- `chat_messages` — chat history.
  - id (uuid, pk), role (text: user/assistant), content (text),
    created_at (timestamptz)

2. Security
- RLS enabled on every table.
- This is a single-tenant app with no sign-in screen, so all policies
  use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the data is intentionally shared/public.

3. Important Notes
- No user_id columns or auth.users references — no auth flow yet.
- All tables are safe to re-run (IF NOT EXISTS + DROP POLICY IF EXISTS).
- These tables are empty for now; mock data is used in the UI.
*/

CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'docx', 'image', 'text')),
  file_size text,
  content_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_uploads" ON uploads;
CREATE POLICY "anon_select_uploads" ON uploads FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_uploads" ON uploads;
CREATE POLICY "anon_insert_uploads" ON uploads FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_uploads" ON uploads;
CREATE POLICY "anon_update_uploads" ON uploads FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_uploads" ON uploads;
CREATE POLICY "anon_delete_uploads" ON uploads FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_upload_id uuid REFERENCES uploads(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_roadmaps" ON roadmaps;
CREATE POLICY "anon_select_roadmaps" ON roadmaps FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_roadmaps" ON roadmaps;
CREATE POLICY "anon_insert_roadmaps" ON roadmaps FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_roadmaps" ON roadmaps;
CREATE POLICY "anon_update_roadmaps" ON roadmaps FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_roadmaps" ON roadmaps;
CREATE POLICY "anon_delete_roadmaps" ON roadmaps FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS roadmap_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  day_number int NOT NULL,
  date_label text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roadmap_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_roadmap_days" ON roadmap_days;
CREATE POLICY "anon_select_roadmap_days" ON roadmap_days FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_roadmap_days" ON roadmap_days;
CREATE POLICY "anon_insert_roadmap_days" ON roadmap_days FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_roadmap_days" ON roadmap_days;
CREATE POLICY "anon_update_roadmap_days" ON roadmap_days FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_roadmap_days" ON roadmap_days;
CREATE POLICY "anon_delete_roadmap_days" ON roadmap_days FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS roadmap_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES roadmap_days(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text,
  estimated_minutes int DEFAULT 60,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roadmap_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_roadmap_topics" ON roadmap_topics;
CREATE POLICY "anon_select_roadmap_topics" ON roadmap_topics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_roadmap_topics" ON roadmap_topics;
CREATE POLICY "anon_insert_roadmap_topics" ON roadmap_topics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_roadmap_topics" ON roadmap_topics;
CREATE POLICY "anon_update_roadmap_topics" ON roadmap_topics FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_roadmap_topics" ON roadmap_topics;
CREATE POLICY "anon_delete_roadmap_topics" ON roadmap_topics FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_hour numeric NOT NULL,
  end_hour numeric NOT NULL,
  title text NOT NULL,
  subject text,
  color text DEFAULT 'navy',
  missed_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_study_sessions" ON study_sessions;
CREATE POLICY "anon_select_study_sessions" ON study_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_study_sessions" ON study_sessions;
CREATE POLICY "anon_insert_study_sessions" ON study_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_study_sessions" ON study_sessions;
CREATE POLICY "anon_update_study_sessions" ON study_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_study_sessions" ON study_sessions;
CREATE POLICY "anon_delete_study_sessions" ON study_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_title text,
  score int NOT NULL DEFAULT 0,
  total_questions int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_quiz_results" ON quiz_results;
CREATE POLICY "anon_select_quiz_results" ON quiz_results FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_quiz_results" ON quiz_results;
CREATE POLICY "anon_insert_quiz_results" ON quiz_results FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_quiz_results" ON quiz_results;
CREATE POLICY "anon_delete_quiz_results" ON quiz_results FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);
