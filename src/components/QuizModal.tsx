import { useState } from 'react';
import { X, Check, ChevronRight, RotateCcw, Trophy } from 'lucide-react';
import type { QuizQuestion, RoadmapTopic } from '@/types';
import { mockQuizQuestions } from '@/data/mockData';

interface QuizModalProps {
  topic: RoadmapTopic | null;
  onClose: () => void;
}

export default function QuizModal({ topic, onClose }: QuizModalProps) {
  const questions: QuizQuestion[] = mockQuizQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!topic) return null;

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    setSubmitted(true);
    if (selectedAnswer === question.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setSubmitted(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSubmitted(false);
    setScore(0);
    setFinished(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-navy-400 text-xs uppercase tracking-wider mb-1">Quiz</p>
            <h2 className="font-serif text-xl text-navy-800">{topic.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {finished ? (
          /* Results screen */
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
            <div className="flex items-center justify-center gap-3">
              <button onClick={handleRestart} className="btn-primary flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Try again
              </button>
              <button onClick={onClose} className="btn-ghost">
                Back to roadmap
              </button>
            </div>
          </div>
        ) : (
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
