import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Type,
  X,
  Sparkles,
  FileUp,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { UploadedItem, Subject } from '@/types';
import { formatFileSize, getFileType } from '@/data/mockData';
import { generateRoadmap, roadmapResultToSubject } from '@/lib/api';

interface UploadScreenProps {
  subjects: Subject[];
  onCreateRoadmap: (subject: Subject | null, isExisting: boolean, existingSubjectId: string | null) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PHOTOS = 10;

interface DetectedSubject {
  subjectName: string;
  isExisting: boolean;
  subjectId: string | null;
  sourceFile: string;
  generatedSubject: Subject | null;
}

function getFileIcon(type: UploadedItem['type']) {
  switch (type) {
    case 'pdf':
    case 'docx':
      return <FileText className="w-5 h-5" />;
    case 'image':
      return <ImageIcon className="w-5 h-5" />;
    case 'text':
      return <Type className="w-5 h-5" />;
  }
}

export default function UploadScreen({ subjects, onCreateRoadmap }: UploadScreenProps) {
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubject, setConfirmSubject] = useState<DetectedSubject | null>(null);
  const [editName, setEditName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);

    const newItems: UploadedItem[] = [];
    const files = Array.from(fileList);

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 20MB limit.`);
        continue;
      }
      const type = getFileType(file.name);
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        type,
        size: formatFileSize(file.size),
        uploadedAt: new Date().toISOString(),
      });
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddPastedText = () => {
    if (!pastedText.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: `Pasted text (${pastedText.trim().length} chars)`,
        type: 'text',
        size: `${pastedText.trim().length} chars`,
        uploadedAt: new Date().toISOString(),
      },
    ]);
    setPastedText('');
  };

  const handleCreateRoadmap = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const filenames = items
        .filter((item) => item.type !== 'text')
        .map((item) => item.name);
      const textItem = items.find((item) => item.type === 'text');
      const textContent = textItem
        ? textItem.name
        : '';

      const result = await generateRoadmap({
        textContent,
        filenames,
        existingSubjects: subjects,
      });

      // Check if the detected subject matches an existing one
      const existingSubject = subjects.find(
        (s) => s.name.toLowerCase() === result.subject_name.toLowerCase()
      );

      const generatedSubject = roadmapResultToSubject(result, 'ice');

      setIsProcessing(false);
      setConfirmSubject({
        subjectName: result.subject_name,
        isExisting: !!existingSubject,
        subjectId: existingSubject?.id ?? null,
        sourceFile: items[0].name,
        generatedSubject,
      });
      setEditName(result.subject_name);
    } catch (err) {
      setIsProcessing(false);
      const message = err instanceof Error ? err.message : 'Failed to generate roadmap';
      setError(message);
    }
  };

  const handleConfirmSubject = () => {
    if (!confirmSubject) return;
    const finalName = editName.trim() || confirmSubject.subjectName;

    // If user renamed or it's new, update the subject name
    let subjectToCreate = confirmSubject.generatedSubject;
    if (subjectToCreate && finalName !== confirmSubject.subjectName) {
      subjectToCreate = {
        ...subjectToCreate,
        name: finalName,
        roadmap: subjectToCreate.roadmap.map((day) => ({
          ...day,
          topics: day.topics.map((topic) => ({
            ...topic,
            subject: finalName,
          })),
        })),
      };
    }

    onCreateRoadmap(
      subjectToCreate ?? confirmSubject.generatedSubject ?? null,
      confirmSubject.isExisting,
      confirmSubject.subjectId
    );
    setConfirmSubject(null);
    setItems([]);
  };

  const totalItems = items.length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl text-navy-800 mb-2">
          Upload your study materials
        </h1>
        <p className="text-navy-500 text-sm sm:text-base">
          Drop your lecture notes, slides, or readings here. StudyFlow AI will detect the subject
          and add it to the right roadmap — or create a new one.
        </p>
      </div>

      {/* Drag & drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 sm:p-12
          cursor-pointer transition-all duration-200
          ${
            isDragging
              ? 'border-navy-400 bg-ice-100 scale-[1.01]'
              : 'border-navy-200 bg-navy-50/50 hover:border-navy-300 hover:bg-navy-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-navy-100 flex items-center justify-center mb-4">
            <Upload className="w-7 h-7 text-navy-500" />
          </div>
          <p className="text-navy-700 font-medium mb-1">
            Drag & drop files here, or click to browse
          </p>
          <p className="text-navy-400 text-xs">
            PDF or DOCX — max 20MB per file
          </p>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="btn-ghost flex items-center gap-2"
            >
              <FileUp className="w-4 h-4" />
              Choose files
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                photoInputRef.current?.click();
              }}
              className="btn-ghost flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Add photos
              <span className="text-navy-300 text-xs">(max {MAX_PHOTOS})</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-coral-50 border border-coral-200 rounded-xl px-4 py-3 text-coral-700 text-sm animate-fade-in flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Pasted text */}
      <div className="mt-6">
        <label className="block text-navy-600 font-medium text-sm mb-2">
          Or paste text directly
        </label>
        <div className="flex gap-3">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your lecture notes, syllabus, or any text..."
            className="input-field resize-none h-24"
            rows={3}
          />
          <button
            onClick={handleAddPastedText}
            disabled={!pastedText.trim()}
            className="btn-primary whitespace-nowrap self-start"
          >
            Add text
          </button>
        </div>
      </div>

      {/* Uploaded items list */}
      {totalItems > 0 && (
        <div className="mt-8 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-navy-700 font-medium text-sm">
              {totalItems} item{totalItems !== 1 ? 's' : ''} uploaded
            </h2>
            <button
              onClick={() => setItems([])}
              className="text-navy-400 hover:text-coral-500 text-xs transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="card flex items-center gap-3 px-4 py-3 animate-scale-in"
              >
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-navy-500 shrink-0">
                  {getFileIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-navy-700 text-sm font-medium truncate">{item.name}</p>
                  <p className="text-navy-400 text-xs uppercase tracking-wide">{item.size}</p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-300 hover:text-coral-500 hover:bg-coral-50 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Create roadmap button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleCreateRoadmap}
              disabled={isProcessing}
              className="btn-accent flex items-center gap-2 px-6 py-3 text-base animate-slide-up"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing materials...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create roadmap of this
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Subject confirmation modal */}
      {confirmSubject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmSubject(null)}
        >
          <div
            className="card w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-ice-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-navy-600" />
              </div>
              <div>
                <h2 className="font-serif text-lg text-navy-800">Subject detected</h2>
                <p className="text-navy-400 text-xs">
                  From: {confirmSubject.sourceFile}
                </p>
              </div>
            </div>

            {confirmSubject.isExisting ? (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5">
                <p className="text-teal-700 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  This matches your existing <strong>{confirmSubject.subjectName}</strong> roadmap.
                  New topics will be added to it.
                </p>
              </div>
            ) : (
              <p className="text-navy-500 text-sm mb-4">
                This looks like a new subject. Is this name right? You can rename it before
                creating the roadmap.
              </p>
            )}

            <div className="mb-5">
              <label className="block text-navy-600 font-medium text-sm mb-2">
                Subject name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-field"
                autoFocus
              />
            </div>

            {confirmSubject.generatedSubject && (
              <div className="mb-5 bg-navy-50 rounded-xl p-4 max-h-40 overflow-y-auto">
                <p className="text-navy-500 text-xs font-medium mb-2">
                  Generated {confirmSubject.generatedSubject.roadmap.length}-day roadmap:
                </p>
                <div className="space-y-1">
                  {confirmSubject.generatedSubject.roadmap.slice(0, 4).map((day) => (
                    <div key={day.id} className="text-xs text-navy-600">
                      <span className="font-medium">Day {day.dayNumber}:</span>{' '}
                      {day.topics.map((t) => t.title).join(', ')}
                    </div>
                  ))}
                  {confirmSubject.generatedSubject.roadmap.length > 4 && (
                    <p className="text-navy-400 text-xs">
                      + {confirmSubject.generatedSubject.roadmap.length - 4} more days...
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmSubject(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubject}
                className="btn-primary flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {confirmSubject.isExisting ? 'Add to roadmap' : 'Create roadmap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
