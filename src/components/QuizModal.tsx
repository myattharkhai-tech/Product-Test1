import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Check, ChevronRight, RotateCcw, Trophy, Loader2, AlertCircle } from 'lucide-react';
import type { QuizQuestion, QuizAttempt, RoadmapTopic } from '@/types';
import { generateQuiz, saveQuizAttempt, updateQuizAttempt } from '@/lib/api';

interface QuizModalProps {
  topic: RoadmapTopic | null;
  resumeAttempt: QuizAttempt | null;
  onClose: () => void;
  onQuizComplete?: () => void;
}

type Phase = 'loading' | 'ready' | 'error';

export default function QuizModal({ topic, resumeAttempt, onClose, onQuizComplete }: QuizModalProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const answersRef = useRef<(number | null)[]>([]);
  const scoreRef = useRef(0);
  const answeredCountRef = useRef(0);
  const savedRef = useRef(false);
  const attemptIdRef = useRef<string | null>(null);

  const startNewQuiz = useCallback(async () => {
    if (!topic) return;
    setPhase('loading');
    setErrorMsg('');
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSubmitted(false);
    setScore(0);
    setFinished(false);
    savedRef.current = false;
    attemptIdRef.current = null;

    try {
      const result = await generateQuiz({
        topic: topic.title,
        subject: topic.subject,
        count: 5,
      });
      const withIds = result.map((q, i) => ({ ...q, id: `q-${i}` }));
      setQuestions(withIds);
      answersRef.current = new Array(withIds.length).fill(null);
      scoreRef.current = 0;
      answeredCountRef.current = 0;
      setPhase('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate quiz questions.');
      setPhase('error');
    }
  }, [topic]);

  const startResume = useCallback(async () => {
    if (!resumeAttempt) return;
    setPhase('loading');
    setErrorMsg('');

    const withIds = resumeAttempt.questions.map((q, i) => ({ ...q, id: `q-${i}` }));
    setQuestions(withIds);
    answersRef.current = [...resumeAttempt.answers];
    scoreRef.current = resumeAttempt.score;
    answeredCountRef.current = resumeAttempt.answered_count;
    attemptIdRef.current = resumeAttempt.id;
    savedRef.current = false;

    setScore(resumeAttempt.score);

    // Find first unanswered question
    let firstUnanswered = 0;
    for (let i = 0; i < resumeAttempt.answers.length; i++) {
      if (resumeAttempt.answers[i] === null || resumeAttempt.answers[i] === undefined) {
        firstUnanswered = i;
        break;
      }
      firstUnanswered = i + 1;
    }
    const startIndex = Math.min(firstUnanswered, withIds.length - 1);
    setCurrentIndex(startIndex);
    setSelectedAnswer(null);
    setSubmitted(false);
    setFinished(false);
    setPhase('ready');
  }, [resumeAttempt]);

  useEffect(() => {
    if (resumeAttempt) {
      startResume();
    } else if (topic) {
      startNewQuiz();
    }
  }, [topic, resumeAttempt, startNewQuiz, startResume]);

  const persistAttempt = useCallback(
    async (completed: boolean) => {
      if (questions.length === 0) return;
      if (savedRef.current) return;
      savedRef.current = true;
      setSaving(true);
      try {
        if (attemptIdRef.current) {
          await updateQuizAttempt(attemptIdRef.current, {
            answers: answersRef.current,
            score: scoreRef.current,
            answered_count: answeredCountRef.current,
            completed,
          });
        } else if (topic) {
          const saved = await saveQuizAttempt({
            topic_title: topic.title,
            subject_name: topic.subject,
            questions,
            answers: answersRef.current,
            score: scoreRef.current,
            answered_count: answeredCountRef.current,
            total_questions: questions.length,
            completed,
          });
          if (saved) attemptIdRef.current = saved.id;
        }
        onQuizComplete?.();
      } catch {
        savedRef.current = false;
      } finally {
        setSaving(false);
      }
    },
    [topic, questions, onQuizComplete],
  );

  const handleClose = useCallback(() => {
    if (phase === 'ready' && !finished && answeredCountRef.current > 0) {
      persistAttempt(false);
    }
    onClose();
  }, [phase, finished, persistAttempt, onClose]);

  if (!topic && !resumeAttempt) return null;

  const displayTitle = resumeAttempt?.topic_title ?? topic?.title ?? '';
  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    setSubmitted(true);
    answersRef.current[currentIndex] = selectedAnswer;
    answeredCountRef.current = answeredCountRef.current + 1;
    if (selectedAnswer === question.correctIndex) {
      setScore((s) => s + 1);
      scoreRef.current = scoreRef.current + 1;
    }
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      persistAttempt(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setSubmitted(false);
  };

  const handleRestart = () => {
    startNewQuiz();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="card w-full max-w-lg p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-navy-400 text-xs uppercase tracking-wider mb-1">
              {resumeAttempt ? 'Continue quiz' : 'Quiz'}
            </p>
            <h2 className="font-serif text-xl text-navy-800">{displayTitle}</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <Loader2 className="w-8 h-8 text-navy-400 animate-spin mb-4" />
            <p className="text-navy-500 text-sm">
              {resumeAttempt ? 'Loading your saved quiz…' : `Generating quiz questions about ${displayTitle}…`}
            </p>
            {!resumeAttempt && <p className="text-navy-300 text-xs mt-1">This usually takes a few seconds</p>}
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-coral-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 text-coral-500" />
            </div>
            <h3 className="font-serif text-lg text-navy-800 mb-2">Couldn't load quiz</h3>
            <p className="text-navy-500 text-sm text-center mb-6 max-w-xs">{errorMsg}</p>
            <div className="flex gap-3">
              <button onClick={startNewQuiz} className="btn-primary flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Try again
              </button>
              <button onClick={handleClose} className="btn-ghost">
                Close
              </button>
            </div>
          </div>
        )}

        {phase === 'ready' && finished && (
          <div className="text-center py-8 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
              <Trophy className="w-10 h-10 text-teal-500" />
            </div>
            <h3 className="font-serif text-2xl text-navy-800 mb-2">
              You scored {score} / {questions.length}
            </h3>
            <p className="text-navy-500 text-sm mb-6">
              {score === questions.length
                ? "Perfect! You've mastered this topic."
                : score >= questions.length / 2
                ? "Good work! Review the ones you missed and try again."
                : "Keep studying — you'll get there. Review the material and retry."}
            </p>
            {saving && (
              <p className="text-navy-400 text-xs mb-4 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving your quiz…
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button onClick={handleRestart} className="btn-primary flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                New quiz
              </button>
              <button onClick={handleClose} className="btn-ghost">
                Back to roadmap
              </button>
            </div>
          </div>
        )}

        {phase === 'ready' && !finished && (
          <>
            {/* Progress dots */}
            <div className="flex items-center gap-2 mb-6">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-8 bg-navy-700'
                      : i < currentIndex
                      ? 'w-4 bg-teal-400'
                      : 'w-4 bg-navy-100'
                  }`}
                />
              ))}
            </div>

            {/* Question */}
            <div className="mb-6">
              <p className="text-navy-400 text-sm mb-2">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <h3 className="text-navy-800 text-lg font-medium leading-relaxed">
                {question.question}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-2.5 mb-6">
              {question.options.map((option, i) => {
                const isSelected = selectedAnswer === i;
                const isCorrect = i === question.correctIndex;
                const showCorrect = submitted && isCorrect;
                const showWrong = submitted && isSelected && !isCorrect;

                return (
                  <button
                    key={i}
                    onClick={() => !submitted && setSelectedAnswer(i)}
                    disabled={submitted}
                    className={`
                      w-full text-left rounded-xl border px-4 py-3.5 text-sm font-medium
                      transition-all duration-200 flex items-center justify-between
                      ${
                        showCorrect
                          ? 'border-teal-400 bg-teal-50 text-teal-700'
                          : showWrong
                          ? 'border-coral-400 bg-coral-50 text-coral-700'
                          : isSelected
                          ? 'border-navy-700 bg-navy-50 text-navy-800'
                          : 'border-navy-200 bg-white text-navy-600 hover:border-navy-300 hover:bg-navy-50'
                      }
                      ${submitted ? 'cursor-default' : 'cursor-pointer'}
                    `}
                  >
                    <span>{option}</span>
                    {showCorrect && <Check className="w-5 h-5 text-teal-500 shrink-0" />}
                    {showWrong && <X className="w-5 h-5 text-coral-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation (after submit) */}
            {submitted && (
              <div className="bg-ice-50 border border-ice-200 rounded-xl p-4 mb-6 animate-fade-in">
                <p className="text-navy-600 text-sm">
                  <span className="font-semibold text-navy-700">
                    {selectedAnswer === question.correctIndex ? 'Correct! ' : 'Not quite. '}
                  </span>
                  {question.explanation}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end">
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  className="btn-primary"
                >
                  Submit answer
                </button>
              ) : (
                <button onClick={handleNext} className="btn-primary flex items-center gap-2">
                  {isLast ? 'See results' : 'Next question'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
