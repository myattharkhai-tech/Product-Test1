// Sync-calendar edge function — creates/clears Google Calendar events for study sessions.
// Uses a Google service account key stored in the MyCalendarAPI secret.
import { checkRateLimit, sanitizeForLog } from "../_shared/ai-chat-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
  project_id: string;
}

interface StudySessionInput {
  id: string;
  title: string;
  subject: string;
  day: number; // 0 = Monday … 6 = Sunday
  startHour: number;
  endHour: number;
  color: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("MyCalendarAPI")?.trim() ?? "";
  if (!raw) {
    throw new Error("Google Calendar key (MyCalendarAPI) is not configured. Add it in your Supabase secrets.");
  }
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("Invalid service account key — missing client_email or private_key.");
    }
    return parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error("MyCalendarAPI secret is not valid JSON. Store the full service account JSON key.");
    }
    throw err;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const stripped = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(stripped);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsigned = `${enc(header)}.${enc(payload)}`;
  const keyData = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyData,
    new TextEncoder().encode(unsigned),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsigned}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`OAuth token error: ${sanitizeForLog(body)}`);
    throw new Error("Failed to authenticate with Google Calendar. Check the service account key.");
  }

  const data = await res.json();
  return data.access_token as string;
}

function getNextWeekDates(dayIndex: number): { start: Date; end: Date } {
  const today = new Date();
  const currentDay = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - currentDay);
  monday.setHours(0, 0, 0, 0);

  const target = new Date(monday);
  target.setDate(monday.getDate() + dayIndex);

  return { start: target, end: target };
}

function buildEventDateTime(day: number, hour: number): string {
  const { start } = getNextWeekDates(day);
  const h = Math.floor(hour);
  const m = hour % 1 !== 0 ? 30 : 0;
  const d = new Date(start);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const COLOR_MAP: Record<string, string> = {
  navy: "1",
  teal: "2",
  coral: "4",
  ice: "9",
};

const CALENDAR_SUMMARY = "StudyFlow AI";

async function ensureCalendar(token: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to list Google calendars.");
  const data = await res.json();
  const existing = data.items?.find((c: { summary?: string }) => c.summary === CALENDAR_SUMMARY);

  if (existing) return existing.id as string;

  const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary: CALENDAR_SUMMARY }),
  });

  if (!createRes.ok) throw new Error("Failed to create StudyFlow calendar.");
  const created = await createRes.json();
  return created.id as string;
}

async function clearCalendar(token: string, calendarId: string): Promise<void> {
  const now = new Date().toISOString();
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${now}&timeMax=${future.toISOString()}&maxResults=2500`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) throw new Error("Failed to list events for clearing.");
  const data = await res.json();

  const events = data.items ?? [];
  for (const event of events) {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
  }
}

async function syncEvents(
  token: string,
  calendarId: string,
  sessions: StudySessionInput[],
): Promise<{ synced: number }> {
  await clearCalendar(token, calendarId);

  let synced = 0;
  for (const session of sessions) {
    const start = buildEventDateTime(session.day, session.startHour);
    const end = buildEventDateTime(session.day, session.endHour);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `${session.title}`,
          description: `Subject: ${session.subject}`,
          start: { dateTime: start, timeZone: "UTC" },
          end: { dateTime: end, timeZone: "UTC" },
          colorId: COLOR_MAP[session.color] ?? "1",
          reminders: { useDefault: true },
        }),
      },
    );

    if (res.ok) synced++;
  }

  return { synced };
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
    return jsonResponse({ error: "Too many requests — please wait a moment." }, 429);
  }

  try {
    const body = await req.json();
    const { action, sessions } = body as {
      action: "sync" | "disconnect";
      sessions?: StudySessionInput[];
    };

    const sa = loadServiceAccount();
    const token = await getAccessToken(sa);
    const calendarId = await ensureCalendar(token);

    if (action === "disconnect") {
      await clearCalendar(token, calendarId);
      console.log(`calendar disconnect: cleared events from ${sanitizeForLog(calendarId)}`);
      return jsonResponse({ disconnected: true });
    }

    if (action === "sync") {
      if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
        return jsonResponse({ error: "No study sessions to sync." }, 400);
      }
      const result = await syncEvents(token, calendarId, sessions);
      console.log(`calendar sync: ${result.synced} events to ${sanitizeForLog(calendarId)}`);
      return jsonResponse({ synced: result.synced, calendarId });
    }

    return jsonResponse({ error: "Unknown action. Use 'sync' or 'disconnect'." }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error(`calendar sync error: ${sanitizeForLog(msg)}`);
    return jsonResponse({ error: msg }, 500);
  }
});
