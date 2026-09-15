export type Screen = 'roadmap' | 'subject-roadmap' | 'upload' | 'calendar';

export interface UploadedItem {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'image' | 'text';
  size: string;
  uploadedAt: string;
}

export interface RoadmapTopic {
  id: string;
  title: string;
  subject: string;
  subjectId: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface RoadmapDay {
  id: string;
  dayNumber: number;
  date: string;
  topics: RoadmapTopic[];
}

export interface Subject {
  id: string;
  name: string;
  color: 'navy' | 'teal' | 'coral' | 'ice';
  examDate: string | null;
  roadmap: RoadmapDay[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  topic_title: string;
  subject_name: string;
  questions: QuizQuestion[];
  answers: (number | null)[];
  score: number;
  answered_count: number;
  total_questions: number;
  completed: boolean;
  created_at: string;
}

export interface ResumeQuizData {
  attemptId: string;
  questions: QuizQuestion[];
  answers: (number | null)[];
  score: number;
  answeredCount: number;
  totalQuestions: number;
  currentIndex: number;
}

export interface StudySession {
  id: string;
  day: number; // 0 = Monday, 6 = Sunday
  startHour: number; // 24h format
  endHour: number;
  title: string;
  subject: string;
  color: 'navy' | 'teal' | 'coral' | 'ice';
  missedCount: number; // number of times rescheduled
}

export interface ChatAttachment {
  id: string;
  filename: string;
  fileType: 'pdf' | 'docx' | 'image' | 'text';
  fileSize: string;
  status: 'processing' | 'ready';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
}
