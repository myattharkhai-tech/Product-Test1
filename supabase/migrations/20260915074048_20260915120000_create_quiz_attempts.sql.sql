/*
# Create persistent quiz attempts

1. New Tables
- `quiz_attempts`
- `id` (uuid, primary key) identifies one quiz attempt.
- `topic_title` (text) stores the roadmap topic used for the quiz.
- `subject_name` (text) stores the related subject name.
- `questions` (jsonb) stores the generated questions and explanations so past quizzes remain viewable.
- `answers` (jsonb) stores the selected answer index for each question, including unanswered positions.
- `score` (integer) stores the number of correct submitted answers.
- `answered_count` (integer) stores how many questions were answered.
- `total_questions` (integer) stores the quiz length.
- `completed` (boolean) distinguishes finished quizzes from interrupted or abandoned attempts.
- `created_at` (timestamptz) records when the attempt began.

2. Security
- Row level security is enabled.
- This app has no sign-in screen, so anon and authenticated roles can manage the intentionally shared single-tenant quiz history.
- Separate SELECT, INSERT, UPDATE, and DELETE policies are provided.

3. Important Notes
- Incomplete attempts are retained with `completed = false` and are shown as “Not completed”.
- Deleting an attempt is an explicit user action from the Completed quizzes section.
*/

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_title text NOT NULL,
  subject_name text NOT NULL DEFAULT 'General',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  answered_count integer NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
  total_questions integer NOT NULL CHECK (total_questions > 0),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "anon_select_quiz_attempts" ON public.quiz_attempts
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "anon_insert_quiz_attempts" ON public.quiz_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "anon_update_quiz_attempts" ON public.quiz_attempts
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "anon_delete_quiz_attempts" ON public.quiz_attempts
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS quiz_attempts_created_at_idx
  ON public.quiz_attempts (created_at DESC);
