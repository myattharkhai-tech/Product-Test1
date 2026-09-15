// Generate-quiz edge function — creates topic-specific multiple-choice questions via Google Gemini.
import { loadAIConfig, throwProviderError, checkRateLimit, sanitizeForLog } from "../_shared/ai-chat-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function generateQuizQuestions(
  topicTitle: string,
  subjectName: string,
  count: number,
): Promise<QuizQuestion[]> {
  const config = loadAIConfig();

  const prompt = `You are StudyFlow AI, a quiz generator for university students.
Generate ${count} multiple-choice quiz questions about "${topicTitle}" in the context of the subject "${subjectName}".

Return ONLY a JSON array (no markdown, no code fences) with this exact structure:
[
  {
    "question": "the question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correctIndex": 0,
    "explanation": "why the correct answer is right and others are wrong"
  }
]

Rules:
- Each question must have exactly 4 options.
- correctIndex is 0-based (0 = first option, 3 = last option).
- Questions should test understanding, not just memorization.
- Explanations should be concise (1-2 sentences).
- Vary difficulty across questions.
- Make sure the correct answer is not always the same position.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.AI_REQUEST_TIMEOUT);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.AI_API_KEY) {
      headers["Authorization"] = `Bearer ${config.AI_API_KEY}`;
    }

    const res = await fetch(config.AI_API_ENDPOINT, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.AI_MODEL_ID,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      let body = "";
      try { body = await res.text(); } catch { /* ignore */ }
      console.error(`AI provider error: status=${res.status} model=${config.AI_MODEL_ID} body=${sanitizeForLog(body)}`);
      throwProviderError(res.status, body);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("The AI returned an empty response. Please try again.");
    }

    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const questions = JSON.parse(cleaned) as QuizQuestion[];

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("The AI did not return valid quiz questions. Please try again.");
    }

    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 ||
        typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) {
        throw new Error("The AI returned malformed quiz questions. Please try again.");
      }
    }

    return questions;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The quiz generation timed out — please try again.");
    }
    if (err instanceof TypeError) {
      throw new Error("The assistant connection failed. Please try again later.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(clientIP)) {
    return jsonResponse(
      { error: "You're sending too many requests — please wait a moment." },
      429,
    );
  }

  try {
    const body = await req.json();
    const { topic, subject, count } = body as {
      topic?: string;
      subject?: string;
      count?: number;
    };

    if (!topic || !topic.trim()) {
      return jsonResponse({ error: "A topic is required to generate quiz questions." }, 400);
    }

    const questionCount = Math.min(Math.max(count ?? 5, 3), 10);
    const subjectName = subject?.trim() || "General";

    console.log(
      `quiz request: ip=${sanitizeForLog(clientIP)} topic="${sanitizeForLog(topic)}" subject="${sanitizeForLog(subjectName)}" count=${questionCount}`,
    );

    const questions = await generateQuizQuestions(topic.trim(), subjectName, questionCount);

    return jsonResponse({ questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error(`quiz error: ${sanitizeForLog(msg)}`);
    return jsonResponse({ error: msg }, 500);
  }
});
