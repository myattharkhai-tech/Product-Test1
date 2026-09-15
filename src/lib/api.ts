import { supabase } from './supabase';
import type { QuizAttempt, QuizQuestion, RoadmapDay, StudySession, Subject } from '@/types';

export interface GenerateRoadmapResult {
  subject_name: string;
  confidence: 'high' | 'medium' | 'low';
  days: {
    day_number: number;
    date_label: string;
    topics: { title: string; estimated_minutes: number }[];
  }[];
  roadmap_id: string | null;
}

export async function generateRoadmap(params: {
  textContent?: string;
  filenames?: string[];
  existingSubjects: Subject[];
}): Promise<GenerateRoadmapResult> {
  const { data, error } = await supabase.functions.invoke('generate-roadmap', {
    body: {
      text_content: params.textContent ?? '',
      filenames: params.filenames ?? [],
      existing_subjects: params.existingSubjects.map((s) => s.name),
    },
  });

  if (error) {
    throw new Error('Failed to generate roadmap. Please try again.');
  }

  return data as GenerateRoadmapResult;
}

export async function generateQuiz(params: {
  topic: string;
  subject?: string;
  count?: number;
}): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.functions.invoke('generate-quiz', {
    body: {
      topic: params.topic,
      subject: params.subject ?? '',
      count: params.count ?? 5,
    },
  });

  if (error) {
    throw new Error('Failed to generate quiz questions. Please try again.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.questions as QuizQuestion[];
}

// ── Quiz attempt persistence ──────────────────────────────────────────

export async function saveQuizAttempt(attempt: {
  topic_title: string;
  subject_name: string;
  questions: QuizQuestion[];
  answers: (number | null)[];
  score: number;
  answered_count: number;
  total_questions: number;
  completed: boolean;
}): Promise<QuizAttempt | null> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      topic_title: attempt.topic_title,
      subject_name: attempt.subject_name,
      questions: attempt.questions,
      answers: attempt.answers,
      score: attempt.score,
      answered_count: attempt.answered_count,
      total_questions: attempt.total_questions,
      completed: attempt.completed,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as QuizAttempt | null;
}

export async function fetchQuizAttempts(): Promise<QuizAttempt[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as QuizAttempt[]) ?? [];
}

export async function deleteQuizAttempt(id: string): Promise<void> {
  const { error } = await supabase
    .from('quiz_attempts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateQuizAttempt(id: string, updates: {
  answers: (number | null)[];
  score: number;
  answered_count: number;
  completed: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('quiz_attempts')
    .update({
      answers: updates.answers,
      score: updates.score,
      answered_count: updates.answered_count,
      completed: updates.completed,
    })
    .eq('id', id);

  if (error) throw error;
}

// ── Google Calendar sync ──────────────────────────────────────────────

export async function syncCalendar(sessions: StudySession[]): Promise<{ synced: number }> {
  const { data, error } = await supabase.functions.invoke('sync-calendar', {
    body: { action: 'sync', sessions },
  });

  if (error) {
    throw new Error('Failed to reach the calendar sync service. Please try again.');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return { synced: data?.synced ?? 0 };
}

export async function disconnectCalendar(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('sync-calendar', {
    body: { action: 'disconnect' },
  });

  if (error) {
    throw new Error('Failed to disconnect Google Calendar.');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
}

// ── Streaming chat: calls the edge function and yields text chunks ────
// Uses fetch + ReadableStream to parse SSE from the edge function.
// The browser never touches the AI API key — it only talks to our backend.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface StreamChatParams {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  subjects: Subject[];
  attachments?: string[];
}

export async function* streamChatMessage(
  params: StreamChatParams,
): AsyncGenerator<string> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',

        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,

    },
    body: JSON.stringify({
      message: params.message,
      history: params.history,
      subjects: params.subjects.map((s) => s.name),
      attachments: params.attachments ?? [],
    }),
  });

  if (!res.ok) {
    const details = await res.json().catch(() => null);
    throw new Error(details?.error || `Unable to reach the assistant (HTTP ${res.status}). Check the chat backend configuration.`);
  }

  if (!res.body) {
    throw new Error('Streaming is not available — try again.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
  while (true) {
    const { done, value } = await reader.read();
    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    if (done && buffer) { lines.push(buffer); buffer = ''; }

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new Error('The assistant sent an invalid response. Please try again.');
      }
      if (parsed.type === 'error' || parsed.error) {
        throw new Error(parsed.error || 'An error occurred during streaming.');
      }
      const text = parsed.type === 'chunk' ? parsed.text : null;
      if (typeof text === 'string' && text) yield text;
      if (parsed.type === 'done') return;
    }
    if (done) throw new Error('The assistant connection ended before the reply completed. Please try again.');
  }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

// ── Non-streaming fallback (kept for backward compatibility) ──────────
export async function sendChatMessage(params: {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  subjects: Subject[];
  attachments?: string[];
}): Promise<string> {
  let reply = '';
  for await (const chunk of streamChatMessage(params)) reply += chunk;
  return reply;
}

export function roadmapResultToSubject(
  result: GenerateRoadmapResult,
  color: Subject['color']
): Subject {
  const subjectId = `subject-${Date.now()}`;
  const days: RoadmapDay[] = result.days.map((day) => ({
    id: `${subjectId}-day-${day.day_number}`,
    dayNumber: day.day_number,
    date: day.date_label,
    topics: day.topics.map((topic, i) => ({
      id: `${subjectId}-t${day.day_number}-${i}`,
      title: topic.title,
      subject: result.subject_name,
      subjectId,
      estimatedMinutes: topic.estimated_minutes,
      completed: false,
    })),
  }));

  return {
    id: subjectId,
    name: result.subject_name,
    color,
    examDate: null,
    roadmap: days,
  };
}
