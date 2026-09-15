import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  Trash2,
  X,
  Trophy,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import type { QuizAttempt } from '@/types';
import { fetchQuizAttempts, deleteQuizAttempt } from '@/lib/api';

interface CompletedQuizzesProps {
  refreshKey: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CompletedQuizzes({ refreshKey }: CompletedQuizzesProps) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchQuizAttempts();
      setAttempts(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to load quiz history.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleDelete = async (id: string) => {
    try {
      await deleteQuizAttempt(id);
      setAttempts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to delete quiz attempt.',
      );
    }
  };

  const attemptToDelete = attempts.find((a) => a.id === confirmDeleteId) ?? null;

  return (
    <div className="mt-10">
      {/* Section header */}
      <div className="flex items-center gap-2 text-navy-400 text-sm mb-2">
        <ClipboardCheck className="w-4 h-4" />
        <span>Quiz history</span>
      </div>
      <h2 className="font-serif text-2xl sm:text-3xl text-navy-800 mb-4">
        Completed quizzes
      </h2>

      {loading && (
        <div className="flex items-center gap-2 text-navy-400 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading quiz history…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-coral-50 border border-coral-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-coral-500 shrink-0" />
          <p className="text-coral-700 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && attempts.length === 0 && (
        <div className="card p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center mb-3">
            <Trophy className="w-6 h-6 text-navy-300" />
          </div>
          <p className="text-navy-500 text-sm">
            No quizzes yet. Take a quiz from any roadmap topic to see it here.
          </p>
        </div>
      )}

      {!loading && !error && attempts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {attempts.map((attempt, index) => {
            const percent = attempt.total_questions > 0
              ? Math.round((attempt.score / attempt.total_questions) * 100)
              : 0;
            const isExpanded = expandedId === attempt.id;

            return (
              <div
                key={attempt.id}
                className="card p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-slide-up group relative"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Delete button */}
                <button
                  onClick={() => setConfirmDeleteId(attempt.id)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center
                    text-navy-300 hover:text-coral-600 hover:bg-coral-50
                    opacity-0 group-hover:opacity-100 transition-all duration-150"
                  title="Delete quiz attempt"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Status badge */}
                <div className="mb-3">
                  {attempt.completed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-700">
                      <Trophy className="w-3 h-3" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 border border-coral-200 px-2.5 py-1 text-xs font-medium text-coral-700">
                      <AlertCircle className="w-3 h-3" />
                      Not completed
                    </span>
                  )}
                </div>

                {/* Topic + subject */}
                <div className="mb-3 pr-8">
                  <h3 className="font-serif text-lg text-navy-800 leading-tight">
                    {attempt.topic_title}
                  </h3>
                  <p className="text-navy-400 text-xs mt-0.5">{attempt.subject_name}</p>
                </div>

                {/* Score bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-navy-500 text-xs font-medium">
                      {attempt.completed
                        ? `${attempt.score} / ${attempt.total_questions} correct`
                        : `${attempt.answered_count} / ${attempt.total_questions} answered`}
                    </span>
                    <span className="text-navy-600 text-xs font-semibold">
                      {attempt.completed ? `${percent}%` : '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-navy-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        attempt.completed
                          ? percent >= 80
                            ? 'bg-teal-400'
                            : percent >= 50
                            ? 'bg-navy-400'
                            : 'bg-coral-400'
                          : 'bg-navy-200'
                      }`}
                      style={{
                        width: attempt.completed
                          ? `${percent}%`
                          : `${Math.round((attempt.answered_count / attempt.total_questions) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1.5 text-navy-400 text-xs mb-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(attempt.created_at)}</span>
                </div>

                {/* Expand/collapse questions */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                  className="flex items-center gap-1 text-navy-500 hover:text-navy-700 text-xs font-medium transition-colors"
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                  {isExpanded ? 'Hide questions' : 'Show questions'}
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    {attempt.questions.map((q, qi) => {
                      const userAnswer = attempt.answers[qi] ?? null;
                      const wasCorrect = userAnswer === q.correctIndex;
                      const wasAnswered = userAnswer !== null;

                      return (
                        <div key={qi} className="border border-navy-100 rounded-xl p-3">
                          <p className="text-navy-700 text-sm font-medium mb-2">
                            {qi + 1}. {q.question}
                          </p>
                          <div className="space-y-1">
                            {q.options.map((opt, oi) => {
                              const isCorrect = oi === q.correctIndex;
                              const isUserChoice = oi === userAnswer;

                              return (
                                <div
                                  key={oi}
                                  className={`text-xs rounded-lg px-2.5 py-1.5 flex items-center justify-between ${
                                    isCorrect
                                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                      : isUserChoice && !isCorrect
                                      ? 'bg-coral-50 text-coral-700 border border-coral-200'
                                      : 'bg-navy-50 text-navy-500'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {isCorrect && <Trophy className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
                                  {isUserChoice && !isCorrect && <X className="w-3.5 h-3.5 text-coral-500 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                          {!wasAnswered && (
                            <p className="text-navy-400 text-xs mt-1.5 italic">Not answered</p>
                          )}
                          {wasAnswered && (
                            <p className="text-navy-500 text-xs mt-1.5">
                              {wasCorrect ? 'Correct' : 'Incorrect'} — {q.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {attemptToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-coral-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-coral-600" />
                </div>
                <h3 className="font-serif text-lg text-navy-800">Delete quiz</h3>
              </div>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="text-navy-300 hover:text-navy-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-navy-500 text-sm mb-6">
              Delete this quiz attempt on{' '}
              <span className="font-semibold text-navy-700">
                {attemptToDelete.topic_title}
              </span>
              ? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium
                  bg-navy-100 text-navy-600 hover:bg-navy-200
                  transition-all duration-200 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(attemptToDelete.id);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium
                  bg-coral-500 text-white hover:bg-coral-600
                  transition-all duration-200 active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
