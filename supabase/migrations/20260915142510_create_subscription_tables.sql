/*
# Subscription plans and usage tracking

1. New Tables
- `user_plans` — stores the user's current subscription plan and weekly email toggle.
  - id (uuid, pk), plan (text: 'free' | 'pro', default 'free'),
    weekly_email_enabled (bool, default false), created_at, updated_at
- `daily_chat_usage` — tracks AI chat messages sent per day for free-plan limits.
  - id (uuid, pk), date (date, unique), message_count (int, default 0), updated_at

2. Security
- RLS enabled on both tables.
- Single-tenant app (no sign-in): anon + authenticated roles can CRUD.
- USING (true) / WITH CHECK (true) because data is intentionally shared/public.

3. Important Notes
- `user_plans` has a single row (enforced by a unique index on a constant).
- `daily_chat_usage` resets naturally by date — each UTC day gets its own row.
- The weekly email toggle is a UI-only feature; no email sending is built.
*/

CREATE TABLE IF NOT EXISTS public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  weekly_email_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_user_plans" ON public.user_plans;
CREATE POLICY "anon_select_user_plans" ON public.user_plans
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_user_plans" ON public.user_plans;
CREATE POLICY "anon_insert_user_plans" ON public.user_plans
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_user_plans" ON public.user_plans;
CREATE POLICY "anon_update_user_plans" ON public.user_plans
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_user_plans" ON public.user_plans;
CREATE POLICY "anon_delete_user_plans" ON public.user_plans
  FOR DELETE TO anon, authenticated USING (true);

-- Ensure only one row exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_plans LIMIT 1) THEN
    INSERT INTO public.user_plans (plan, weekly_email_enabled)
    VALUES ('free', false);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_plans_single_row_idx
  ON public.user_plans ((1));

CREATE TABLE IF NOT EXISTS public.daily_chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_chat_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_daily_chat_usage" ON public.daily_chat_usage;
CREATE POLICY "anon_select_daily_chat_usage" ON public.daily_chat_usage
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_daily_chat_usage" ON public.daily_chat_usage;
CREATE POLICY "anon_insert_daily_chat_usage" ON public.daily_chat_usage
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_daily_chat_usage" ON public.daily_chat_usage;
CREATE POLICY "anon_update_daily_chat_usage" ON public.daily_chat_usage
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_daily_chat_usage" ON public.daily_chat_usage;
CREATE POLICY "anon_delete_daily_chat_usage" ON public.daily_chat_usage
  FOR DELETE TO anon, authenticated USING (true);

-- Add difficulty and wrong_topics columns to quiz_attempts for adaptive difficulty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN difficulty text DEFAULT 'normal';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'wrong_topics'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN wrong_topics jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
