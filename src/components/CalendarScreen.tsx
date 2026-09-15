import { useState, useMemo } from 'react';
import { Calendar, Check, Link2, Unlink, Clock3, BookOpen } from 'lucide-react';
import type { Subject, StudySession } from '@/types';

interface CalendarScreenProps {
  subjects: Subject[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

const colorClasses: Record<StudySession['color'], string> = {
  navy: 'bg-navy-100 border-navy-300 text-navy-700',
  teal: 'bg-teal-100 border-teal-300 text-teal-700',
  coral: 'bg-coral-100 border-coral-300 text-coral-700',
  ice: 'bg-ice-100 border-ice-300 text-ice-700',
};

const dotColors: Record<StudySession['color'], string> = {
  navy: 'bg-navy-400',
  teal: 'bg-teal-400',
  coral: 'bg-coral-400',
  ice: 'bg-ice-400',
};

function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = hour % 1 !== 0 ? '30' : '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${m} ${period}`;
}

// ── Derive study sessions from subjects ───────────────────────────────
// Each roadmap day maps to a calendar day (0=Mon … 6=Sun).
// The first topic of each day gets a time slot; subsequent topics stack
// immediately after. Sessions are regenerated whenever subjects change,
// so adding or deleting a subject automatically updates the calendar.
const TIME_SLOTS = [9, 10.5, 14, 15.5, 17];

function deriveSessions(subjects: Subject[]): StudySession[] {
  const sessions: StudySession[] = [];

  for (const subject of subjects) {
    for (const day of subject.roadmap) {
      const dayIndex = (day.dayNumber - 1) % 7;
      day.topics.forEach((topic, topicIdx) => {
        const slotIdx = (day.dayNumber - 1 + topicIdx) % TIME_SLOTS.length;
        const startHour = TIME_SLOTS[slotIdx];
        const durationHours = Math.max(0.5, topic.estimatedMinutes / 60);
        sessions.push({
          id: `${topic.id}-session`,
          day: dayIndex,
          startHour,
          endHour: startHour + durationHours,
          title: topic.title,
          subject: subject.name,
          color: subject.color,
          missedCount: 0,
        });
      });
    }
  }

  return sessions;
}

export default function CalendarScreen({ subjects }: CalendarScreenProps) {
  const [googleConnected, setGoogleConnected] = useState(false);

  const sessions = useMemo(() => deriveSessions(subjects), [subjects]);

  const totalSessions = sessions.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-navy-400 text-sm mb-2">
            <Calendar className="w-4 h-4" />
            <span>Week of Sep 15 – 21</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-navy-800">
            Study calendar
          </h1>
          <p className="text-navy-500 text-sm mt-1">
            {totalSessions > 0
              ? `${totalSessions} study session${totalSessions !== 1 ? 's' : ''} scheduled from your roadmaps`
              : 'No study sessions yet — add a subject to see it here'}
          </p>
        </div>

        {/* Google Calendar connect button */}
        <button
          onClick={() => setGoogleConnected((v) => !v)}
          className={`
            flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium
            transition-all duration-200 active:scale-[0.98] shrink-0
            ${
              googleConnected
                ? 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'
                : 'bg-navy-800 text-white hover:bg-navy-700'
            }
          `}
        >
          {googleConnected ? (
            <>
              <Check className="w-4 h-4" />
              Google Calendar connected
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              Connect Google Calendar
            </>
          )}
        </button>
      </div>

      {googleConnected && (
        <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 mb-4 animate-fade-in">
          <p className="text-teal-700 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            Your study sessions are syncing to Google Calendar.
          </p>
          <button
            onClick={() => setGoogleConnected(false)}
            className="text-teal-600 hover:text-teal-800 text-xs flex items-center gap-1 transition-colors"
          >
            <Unlink className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      )}

      {totalSessions === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-navy-300" />
          </div>
          <h3 className="font-serif text-lg text-navy-700 mb-1">No sessions to show</h3>
          <p className="text-navy-400 text-sm max-w-xs">
            Create a subject and generate a roadmap — study sessions will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-navy-100">
              <div className="p-3" />
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-navy-500 font-medium text-xs sm:text-sm border-l border-navy-100"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative overflow-x-auto">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[700px]">
                {/* Hour labels */}
                <div className="flex flex-col">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b border-navy-50 flex items-start justify-end pr-2 pt-1"
                    >
                      <span className="text-navy-300 text-xs">{formatHour(hour)}</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS.map((_, dayIdx) => (
                  <div
                    key={dayIdx}
                    className="border-l border-navy-100 relative"
                  >
                    {HOURS.map((hour) => (
                      <div key={hour} className="h-16 border-b border-navy-50" />
                    ))}

                    {/* Session blocks */}
                    {sessions
                      .filter((s) => s.day === dayIdx)
                      .map((session) => {
                        const top = (session.startHour - 8) * 64; // 64px per hour
                        const height = (session.endHour - session.startHour) * 64;
                        return (
                          <div
                            key={session.id}
                            className={`absolute left-1 right-1 rounded-lg border px-2 py-1.5 text-xs overflow-hidden transition-all hover:z-10 hover:shadow-md ${colorClasses[session.color]}`}
                            style={{
                              top: `${top}px`,
                              height: `${height - 4}px`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{session.title}</p>
                                <p className="opacity-70 text-[10px] mt-0.5 flex items-center gap-1">
                                  <Clock3 className="w-2.5 h-2.5" />
                                  {formatHour(session.startHour)}
                                </p>
                              </div>
                              {session.missedCount > 0 && (
                                <span
                                  className="shrink-0 inline-flex items-center justify-center
                                    bg-coral-400 text-white text-[10px] font-bold
                                    rounded-full min-w-[18px] h-[18px] px-1
                                    shadow-sm"
                                  title={`Rescheduled ${session.missedCount} time${session.missedCount !== 1 ? 's' : ''}`}
                                >
                                  {session.missedCount}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-navy-500">
            <span className="font-medium">Legend:</span>
            {(['navy', 'teal', 'coral', 'ice'] as const).map((color) => {
              const hasSubject = subjects.some((s) => s.color === color);
              if (!hasSubject) return null;
              const subjectName = subjects.find((s) => s.color === color)?.name;
              return (
                <div key={color} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded ${dotColors[color]}`} />
                  <span>{subjectName ?? color}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="inline-flex items-center justify-center bg-coral-400 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px]">
                N
              </span>
              <span>= missed/rescheduled N times</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
