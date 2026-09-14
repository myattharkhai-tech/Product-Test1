// ════════════════════════════════════════════════════════════════════
// AI Chat Configuration — the ONLY file to change when swapping providers.
//
// Uses the OpenAI-compatible chat completions API format, which works with
// OpenAI, Groq, Together AI, OpenRouter, and most other providers.
//
// To point at a different model or provider:
//   1. Set AI_MODEL_ID to the new model's exact identifier string.
//   2. Set AI_API_ENDPOINT to the new provider's chat endpoint URL.
//   3. Set AI_API_KEY in the edge function secrets (if the new provider requires one).
// No other file in the codebase needs to change.
// ════════════════════════════════════════════════════════════════════

export interface AIChatConfig {
  readonly AI_API_ENDPOINT: string;
  readonly AI_API_KEY: string;
  readonly AI_MODEL_ID: string;
  readonly AI_SYSTEM_PROMPT: string;
  readonly AI_REQUEST_TIMEOUT: number;
  readonly AI_MAX_TOKENS: number;
  readonly AI_MAX_INPUT_CHARS: number;
}

// ── System prompt: scopes the model to the website's purpose ──────────
const DEFAULT_SYSTEM_PROMPT = [
  "You are StudyFlow AI, a friendly study assistant for university students.",
  "You help students understand topics, prepare for exams, and stay motivated.",
  "Keep responses concise (2-4 sentences unless the student asks for detail).",
  "Use plain text — no markdown formatting, no bullet points, no headers.",
  "If the student asks to be quizzed, say you'll open a quiz for them.",
  "Politely decline requests unrelated to studying or academics.",
].join("\n");

// ── Startup validation: fail loudly if required config is missing ──────
export function loadAIConfig(): AIChatConfig {
  const modelId = Deno.env.get("AI_MODEL_ID") ?? "gpt-4o-mini";
  const endpoint = Deno.env.get("AI_API_ENDPOINT") ??
    "https://api.openai.com/v1/chat/completions";
  const apiKey = Deno.env.get("AI_API_KEY") ?? "";

  if (!endpoint) {
    throw new Error("AI chat config validation failed: AI_API_ENDPOINT is not set.");
  }
  if (!modelId) {
    throw new Error("AI chat config validation failed: AI_MODEL_ID is not set.");
  }

  return {
    AI_API_ENDPOINT: endpoint,
    AI_API_KEY: apiKey,
    AI_MODEL_ID: modelId,
    AI_SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
    AI_REQUEST_TIMEOUT: 30000,
    AI_MAX_TOKENS: 1024,
    AI_MAX_INPUT_CHARS: 2000,
  };
}

// ── Chat turn type ────────────────────────────────────────────────────
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// ── OpenAI-compatible message type ─────────────────────────────────────
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ── Adapter: single thin function that performs the AI API call ──────
// Returns the full text response. For streaming, use streamChatMessage.
export async function sendChatMessage(
  config: AIChatConfig,
  history: ChatTurn[],
  userMessage: string,
  extraContext: string,
): Promise<string> {
  if (userMessage.length > config.AI_MAX_INPUT_CHARS) {
    throw new Error(
      `Message too long — please keep it under ${config.AI_MAX_INPUT_CHARS} characters.`,
    );
  }

  const systemPrompt = extraContext
    ? `${config.AI_SYSTEM_PROMPT}\n${extraContext}`
    : config.AI_SYSTEM_PROMPT;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((turn) => ({
      role: turn.role as "user" | "assistant",
      content: turn.content,
    })),
    { role: "user", content: userMessage },
  ];

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
        messages,
        stream: false,
        max_tokens: config.AI_MAX_TOKENS,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.error(
        `AI provider error: status=${res.status} model=${config.AI_MODEL_ID}`,
      );
      if (res.status === 429) {
        throw new Error("The assistant is busy right now — please try again in a moment.");
      }
      throw new Error("Having trouble reaching the assistant — try again in a moment.");
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("The assistant returned an empty response. Please try rephrasing.");
    }
    return text.trim();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The assistant took too long to respond — please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Streaming adapter: yields text chunks as they arrive ──────────────
// Uses OpenAI-compatible SSE streaming (data: { ... } lines terminated by [DONE])
export async function* streamChatMessage(
  config: AIChatConfig,
  history: ChatTurn[],
  userMessage: string,
  extraContext: string,
): AsyncGenerator<string> {
  if (userMessage.length > config.AI_MAX_INPUT_CHARS) {
    throw new Error(
      `Message too long — please keep it under ${config.AI_MAX_INPUT_CHARS} characters.`,
    );
  }

  const systemPrompt = extraContext
    ? `${config.AI_SYSTEM_PROMPT}\n${extraContext}`
    : config.AI_SYSTEM_PROMPT;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((turn) => ({
      role: turn.role as "user" | "assistant",
      content: turn.content,
    })),
    { role: "user", content: userMessage },
  ];

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
        messages,
        stream: true,
        max_tokens: config.AI_MAX_TOKENS,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.error(
        `AI provider stream error: status=${res.status} model=${config.AI_MODEL_ID}`,
      );
      if (res.status === 429) {
        throw new Error("The assistant is busy right now — please try again in a moment.");
      }
      throw new Error("Having trouble reaching the assistant — try again in a moment.");
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("Streaming is not available — please try again.");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === "[DONE]") return;
        try {
          const parsed = JSON.parse(jsonStr);
          const text = parsed?.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch {
          // Skip malformed chunks
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The assistant took too long to respond — please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Rate limiting (in-memory, per-IP) ──────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 15;
const ipRequestMap = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRequestMap.set(ip, { count: 1, windowStart: now });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX_REQUESTS;
}

// ── Input sanitization for log lines (prevent log injection) ───────────
export function sanitizeForLog(input: string): string {
  return input.replace(/[\n\r\t]/g, " ").slice(0, 100);
}
