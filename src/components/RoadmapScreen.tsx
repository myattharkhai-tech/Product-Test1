import { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Circle,
  HelpCircle,
  BookOpen,
  CalendarDays,
  ArrowLeft,
} from 'lucide-react';
import type { RoadmapDay, RoadmapTopic, Subject } from '@/types';

interface RoadmapScreenProps {
  subject: Subject;
  onQuizRequest: (topic: RoadmapTopic) => void;
  onBack: () => void;
}

export default function RoadmapScreen({ subject, onQuizRequest, onBack }: RoadmapScreenProps) {
  const [roadmap, setRoadmap] = useState<RoadmapDay[]>(subject.roadmap);

  const toggleComplete = (dayId: string, topicId: string) => {
    setRoadmap((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              topics: day.topics.map((topic) =>
                topic.id === topicId
                  ? { ...topic, completed: !topic.completed }
                  : topic
              ),
            }
          : day
      )
    );
  };

  const totalTopics = roadmap.reduce((sum, day) => sum + day.topics.length, 0);
  const completedTopics = roadmap.reduce(
    (sum, day) => sum + day.topics.filter((t) => t.completed).length,
    0
  );
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-navy-500 hover:text-navy-800 text-sm font-medium mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All subjects
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-navy-400 text-sm mb-2">
          <CalendarDays className="w-4 h-4" />
          <span>7-day study plan</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-navy-800 mb-2">
          {subject.name}
        </h1>
        <p className="text-navy-500 text-sm sm:text-base">
          A calm, day-by-day plan to get you from chaos to clarity. Tap a topic to mark it done,
          or quiz yourself when you're ready.
        </p>
      </div>

      {/* Progress bar */}
      <div className="card p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-navy-600 text-sm font-medium">Overall progress</span>
          <span className="text-navy-700 text-sm font-semibold">
            {completedTopics} / {totalTopics} topics · {progressPercent}%
          </span>
        </div>
        <div className="h-2.5 bg-navy-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] sm:left-[23px] top-2 bottom-2 w-0.5 bg-navy-100" />

        <div className="space-y-5">
          {roadmap.map((day, index) => (
            <div
              key={day.id}
              className="relative animate-slide-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Day marker */}
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="relative z-10 shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-navy-800 text-white flex items-center justify-center font-semibold text-sm sm:text-base shadow-md">
                    {day.dayNumber}
                  </div>
                </div>

                {/* Day content */}
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-baseline gap-2 mb-3">
                    <h2 className="font-serif text-lg sm:text-xl text-navy-800">
                      Day {day.dayNumber}
                    </h2>
                    <span className="text-navy-400 text-sm">{day.date}</span>
                  </div>

                  <div className="space-y-2.5">
                    {day.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className={`card p-4 transition-all duration-200 hover:shadow-md ${
                          topic.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleComplete(day.id, topic.id)}
                            className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                          >
                            {topic.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-teal-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-navy-200 hover:text-navy-400" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-navy-800 font-medium text-sm sm:text-base ${
                                topic.completed ? 'line-through text-navy-400' : ''
                              }`}
                            >
                              {topic.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-xs text-navy-400">
                                <BookOpen className="w-3 h-3" />
                                {topic.subject}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-navy-400">
                                <Clock className="w-3 h-3" />
                                {topic.estimatedMinutes} min
                              </span>
                            </div>
                          </div>

                          {/* Quiz me button */}
                          <button
                            onClick={() => onQuizRequest(topic)}
                            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-navy-500 hover:text-coral-500 bg-navy-50 hover:bg-coral-50 rounded-lg px-2.5 py-1.5 transition-all"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Quiz me</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* End marker */}
      <div className="relative flex items-center gap-4 sm:gap-5 mt-5">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal-400 text-white flex items-center justify-center shadow-md shrink-0">
          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <p className="font-serif text-lg text-navy-700">You're all set!</p>
          <p className="text-navy-400 text-sm">Complete each day to stay on track.</p>
        </div>
      </div>
    </div>
  );
}
