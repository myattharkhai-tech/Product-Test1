import { useState } from 'react';
import { BookOpen, Plus, ChevronRight, CalendarClock, Layers, Trash2, X } from 'lucide-react';
import type { Subject } from '@/types';
import CompletedQuizzes from '@/components/CompletedQuizzes';

interface RoadmapOverviewProps {
  subjects: Subject[];
  onOpenSubject: (subjectId: string) => void;
  onNewSubject: () => void;
  onDeleteSubject: (subjectId: string) => void;
  quizRefreshKey: number;
}

const colorBars: Record<Subject['color'], string> = {
  navy: 'bg-navy-400',
  teal: 'bg-teal-400',
  coral: 'bg-coral-400',
  ice: 'bg-ice-400',
};

const colorIcons: Record<Subject['color'], string> = {
  navy: 'bg-navy-100 text-navy-700',
  teal: 'bg-teal-100 text-teal-700',
  coral: 'bg-coral-100 text-coral-700',
  ice: 'bg-ice-100 text-ice-700',
};

export default function RoadmapOverview({
  subjects,
  onOpenSubject,
  onNewSubject,
  onDeleteSubject,
  quizRefreshKey,
}: RoadmapOverviewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const subjectToDelete = subjects.find((s) => s.id === confirmDeleteId) ?? null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-navy-400 text-sm mb-2">
          <Layers className="w-4 h-4" />
          <span>Your subjects</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-navy-800 mb-2">
          My roadmaps
        </h1>
        <p className="text-navy-500 text-sm sm:text-base">
          Each subject has its own day-by-day study plan. Click a subject to see its roadmap,
          or add new materials to create another.
        </p>
      </div>

      {/* Subject cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subjects.map((subject, index) => {
          const totalTopics = subject.roadmap.reduce(
            (sum, day) => sum + day.topics.length,
            0
          );
          const completedTopics = subject.roadmap.reduce(
            (sum, day) => sum + day.topics.filter((t) => t.completed).length,
            0
          );
          const progressPercent =
            totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

          return (
            <div
              key={subject.id}
              className="card p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-slide-up group relative"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Delete button */}
              <button
                onClick={() => setConfirmDeleteId(subject.id)}
                className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center
                  text-navy-300 hover:text-coral-600 hover:bg-coral-50
                  opacity-0 group-hover:opacity-100 transition-all duration-150"
                title="Delete subject"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenSubject(subject.id)}
                className="w-full text-left"
              >
                {/* Top row: icon + name */}
                <div className="flex items-start justify-between mb-4 pr-8">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorIcons[subject.color]}`}
                    >
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-lg text-navy-800">{subject.name}</h2>
                      <p className="text-navy-400 text-xs mt-0.5">
                        {totalTopics} topic{totalTopics !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-navy-200 group-hover:text-navy-500 group-hover:translate-x-0.5 transition-all mt-1" />
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-navy-500 text-xs font-medium">
                      {completedTopics} / {totalTopics} topics
                    </span>
                    <span className="text-navy-600 text-xs font-semibold">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="h-2 bg-navy-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${colorBars[subject.color]}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Exam date */}
                {subject.examDate && (
                  <div className="flex items-center gap-1.5 text-navy-400 text-xs">
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Exam: {subject.examDate}</span>
                  </div>
                )}
              </button>
            </div>
          );
        })}

        {/* New subject card */}
        <button
          onClick={onNewSubject}
          className="border-2 border-dashed border-navy-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3
            text-navy-400 hover:text-navy-600 hover:border-navy-300 hover:bg-navy-50
            transition-all duration-200 animate-slide-up min-h-[160px]"
          style={{ animationDelay: `${subjects.length * 80}ms` }}
        >
          <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-sm">New subject</p>
            <p className="text-xs mt-0.5">Upload materials to get started</p>
          </div>
        </button>
      </div>

      {/* Completed quizzes section */}
      <CompletedQuizzes refreshKey={quizRefreshKey} />

      {/* Delete confirmation modal */}
      {subjectToDelete && (
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
                <h3 className="font-serif text-lg text-navy-800">Delete subject</h3>
              </div>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="text-navy-300 hover:text-navy-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-navy-500 text-sm mb-6">
              Delete <span className="font-semibold text-navy-700">{subjectToDelete.name}</span> and all its
              roadmap topics? This will also remove its study sessions from your calendar.
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
                  onDeleteSubject(subjectToDelete.id);
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
