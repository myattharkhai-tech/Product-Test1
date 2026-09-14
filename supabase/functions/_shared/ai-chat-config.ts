// ════════════════════════════════════════════════════════════════════
// AI Chat Configuration — the ONLY file to change when swapping providers.
//
// Configured for Ollama Cloud using server-side secrets.
//
// To point at a different model or provider in the future:
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
  const modelId = Deno.env.get("AI_MODEL_ID") ?? "gpt-oss:120b";
  const endpoint = Deno.env.get("AI_API_ENDPOINT") ?? "https://ollama.com/api/chat";
  const apiKey = Deno.env.get("AI_API_KEY") ?? "";

  if (!endpoint) {
    throw new Error("AI chat config validation failed: AI_API_ENDPOINT is not set.");
  }
  if (!modelId) {
    throw new Error("AI chat config validation failed: AI_MODEL_ID is not set.");
  }

  if (!apiKey.trim()) throw new Error("Set AI_API_KEY in your Supabase Edge Function secrets before using chat.");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("AI_API_ENDPOINT must be a hosted HTTPS Ollama chat endpoint.");
  }

  return {
    AI_API_ENDPOINT: endpoint,
    AI_API_KEY: apiKey,
    AI_MODEL_ID: modelId,
    AI_SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
    AI_REQUEST_TIMEOUT: 120000,
    AI_MAX_TOKENS: 1024,
    AI_MAX_INPUT_CHARS: 2000,
  };
}

// ── Chat turn type ────────────────────────────────────────────────────
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// ── Ollama message type ────────────────────────────────────────────────
interface OllamaMessage {
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

  const messages: OllamaMessage[] = [
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
        options: {
          temperature: 0.7,
          num_predict: config.AI_MAX_TOKENS,
        },
      }),
    });

    if (!res.ok) {
      console.error(
        `AI provider error: status=${res.status} model=${config.AI_MODEL_ID}`,
      );
      if (res.status === 401 || res.status === 403) throw new Error("Ollama Cloud rejected access. Check AI_API_KEY and model access.");
      if (res.status === 404) throw new Error("Ollama Cloud model or endpoint not found. Check AI_MODEL_ID and AI_API_ENDPOINT.");
      if (res.status === 429) {
        throw new Error("The assistant is busy right now — please try again in a moment.");
      }
      throw new Error("Having trouble reaching the assistant — try again in a moment.");
    }

    const data = await res.json();
    const text = data?.message?.content;
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
// Ollama streams newline-delimited JSON objects, each with a "message.content" field.
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

  const messages: OllamaMessage[] = [
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
        options: {
          temperature: 0.7,
          num_predict: config.AI_MAX_TOKENS,
        },
      }),
    });

    if (!res.ok) {
      console.error(
        `AI provider stream error: status=${res.status} model=${config.AI_MODEL_ID}`,
      );
      if (res.status === 401 || res.status === 403) throw new Error("Ollama Cloud rejected access. Check AI_API_KEY and model access.");
      if (res.status === 404) throw new Error("Ollama Cloud model or endpoint not found. Check AI_MODEL_ID and AI_API_ENDPOINT.");
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
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        if (done && buffer) lines.push(buffer);
        for (const line of lines) {
          if (!line.trim()) continue;
          let parsed;
          try { parsed = JSON.parse(line); }
          catch { throw new Error("The AI provider returned an invalid response."); }
          if (parsed.error) throw new Error("The AI provider could not complete the reply. Check the model and account limits.");
          if (typeof parsed.message?.content === "string" && parsed.message.content) yield parsed.message.content;
          if (parsed.done) return;
        }
        if (done) throw new Error("The AI provider disconnected before completing the reply.");
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
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
