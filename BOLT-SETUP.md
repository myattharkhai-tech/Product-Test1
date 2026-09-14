# StudyFlow for Bolt + Ollama Cloud

This version runs chat through Supabase Edge Functions in both Bolt preview and production. It never connects to Ollama on your PC.

## Setup
1. Bring this source into your Bolt project (or update its connected GitHub repository). Keep your existing project configuration if already connected to Supabase.
2. Connect the intended Supabase project. Set frontend variables from `.env.example`: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Use the public anon key, never a service-role key.
3. In that SAME Supabase project's Edge Function secrets, set:
   - AI_MODEL_ID = gpt-oss:120b
   - AI_API_ENDPOINT = https://ollama.com/api/chat
   - AI_API_KEY = your Ollama Cloud API key
4. Deploy BOTH `supabase/functions/chat` and `supabase/functions/generate-roadmap`, including their `_shared` dependency. For a new database, apply the included migration first. The included function config preserves the existing anonymous study-demo behavior.
5. Restart Bolt's preview after changing frontend variables. Test a short chat message, then publish through Bolt and repeat the test.

The browser sends only the public Supabase configuration. The Ollama key belongs only in backend secrets. No real credentials are included in this archive.

## Prompt to paste into Bolt
Use the source in this project. Preserve the StudyFlow interface. Chat must call the Supabase chat Edge Function in preview and production, with no localhost proxy. Connect the correct Supabase project, configure the public frontend variables from .env.example, and deploy chat and generate-roadmap with the shared Ollama Cloud adapter. Use the AI_MODEL_ID, AI_API_ENDPOINT and AI_API_KEY backend secrets. Ask me to enter any missing API key in the secret manager. Test a streamed chat response and show any deployment or provider errors accurately.

## Validation and limits
TypeScript, ESLint, production build and mocked streaming regression checks are run during packaging. Cloud end-to-end verification still requires deployed updated functions and valid secrets. The previously configured remote backend was tested and still attempted localhost; changing frontend files alone does not deploy the backend.

Existing attachment handling sends filenames rather than document contents; this update does not add document extraction. Existing subjects and quizzes retain their demo behavior. The anonymous demo backend uses an in-memory rate limit, not an account-based production quota system.

## References
- https://docs.ollama.com/cloud
- https://support.bolt.new/integrations/supabase
