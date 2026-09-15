import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import RoadmapOverview from '@/components/RoadmapOverview';
import RoadmapScreen from '@/components/RoadmapScreen';
import UploadScreen from '@/components/UploadScreen';
import CalendarScreen from '@/components/CalendarScreen';
import QuizModal from '@/components/QuizModal';
import ChatPanel from '@/components/ChatPanel';
import UpgradeModal from '@/components/UpgradeModal';
import { PlanProvider, usePlan } from '@/lib/usePlan';
import type { Screen, RoadmapTopic, QuizAttempt, Subject } from '@/types';
import { mockSubjects } from '@/data/mockData';

const FREE_SUBJECT_LIMIT = 2;

function AppContent() {
  const { plan } = usePlan();
  const [screen, setScreen] = useState<Screen>('roadmap');
  const [quizTopic, setQuizTopic] = useState<RoadmapTopic | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [quizRefreshKey, setQuizRefreshKey] = useState(0);
  const [resumeAttempt, setResumeAttempt] = useState<QuizAttempt | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);

  const showUpgrade = (reason?: string) => {
    setUpgradeReason(reason);
    setUpgradeOpen(true);
  };

  const handleQuizRequest = (topic: RoadmapTopic) => {
    setResumeAttempt(null);
    setQuizTopic(topic);
  };

  const handleResumeQuiz = (attempt: QuizAttempt) => {
    setQuizTopic(null);
    setResumeAttempt(attempt);
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
    if (plan === 'free' && subjects.length >= FREE_SUBJECT_LIMIT) {
      showUpgrade(
        `You've reached the Free plan limit of ${FREE_SUBJECT_LIMIT} active subjects. Upgrade to Pro for unlimited subjects.`,
      );
      return;
    }
    setScreen('upload');
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    if (activeSubjectId === subjectId) {
      setActiveSubjectId(null);
      setScreen('roadmap');
    }
  };

  const handleCreateRoadmap = (
    subject: Subject | null,
    isExisting: boolean,
    existingSubjectId: string | null
  ) => {
    if (isExisting && existingSubjectId && subject) {
      {
        setSubjects((prev) =>
          prev.map((s) => {
            if (s.id !== existingSubjectId) return s;
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
      setSubjects((prev) => [...prev, subject]);
      setScreen('roadmap');
    }
  };

  const handleFileProcessed = () => {};

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? null;

  return (
    <div className="flex min-h-screen bg-navy-50">
      <Sidebar current={screen} onNavigate={setScreen} />

      <div className="flex-1 flex flex-col min-w-0 pb-16 sm:pb-0">
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
                onDeleteSubject={handleDeleteSubject}
                quizRefreshKey={quizRefreshKey}
                onResume={handleResumeQuiz}
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
            {screen === 'calendar' && <CalendarScreen subjects={subjects} />}
          </div>

          <ChatPanel
            onQuizRequest={handleQuizRequest}
            subjects={subjects}
            onFileProcessed={handleFileProcessed}
            onUpgradeNeeded={() => showUpgrade(
              "You've reached your daily limit of 20 AI chat messages on the Free plan. Upgrade to Pro for unlimited messages.",
            )}
          />
        </main>
      </div>

      <QuizModal
        topic={quizTopic}
        resumeAttempt={resumeAttempt}
        onClose={() => {
          setQuizTopic(null);
          setResumeAttempt(null);
        }}
        onQuizComplete={() => setQuizRefreshKey((k) => k + 1)}
      />

      <UpgradeModal
        open={upgradeOpen}
        reason={upgradeReason}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <PlanProvider>
      <AppContent />
    </PlanProvider>
  );
}
