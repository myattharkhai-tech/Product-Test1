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
