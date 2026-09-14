// Gemini through Google's OpenAI-compatible API. Secrets remain on the backend.
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
  const modelId = Deno.env.get("GEMINI_MODEL")?.trim() || "gemini-3.8-flash";
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim() ?? "";

  if (!endpoint) {
    throw new Error("AI chat config validation failed: AI_API_ENDPOINT is not set.");
  }
  if (!modelId) {
    throw new Error("AI chat config validation failed: AI_MODEL_ID is not set.");
  }

  if (!apiKey.trim()) throw new Error("Set GEMINI_API_KEY in your Supabase Edge Function secrets before using chat.");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("AI_API_ENDPOINT must be a hosted HTTPS Gemini chat endpoint.");
  }

  return {
    AI_API_ENDPOINT: endpoint,
    AI_API_KEY: apiKey,
    AI_MODEL_ID: modelId,
    AI_SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
    AI_REQUEST_TIMEOUT: 120000,
    AI_MAX_TOKENS: 8192,
    AI_MAX_INPUT_CHARS: 2000,
  };
}

// ── Chat turn type ────────────────────────────────────────────────────
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// ── Gemini message type ────────────────────────────────────────────────
interface ProviderMessage {
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

  const messages: ProviderMessage[] = [
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
      }),
    });

    if (!res.ok) {
      let body = "";
      try { body = await res.text(); } catch { /* ignore */ }
      console.error(
        `AI provider error: status=${res.status} model=${config.AI_MODEL_ID} body=${sanitizeForLog(body)}`,
      );
      throwProviderError(res.status, body);
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
    if (err instanceof TypeError) {
      throw new Error("The assistant connection failed. Please try again later.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Streaming adapter: yields text chunks as they arrive ──────────────
// Google streams SSE data events containing choices[].delta.content.
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

  const messages: ProviderMessage[] = [
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
      }),
    });

    if (!res.ok) {
      let body = "";
      try { body = await res.text(); } catch { /* ignore */ }
      console.error(
        `AI provider stream error: status=${res.status} model=${config.AI_MODEL_ID} body=${sanitizeForLog(body)}`,
      );
      throwProviderError(res.status, body);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("Streaming is not available — please try again.");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let yieldedText = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        if (done && buffer) lines.push(buffer);
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          if (payload === "[DONE]") {
            if (!yieldedText) throw new Error("The assistant returned an empty response. Please try again.");
            return;
          }
          let parsed;
          try { parsed = JSON.parse(payload); }
          catch { throw new Error("Gemini returned an invalid response."); }
          if (parsed.error) throw new Error("Gemini could not complete the reply. Check model access and quota.");
          const choice = parsed.choices?.[0];
          const text = choice?.delta?.content;
          if (typeof text === "string" && text) { yieldedText = true; yield text; }
          if (choice?.finish_reason && choice.finish_reason !== "stop") {
            throw new Error("Gemini stopped the reply early (" + choice.finish_reason + "). Please try a shorter request.");
          }
        }
        if (done) throw new Error(yieldedText ? "The assistant connection was interrupted before the reply completed. Please try again." : "The assistant returned an empty response. Please try again.");
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The assistant took too long to respond — please try again.");
    }
    if (err instanceof TypeError) {
      throw new Error("The assistant connection failed. Please try again later.");
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

export function throwProviderError(status: number, body?: string): never {
  let detail = "";
  if (body) {
    try {
      const parsed = JSON.parse(body);
      detail = parsed?.error?.message ?? parsed?.message ?? "";
    } catch { detail = body.slice(0, 200); }
  }
  if (status === 400) throw new Error(`Gemini rejected the request${detail ? ": " + detail : ""}. Check GEMINI_API_KEY and GEMINI_MODEL.`);
  if (status === 401) throw new Error(`Gemini authentication failed${detail ? ": " + detail : ""}. Replace GEMINI_API_KEY in backend secrets.`);
  if (status === 403) throw new Error(`Gemini access denied${detail ? ": " + detail : ""}. Check key restrictions, project permissions and model access.`);
  if (status === 404) throw new Error(`Gemini model unavailable${detail ? ": " + detail : ""}. Check GEMINI_MODEL.`);
  if (status === 429) throw new Error(`Gemini quota exceeded${detail ? ": " + detail : ""}. Check AI Studio usage and retry later.`);
  if (status === 503) throw new Error(`Gemini service is temporarily unavailable${detail ? ": " + detail : ""}. The model may be overloaded or the key may not have access. Please retry later.`);
  throw new Error(`Gemini is unavailable (HTTP ${status})${detail ? ": " + detail : ""}. Please retry later.`);
}
