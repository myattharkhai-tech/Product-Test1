import { BookOpen, Plus, ChevronRight, CalendarClock, Layers } from 'lucide-react';
import type { Subject } from '@/types';

interface RoadmapOverviewProps {
  subjects: Subject[];
  onOpenSubject: (subjectId: string) => void;
  onNewSubject: () => void;
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
}: RoadmapOverviewProps) {
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
            <button
              key={subject.id}
              onClick={() => onOpenSubject(subject.id)}
              className="card p-5 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-slide-up group"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Top row: icon + name */}
              <div className="flex items-start justify-between mb-4">
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
                <ChevronRight className="w-5 h-5 text-navy-200 group-hover:text-navy-500 group-hover:translate-x-0.5 transition-all" />
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
    </div>
  );
}
