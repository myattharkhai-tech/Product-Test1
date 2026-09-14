/*
# Add missing UPDATE policies for chat_messages and quiz_results

1. Modified Tables
- `chat_messages` — added UPDATE policy so rows can be edited if needed.
- `quiz_results` — added UPDATE policy so quiz scores can be updated if needed.

2. Security
- Both policies use `TO anon, authenticated` with `USING (true) WITH CHECK (true)`
  consistent with the existing single-tenant, no-auth pattern on all other tables.

3. Important Notes
- No data changes — only adds missing RLS policies.
- Idempotent: drops the policy first if it already exists.
*/

DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
CREATE POLICY "anon_update_chat_messages" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_quiz_results" ON quiz_results;
CREATE POLICY "anon_update_quiz_results" ON quiz_results FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
