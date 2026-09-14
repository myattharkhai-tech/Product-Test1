import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import RoadmapOverview from '@/components/RoadmapOverview';
import RoadmapScreen from '@/components/RoadmapScreen';
import UploadScreen from '@/components/UploadScreen';
import CalendarScreen from '@/components/CalendarScreen';
import QuizModal from '@/components/QuizModal';
import ChatPanel from '@/components/ChatPanel';
import type { Screen, RoadmapTopic, Subject } from '@/types';
import { mockSubjects } from '@/data/mockData';

function App() {
  const [screen, setScreen] = useState<Screen>('roadmap');
  const [quizTopic, setQuizTopic] = useState<RoadmapTopic | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  const handleQuizRequest = (topic: RoadmapTopic) => {
    setQuizTopic(topic);
  };

  const handleOpenSubject = (subjectId: string) => {
    setActiveSubjectId(subjectId);
    setScreen('subject-roadmap');
  };

  const handleBackToOverview = () => {
    setActiveSubjectId(null);
    setScreen('roadmap');
  };

  const handleNewSubject = () => {
    setScreen('upload');
  };

  const handleCreateRoadmap = (
    subject: Subject | null,
    isExisting: boolean,
    existingSubjectId: string | null
  ) => {
    if (isExisting && existingSubjectId && subject) {
      // For existing subjects, merge new topics into the existing roadmap
      {
        setSubjects((prev) =>
          prev.map((s) => {
            if (s.id !== existingSubjectId) return s;
            // Append new days after existing ones
            const existingDayCount = s.roadmap.length;
            const newDays = subject.roadmap.map((day, i) => ({
              ...day,
              dayNumber: existingDayCount + i + 1,
              id: `${s.id}-added-day-${existingDayCount + i + 1}`,
              topics: day.topics.map((t, j) => ({
                ...t,
                id: `${s.id}-added-t${existingDayCount + i + 1}-${j}`,
                subjectId: s.id,
                subject: s.name,
              })),
            }));
            return { ...s, roadmap: [...s.roadmap, ...newDays] };
          })
        );
        setActiveSubjectId(existingSubjectId);
        setScreen('subject-roadmap');
      }
    } else if (subject) {
      // New subject — add to the list
      setSubjects((prev) => [...prev, subject]);
      setScreen('roadmap');
    }
  };

  const handleFileProcessed = (
    _filename: string,
    _subjectName: string,
    _isExisting: boolean,
    _subjectId: string | null
  ) => {
    // Chat-uploaded files are handled by the ChatPanel itself now via the edge function
  };

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? null;

  return (
    <div className="flex min-h-screen bg-navy-50">
      <Sidebar current={screen} onNavigate={setScreen} />

      <div className="flex-1 flex flex-col min-w-0 pb-16 sm:pb-0">
        {/* Mobile header */}
        <header className="sm:hidden flex items-center gap-2.5 px-5 py-4 bg-navy-800 text-white sticky top-0 z-20">
          <div className="w-8 h-8 rounded-lg bg-ice-300 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-navy-800" />
          </div>
          <div>
            <h1 className="font-serif text-base leading-tight">StudyFlow AI</h1>
            <p className="text-navy-300 text-[10px]">From chaos to clarity</p>
          </div>
        </header>

        <main className="flex-1 flex min-w-0">
          <div className="flex-1 min-w-0">
            {screen === 'roadmap' && (
              <RoadmapOverview
                subjects={subjects}
                onOpenSubject={handleOpenSubject}
                onNewSubject={handleNewSubject}
              />
            )}
            {screen === 'subject-roadmap' && activeSubject && (
              <RoadmapScreen
                subject={activeSubject}
                onQuizRequest={handleQuizRequest}
                onBack={handleBackToOverview}
              />
            )}
            {screen === 'upload' && (
              <UploadScreen
                subjects={subjects}
                onCreateRoadmap={handleCreateRoadmap}
              />
            )}
            {screen === 'calendar' && <CalendarScreen />}
          </div>

          {/* Desktop chat panel — docked as a right column */}
          <ChatPanel
            onQuizRequest={handleQuizRequest}
            subjects={subjects}
            onFileProcessed={handleFileProcessed}
          />
        </main>
      </div>

      {/* Quiz modal — triggered from roadmap or chat */}
      <QuizModal topic={quizTopic} onClose={() => setQuizTopic(null)} />
    </div>
  );
}

export default App;
