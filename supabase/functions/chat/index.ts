// Chat edge function — streams AI responses via Server-Sent Events.
// Uses Ollama Cloud via server-side secrets (AI_API_ENDPOINT, AI_API_KEY, AI_MODEL_ID).
import {
  loadAIConfig,
  streamChatMessage,
  checkRateLimit,
  sanitizeForLog,
  type ChatTurn,
} from "../_shared/ai-chat-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Rate limit per IP
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(clientIP)) {
    return jsonResponse(
      { error: "You're sending messages too fast — please wait a moment and try again." },
      429,
    );
  }

  let config;
  try {
    config = loadAIConfig();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Configuration error.";
    console.error(`chat config error: ${sanitizeForLog(msg)}`);
    return jsonResponse({ error: msg }, 500);
  }

  try {
    const body = await req.json();
    const { message, history, subjects, attachments } = body as {
      message?: string;
      history?: ChatTurn[];
      subjects?: string[];
      attachments?: string[];
    };

    if (!message && (!attachments || attachments.length === 0)) {
      return jsonResponse({ error: "No message provided" }, 400);
    }

    // Server-side input length validation
    const userMessage = message || `I uploaded: ${attachments?.join(", ")}`;
    if (userMessage.length > config.AI_MAX_INPUT_CHARS) {
      return jsonResponse(
        { error: `Message too long — please keep it under ${config.AI_MAX_INPUT_CHARS} characters.` },
        400,
      );
    }

    const subjectsList = subjects?.length
      ? `The student is currently studying: ${subjects.join(", ")}.`
      : "The student hasn't created any roadmaps yet.";

    const attachmentsInfo = attachments?.length
      ? `The student attached these files: ${attachments.join(", ")}.`
      : "";

    const extraContext = [subjectsList, attachmentsInfo].filter(Boolean).join("\n");

    // Log only non-sensitive metadata — never the key, message body, or auth headers.
    console.log(
      `chat request: ip=${sanitizeForLog(clientIP)} model=${config.AI_MODEL_ID} history_len=${history?.length ?? 0}`,
    );

    // Stream response via Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          for await (const chunk of streamChatMessage(config, history ?? [], userMessage, extraContext)) {
            send({ type: "chunk", text: chunk });
          }
          send({ type: "done" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
          console.error(`chat stream error: ${sanitizeForLog(msg)}`);
          send({ type: "error", error: msg });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error(`chat error: ${sanitizeForLog(msg)}`);
    return jsonResponse({ error: msg }, 500);
  }
});
