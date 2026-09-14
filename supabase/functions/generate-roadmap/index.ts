import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadAIConfig, throwProviderError, checkRateLimit, sanitizeForLog } from "../_shared/ai-chat-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RoadmapDay {
  day_number: number;
  date_label: string;
  topics: { title: string; estimated_minutes: number }[];
}

interface GenerateRoadmapResponse {
  subject_name: string;
  confidence: "high" | "medium" | "low";
  days: RoadmapDay[];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAIModel(
  prompt: string,
  textContent: string,
): Promise<GenerateRoadmapResponse> {
  const config = loadAIConfig();

  const fullPrompt = `${prompt}

Here is the study material content:
"""
${textContent.slice(0, 30000)}
"""

Return ONLY a JSON object with this exact structure (no markdown, no code fences):
{
  "subject_name": "the detected subject name, e.g. Calculus I",
  "confidence": "high" | "medium" | "low",
  "days": [
    {
      "day_number": 1,
      "date_label": "Day 1",
      "topics": [
        { "title": "topic name", "estimated_minutes": 90 }
      ]
    }
  ]
}

Rules:
- Detect the subject from the content (filenames, headers, topic keywords).
- Create a 7-day study roadmap that breaks the material into manageable daily topics.
- Each day should have 1-3 topics.
- Estimate realistic study minutes per topic (30-120 min).
- Spread the workload evenly across 7 days.
- The last day should be a review/self-test day.`;

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
        messages: [{ role: "user", content: fullPrompt }],
        stream: false,
        response_format: { type: "json_object" },
        max_tokens: 8192,
      }),
    });

    if (!res.ok) {
      console.error(`AI provider error: status=${res.status} model=${config.AI_MODEL_ID}`);
      throwProviderError(res.status);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("The AI returned an empty response. Please try again.");
    }
    return JSON.parse(text) as GenerateRoadmapResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The request timed out — please try again.");
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
    const { text_content, filenames, existing_subjects } = body as {
      text_content?: string;
      filenames?: string[];
      existing_subjects?: string[];
    };

    if (!text_content && (!filenames || filenames.length === 0)) {
      return jsonResponse({ error: "No content provided" }, 400);
    }

    const fileContext = filenames?.length
      ? `Uploaded files: ${filenames.join(", ")}`
      : "";
    const textContext = text_content ? text_content.slice(0, 30000) : "";
    const subjectsContext = existing_subjects?.length
      ? `Existing subjects in the student's account: ${existing_subjects.join(", ")}. If the material matches one of these, use that exact subject name.`
      : "";

    const prompt = [
      "You are StudyFlow AI, a study planner for university students.",
      "Analyze the following study material and:",
      "1. Detect which university subject/course this material belongs to.",
      "2. Generate a 7-day study roadmap breaking the material into daily topics.",
      fileContext,
      subjectsContext,
    ].filter(Boolean).join("\n");

    console.log(
      `roadmap request: ip=${sanitizeForLog(clientIP)} files=${filenames?.length ?? 0}`,
    );

    const result = await callAIModel(prompt, textContext || fileContext);

    // Save to database if Supabase is available
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let roadmapId: string | null = null;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: roadmapRow } = await supabase
        .from("roadmaps")
        .insert({ title: result.subject_name })
        .select()
        .single();

      roadmapId = roadmapRow?.id ?? null;

      if (roadmapId) {
        for (const day of result.days) {
          const { data: dayRow } = await supabase
            .from("roadmap_days")
            .insert({
              roadmap_id: roadmapId,
              day_number: day.day_number,
              date_label: day.date_label,
            })
            .select()
            .single();

          if (dayRow) {
            for (const topic of day.topics) {
              await supabase.from("roadmap_topics").insert({
                day_id: dayRow.id,
                title: topic.title,
                subject: result.subject_name,
                estimated_minutes: topic.estimated_minutes,
                completed: false,
              });
            }
          }
        }
      }
    }

    return jsonResponse({
      subject_name: result.subject_name,
      confidence: result.confidence,
      days: result.days,
      roadmap_id: roadmapId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error(`roadmap error: ${sanitizeForLog(msg)}`);
    return jsonResponse({ error: msg }, 500);
  }
});
