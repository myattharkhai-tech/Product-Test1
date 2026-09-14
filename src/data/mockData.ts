import type {
  Subject,
  QuizQuestion,
  StudySession,
  ChatMessage,
  UploadedItem,
} from '@/types';

export const mockSubjects: Subject[] = [
  {
    id: 'subject-calc',
    name: 'Calculus I',
    color: 'navy',
    examDate: 'Oct 15',
    roadmap: [
      {
        id: 'calc-day-1',
        dayNumber: 1,
        date: 'Mon, Sep 15',
        topics: [
          { id: 'c-t1', title: 'Limits & Continuity', subject: 'Calculus I', subjectId: 'subject-calc', estimatedMinutes: 90, completed: false },
          { id: 'c-t2', title: 'Limit Laws & Squeeze Theorem', subject: 'Calculus I', subjectId: 'subject-calc', estimatedMinutes: 60, completed: false },
        ],
      },
      {
        id: 'calc-day-2',
        dayNumber: 2,
        date: 'Tue, Sep 16',
        topics: [
          { id: 'c-t3', title: 'Derivatives — Definition & Rules', subject: 'Calculus I', subjectId: 'subject-calc', estimatedMinutes: 120, completed: false },
        ],
      },
      {
        id: 'calc-day-3',
        dayNumber: 3,
        date: 'Wed, Sep 17',
        topics: [
          { id: 'c-t4', title: 'Chain Rule & Implicit Differentiation', subject: 'Calculus I', subjectId: 'subject-calc', estimatedMinutes: 90, completed: false },
        ],
      },
      {
        id: 'calc-day-4',
        dayNumber: 4,
        date: 'Thu, Sep 18',
        topics: [
          { id: 'c-t5', title: 'Review: Derivatives Practice Set', subject: 'Calculus I', subjectId: 'subject-calc', estimatedMinutes: 60, completed: false },
        ],
      },
      {
        id: 'calc-day-5',
        dayNumber: 5,
        date: 'Fri, Sep 19',
        topics: [
          { id: 'c-t6', title: 'Integrals — Antiderivatives', subject: 'Calculus I', subjectId: 'subject-calc', estimatedMinutes: 100, completed: false },
        ],
      },
      {
        id: 'calc-day-6',
        dayNumber: 6,
        date: 'Sat, Sep 20',
        topics: [
          { id: 'c-t7', title: 'Integration by Substitution', subject: 'Calculus I', subjectId: 'subject-calc', estimatedMinutes: 90, completed: false },
        ],
      },
      {
        id: 'calc-day-7',
        dayNumber: 7,
        date: 'Sun, Sep 21',
        topics: [
          { id: 'c-t8', title: 'Full Review & Self-Test', subject: 'Calculus I', subjectId: 'subject-calc', estimatedMinutes: 120, completed: false },
        ],
      },
    ],
  },
  {
    id: 'subject-dsa',
    name: 'DSA',
    color: 'teal',
    examDate: 'Oct 22',
    roadmap: [
      {
        id: 'dsa-day-1',
        dayNumber: 1,
        date: 'Mon, Sep 15',
        topics: [
          { id: 'd-t1', title: 'Arrays & Dynamic Arrays', subject: 'DSA', subjectId: 'subject-dsa', estimatedMinutes: 75, completed: false },
        ],
      },
      {
        id: 'dsa-day-2',
        dayNumber: 2,
        date: 'Tue, Sep 16',
        topics: [
          { id: 'd-t2', title: 'Linked Lists — Singly & Doubly', subject: 'DSA', subjectId: 'subject-dsa', estimatedMinutes: 90, completed: false },
        ],
      },
      {
        id: 'dsa-day-3',
        dayNumber: 3,
        date: 'Wed, Sep 17',
        topics: [
          { id: 'd-t3', title: 'Stacks & Queues', subject: 'DSA', subjectId: 'subject-dsa', estimatedMinutes: 60, completed: false },
        ],
      },
      {
        id: 'dsa-day-4',
        dayNumber: 4,
        date: 'Thu, Sep 18',
        topics: [
          { id: 'd-t4', title: 'Hash Tables & Collision Resolution', subject: 'DSA', subjectId: 'subject-dsa', estimatedMinutes: 85, completed: false },
        ],
      },
      {
        id: 'dsa-day-5',
        dayNumber: 5,
        date: 'Fri, Sep 19',
        topics: [
          { id: 'd-t5', title: 'Binary Trees & BSTs', subject: 'DSA', subjectId: 'subject-dsa', estimatedMinutes: 100, completed: false },
        ],
      },
      {
        id: 'dsa-day-6',
        dayNumber: 6,
        date: 'Sat, Sep 20',
        topics: [
          { id: 'd-t6', title: 'Heaps & Priority Queues', subject: 'DSA', subjectId: 'subject-dsa', estimatedMinutes: 80, completed: false },
        ],
      },
      {
        id: 'dsa-day-7',
        dayNumber: 7,
        date: 'Sun, Sep 21',
        topics: [
          { id: 'd-t7', title: 'Graphs — BFS & DFS', subject: 'DSA', subjectId: 'subject-dsa', estimatedMinutes: 110, completed: false },
        ],
      },
    ],
  },
];

export const mockQuizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What is the derivative of f(x) = x³?',
    options: ['3x²', 'x²', '3x', 'x⁴/4'],
    correctIndex: 0,
    explanation: 'Using the power rule: d/dx[xⁿ] = n·xⁿ⁻¹. So d/dx[x³] = 3x².',
  },
  {
    id: 'q2',
    question: 'Which of the following is the limit of sin(x)/x as x approaches 0?',
    options: ['0', '1', '∞', 'Undefined'],
    correctIndex: 1,
    explanation: 'This is a classic result: lim(x→0) sin(x)/x = 1, provable by the Squeeze Theorem.',
  },
  {
    id: 'q3',
    question: 'What does the chain rule state for d/dx[f(g(x))]?',
    options: [
      "f'(x) · g'(x)",
      "f'(g(x)) · g'(x)",
      "f(g'(x))",
      "f'(x) + g'(x)",
    ],
    correctIndex: 1,
    explanation: 'The chain rule: d/dx[f(g(x))] = f\'(g(x)) · g\'(x). You differentiate the outer function, then multiply by the derivative of the inner.',
  },
];

export const mockStudySessions: StudySession[] = [
  { id: 's1', day: 0, startHour: 9, endHour: 10.5, title: 'Limits & Continuity', subject: 'Calculus I', color: 'navy', missedCount: 0 },
  { id: 's2', day: 0, startHour: 14, endHour: 15, title: 'Arrays & Dynamic Arrays', subject: 'DSA', color: 'teal', missedCount: 0 },
  { id: 's3', day: 1, startHour: 10, endHour: 12, title: 'Derivatives — Definition', subject: 'Calculus I', color: 'navy', missedCount: 0 },
  { id: 's4', day: 2, startHour: 9, endHour: 10.5, title: 'Chain Rule', subject: 'Calculus I', color: 'navy', missedCount: 1 },
  { id: 's5', day: 2, startHour: 13, endHour: 14.25, title: 'Stacks & Queues', subject: 'DSA', color: 'teal', missedCount: 0 },
  { id: 's6', day: 3, startHour: 11, endHour: 12.5, title: 'Hash Tables', subject: 'DSA', color: 'teal', missedCount: 0 },
  { id: 's7', day: 3, startHour: 15, endHour: 16, title: 'Derivatives Practice', subject: 'Calculus I', color: 'navy', missedCount: 0 },
  { id: 's8', day: 4, startHour: 9, endHour: 10.5, title: 'Integrals — Antiderivatives', subject: 'Calculus I', color: 'navy', missedCount: 0 },
  { id: 's9', day: 4, startHour: 14, endHour: 15.25, title: 'Binary Trees & BSTs', subject: 'DSA', color: 'teal', missedCount: 3 },
  { id: 's10', day: 5, startHour: 10, endHour: 11.5, title: 'Integration by Substitution', subject: 'Calculus I', color: 'navy', missedCount: 0 },
  { id: 's11', day: 6, startHour: 14, endHour: 16, title: 'Full Review', subject: 'Calculus I', color: 'coral', missedCount: 0 },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    content: "Hi! I'm your StudyFlow AI assistant. Ask me to explain a topic, quiz you on something, or upload new materials right here in the chat.",
    timestamp: new Date().toISOString(),
  },
];

// TODO: replace with real Gemini call
export function getMockChatResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('quiz me') || lower.includes('quiz')) {
    return "Sure! I've opened a quiz for you. You can find it on the right side of your screen. Good luck!";
  }

  if (lower.includes('explain') || lower.includes('what is') || lower.includes('how does')) {
    return `Great question! Here's a quick explanation:\n\nBased on your roadmap, this topic builds on the previous day's material. I'd recommend reviewing your notes from the prior session first, then working through 2-3 practice problems to solidify your understanding.\n\nWould you like me to quiz you on this topic?`;
  }

  if (lower.includes('help') || lower.includes('stuck') || lower.includes('confused')) {
    return "I'm here to help! Try asking me to:\n• Explain a topic from your roadmap\n• Quiz you on a specific subject\n• Suggest a study strategy\n\nYou can also attach a PDF or photo using the paperclip icon below.";
  }

  if (lower.includes('schedule') || lower.includes('plan') || lower.includes('calendar')) {
    return "Your study schedule is designed to balance workload across the week. Check the Calendar tab to see your session blocks. You can connect Google Calendar to sync these sessions with your personal schedule.";
  }

  return "That's a great question! I'll have a full answer for you once the AI integration is connected. For now, I can help you navigate your roadmap, start a quiz, or explain a topic — just ask!";
}

// TODO: replace with real Gemini subject-detection call
// Mock: detects subject from filename/content keywords and returns a suggestion
export function detectSubject(
  filename: string,
  existingSubjects: Subject[]
): { subjectName: string; isExisting: boolean; subjectId: string | null } {
  const lower = filename.toLowerCase();

  const keywordMap: Record<string, string[]> = {
    'Calculus I': ['calc', 'derivative', 'integral', 'limit', 'continuity'],
    'DSA': ['dsa', 'algorithm', 'data structure', 'array', 'linked list', 'tree', 'graph', 'hash', 'stack', 'queue', 'heap'],
  'Physics 101': ['physics', 'newton', 'momentum', 'energy', 'force', 'motion'],
  'Organic Chemistry': ['chem', 'organic', 'molecule', 'reaction', 'bond'],
  'Linear Algebra': ['linear', 'matrix', 'vector', 'eigen', 'determinant'],
  'Statistics': ['stat', 'probability', 'distribution', 'regression', 'hypothesis'],
  'Discrete Math': ['discrete', 'logic', 'set theory', 'combinatorics', 'proof'],
  'Economics': ['econ', 'market', 'supply', 'demand', 'gdp', 'inflation'],
  'Biology': ['bio', 'cell', 'genetics', 'evolution', 'organism'],
  'Psychology': ['psych', 'behavior', 'cognitive', 'freud', 'conditioning'],
  'History': ['history', 'war', 'revolution', 'empire', 'ancient'],
  };

  for (const [subjectName, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const existing = existingSubjects.find((s) => s.name === subjectName);
      if (existing) {
        return { subjectName, isExisting: true, subjectId: existing.id };
      }
      return { subjectName, isExisting: false, subjectId: null };
    }
  }

  // Default: unknown subject
  const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
  const guessedName = baseName
    .split(' ')
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { subjectName: guessedName || 'New Subject', isExisting: false, subjectId: null };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileType(name: string): UploadedItem['type'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  return 'text';
}
