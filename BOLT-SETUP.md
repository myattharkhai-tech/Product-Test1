# StudyFlow for Bolt with Google Gemini

This version preserves the interface and routes chat and roadmap generation through Supabase to Google's Gemini API. No local Ollama service is needed. Old AI_API_KEY, AI_API_ENDPOINT and AI_MODEL_ID secrets are ignored by this adapter.

## Install into the existing project
Replace the project source with this package, or copy these two changed backend files into the existing cloud-ready project:
- supabase/functions/_shared/ai-chat-config.ts
- supabase/functions/generate-roadmap/index.ts
Keep your real .env and Git history; neither is included here. Commit and push the two changed files to your existing fix-chatbox branch, then merge the pull request if Bolt uses main.

## Backend setup
Create a Gemini API key at https://aistudio.google.com/apikey and enter it directly in the connected Supabase project's Edge Function secrets:
- GEMINI_API_KEY: your full Google Gemini API key
- GEMINI_MODEL: gemini-3.8-flash (optional; this is the default from Google's current compatibility documentation). Choose another supported text model if your account does not have access. Free quota depends on the model and account; it is not guaranteed by this package.

The Google endpoint is fixed in backend code. Do not enter keys in chat, source files or VITE_ variables.
Deploy BOTH chat and generate-roadmap functions with the updated shared file. Test the Bolt preview and published website. A GitHub push alone does not deploy Supabase functions.

## Paste into Bolt
Update the existing StudyFlow project using the Gemini version of the shared AI adapter and generate-roadmap function from this package. Keep the frontend calling Supabase in preview and production. Ask me to enter GEMINI_API_KEY through backend secrets, use GEMINI_MODEL=gemini-3.8-flash or a supported model available to my account, and deploy chat and generate-roadmap with their shared dependency to the Supabase project used by VITE_SUPABASE_URL. Test a real streamed chat response and a roadmap. Report missing credentials, deployment failures or quota errors accurately. Do not print keys or claim success before testing.

## Validation
Mocked regression tests pass for secret validation, Google-only routing, streaming, incomplete responses, provider errors, HTTP authentication/access/quota errors, non-streaming replies and roadmap JSON handling. Frontend source and dependencies are unchanged from the previously build/typecheck/lint-verified Bolt package. A live Gemini request and deployed end-to-end test remain pending your key and deployment.

Existing demo limitations remain: attachment handling sends filenames, not document contents; subjects and quizzes retain their existing behavior. Anonymous access and in-memory rate limiting remain as in the original demo.

Official protocol reference: https://ai.google.dev/gemini-api/docs/openai
