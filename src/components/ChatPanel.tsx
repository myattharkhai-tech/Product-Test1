import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Loader2,
  Check,
} from 'lucide-react';
import type { ChatMessage, ChatAttachment, RoadmapTopic, Subject } from '@/types';
import { formatFileSize, getFileType } from '@/data/mockData';
import { generateRoadmap, streamChatMessage } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface ChatPanelProps {
  onQuizRequest: (topic: RoadmapTopic) => void;
  subjects: Subject[];
  onFileProcessed: (filename: string, subjectName: string, isExisting: boolean, subjectId: string | null) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PHOTOS = 10;

function getAttachIcon(fileType: ChatAttachment['fileType']) {
  switch (fileType) {
    case 'pdf':
    case 'docx':
      return <FileText className="w-4 h-4" />;
    case 'image':
      return <ImageIcon className="w-4 h-4" />;
    case 'text':
      return <FileText className="w-4 h-4" />;
  }
}

export default function ChatPanel({ onQuizRequest, subjects, onFileProcessed }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const sendingRef = useRef(false);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Load chat history from database on mount
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id, role, content, created_at')
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;

        if (data && data.length > 0) {
          const loaded: ChatMessage[] = data.map((row) => ({
            id: row.id,
            role: row.role as 'user' | 'assistant',
            content: row.content,
            timestamp: row.created_at,
          }));
          setMessages(loaded);
        } else {
          // No history — seed with the welcome message
          const welcome: ChatMessage = {
            id: `${Date.now()}-welcome`,
            role: 'assistant',
            content: "Hi! I'm your StudyFlow AI assistant. Ask me to explain a topic, quiz you on something, or upload new materials right here in the chat.",
            timestamp: new Date().toISOString(),
          };
          setMessages([welcome]);
          await supabase.from('chat_messages').insert({
            id: welcome.id,
            role: 'assistant',
            content: welcome.content,
          });
        }
      } catch {
        // Fallback to welcome message if DB unavailable
        setMessages([{
          id: `${Date.now()}-welcome`,
          role: 'assistant',
          content: "Hi! I'm your StudyFlow AI assistant. Ask me to explain a topic, quiz you on something, or upload new materials right here in the chat.",
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setIsLoadingHistory(false);
      }
    })();
  }, []);

  // Persist a message to the database
  const persistMessage = useCallback(async (msg: ChatMessage) => {
    try {
      await supabase.from('chat_messages').insert({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      });
    } catch {
      // Silent fail — chat still works in-memory
    }
  }, []);

  useEffect(() => {
    if (mobileScrollRef.current) mobileScrollRef.current.scrollTop = mobileScrollRef.current.scrollHeight;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArr = Array.from(files).slice(0, MAX_PHOTOS);

    for (const file of fileArr) {
      if (file.size > MAX_FILE_SIZE) continue;

      const attachmentId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const fileType = getFileType(file.name);
      const attachment: ChatAttachment = {
        id: attachmentId,
        filename: file.name,
        fileType,
        fileSize: formatFileSize(file.size),
        status: 'processing',
      };

      setPendingAttachments((prev) => [...prev, attachment]);

      // Call the real edge function to process the file
      // The edge function uses Gemini to detect subject + generate roadmap
      generateRoadmap({
        textContent: '',
        filenames: [file.name],
        existingSubjects: subjects,
      })
        .then((result) => {
          setPendingAttachments((prev) =>
            prev.map((a) =>
              a.id === attachmentId ? { ...a, status: 'ready' } : a
            )
          );

          // Check if it matches an existing subject
          const existingSubject = subjects.find(
            (s) => s.name.toLowerCase() === result.subject_name.toLowerCase()
          );
          const isExisting = !!existingSubject;
          onFileProcessed(
            file.name,
            result.subject_name,
            isExisting,
            existingSubject?.id ?? null
          );
        })
        .catch(() => {
          // Mark as ready even on error so the user can still send
          setPendingAttachments((prev) =>
            prev.map((a) =>
              a.id === attachmentId ? { ...a, status: 'ready' } : a
            )
          );
        });
    }
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const sendMessage = () => {
    if (sendingRef.current || (!input.trim() && !pendingAttachments.some((a) => a.status === 'ready'))) return;
    sendingRef.current = true;
    setIsSending(true);

    const attachmentsToSend = pendingAttachments.filter((a) => a.status === 'ready');
    const processingAttachments = pendingAttachments.filter((a) => a.status === 'processing');

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    persistMessage(userMessage);
    setInput('');
    setPendingAttachments(processingAttachments);
    setIsTyping(true);

    const attachmentNames = attachmentsToSend.map((a) => a.filename);
    const chatHistory = messages
      .filter((m) => m.content)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = `${Date.now()}-assistant`;
    let accumulated = '';
    let receivedAny = false;

    (async () => {
      try {
        for await (const chunk of streamChatMessage({
          message: userMessage.content || '',
          history: chatHistory,
          subjects,
          attachments: attachmentNames,
        })) {
          if (!receivedAny) {
            receivedAny = true;
            setIsTyping(false);
            setMessages((prev) => [...prev, {
              id: assistantId,
              role: 'assistant' as const,
              content: chunk,
              timestamp: new Date().toISOString(),
            }]);
            accumulated = chunk;
          } else {
            accumulated += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: accumulated } : m
              )
            );
          }
        }

        if (!receivedAny) {
          setIsTyping(false);
          const fallbackContent = 'The assistant returned an empty response. Please try rephrasing.';
          const fallbackMsg: ChatMessage = {
            id: assistantId,
            role: 'assistant' as const,
            content: fallbackContent,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, fallbackMsg]);
          persistMessage(fallbackMsg);
        } else {
          // Persist the final accumulated assistant response
          persistMessage({
            id: assistantId,
            role: 'assistant',
            content: accumulated,
            timestamp: new Date().toISOString(),
          });
        }

        if (userMessage.content.toLowerCase().includes('quiz')) {
          onQuizRequest({
            id: 'chat-quiz',
            title: 'Quick Quiz',
            subject: 'Mixed',
            subjectId: '',
            estimatedMinutes: 15,
            completed: false,
          });
        }
      } catch (error) {
        setIsTyping(false);
        if (!receivedAny) {
          const errorContent = error instanceof Error ? error.message : 'Having trouble reaching the assistant — try again in a moment.';
          const errorMsg: ChatMessage = {
            id: assistantId,
            role: 'assistant' as const,
            content: errorContent,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          persistMessage(errorMsg);
        } else {
          setMessages((prev) => prev.map((m) => m.id === assistantId
            ? { ...m, content: accumulated + '\n\nReply interrupted. Please try again.' }
            : m));
        }
      } finally {
        sendingRef.current = false;
        setIsSending(false);
        setIsTyping(false);
      }
    })();
  };

  const hasProcessing = pendingAttachments.some((a) => a.status === 'processing');

  return (
    <>
      {/* Floating button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-navy-800 text-white
            shadow-lg flex items-center justify-center transition-all duration-200
            hover:bg-navy-700 hover:scale-105 active:scale-95 animate-fade-in"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Desktop: docked right column (split view) */}
      {isOpen && (
        <div className="hidden sm:flex flex-col w-80 lg:w-96 shrink-0 border-l border-navy-100 bg-white sticky top-0 h-screen animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-navy-800 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-ice-300" />
              </div>
              <div>
                <p className="font-medium text-sm">StudyFlow AI</p>
                <p className="text-navy-300 text-xs">Ask me anything</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-300 hover:text-white hover:bg-navy-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-navy-50/30">
            {isLoadingHistory && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-navy-300" />
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`
                    max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm
                    ${msg.role === 'user'
                      ? 'bg-navy-700 text-white rounded-br-md'
                      : 'bg-white text-navy-700 border border-navy-100 rounded-bl-md'
                    }
                  `}
                >
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 space-y-1.5">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${
                            msg.role === 'user' ? 'bg-navy-600/50' : 'bg-navy-50'
                          }`}
                        >
                          <span className={msg.role === 'user' ? 'text-ice-300' : 'text-navy-500'}>
                            {getAttachIcon(att.fileType)}
                          </span>
                          <span className="truncate font-medium">{att.filename}</span>
                          <span className={`text-[10px] ${msg.role === 'user' ? 'text-navy-300' : 'text-navy-400'}`}>
                            {att.fileSize}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content && <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white border border-navy-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-navy-300 rounded-full animate-pulse-soft" />
                    <span className="w-2 h-2 bg-navy-300 rounded-full animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 bg-navy-300 rounded-full animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="shrink-0 px-3 pt-2 space-y-1.5 bg-white">
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-2.5 py-2 text-xs animate-scale-in"
                >
                  <span className="text-navy-500">{getAttachIcon(att.fileType)}</span>
                  <span className="truncate font-medium text-navy-700 flex-1">{att.filename}</span>
                  {att.status === 'processing' ? (
                    <span className="flex items-center gap-1 text-navy-400 text-[10px]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Reading {att.filename}...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-teal-600 text-[10px]">
                      <Check className="w-3 h-3" />
                      Ready
                    </span>
                  )}
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="text-navy-300 hover:text-coral-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 border-t border-navy-100 p-3 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFileSelect(e.target.files);
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
                  handleFileSelect(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-xl bg-navy-50 text-navy-500 flex items-center justify-center
                  transition-all hover:bg-navy-100 active:scale-95 shrink-0"
                title="Attach PDF or DOCX"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && sendMessage()}
                placeholder="Ask a question or type 'quiz me'..."
                className="min-w-0 flex-1 bg-navy-50 border border-navy-200 rounded-xl px-4 py-2.5 text-sm
                  text-navy-800 placeholder:text-navy-400
                  focus:outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-200/50
                  transition-all duration-200"
              />
              <button
                onClick={sendMessage}
                disabled={isSending || isLoadingHistory || (!input.trim() && pendingAttachments.filter((a) => a.status === 'ready').length === 0)}
                className="w-10 h-10 rounded-xl bg-navy-800 text-white flex items-center justify-center
                  transition-all hover:bg-navy-700 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {hasProcessing && (
              <p className="text-navy-400 text-[10px] mt-1.5 px-1">
                Waiting for files to finish processing...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mobile: full overlay */}
      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-40 flex flex-col bg-white animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-navy-800 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-ice-300" />
              </div>
              <div>
                <p className="font-medium text-sm">StudyFlow AI</p>
                <p className="text-navy-300 text-xs">Ask me anything</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-300 hover:text-white hover:bg-navy-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={mobileScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-navy-50/30">
            {isLoadingHistory && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-navy-300" />
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`
                    max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm
                    ${msg.role === 'user'
                      ? 'bg-navy-700 text-white rounded-br-md'
                      : 'bg-white text-navy-700 border border-navy-100 rounded-bl-md'
                    }
                  `}
                >
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 space-y-1.5">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${
                            msg.role === 'user' ? 'bg-navy-600/50' : 'bg-navy-50'
                          }`}
                        >
                          <span className={msg.role === 'user' ? 'text-ice-300' : 'text-navy-500'}>
                            {getAttachIcon(att.fileType)}
                          </span>
                          <span className="truncate font-medium">{att.filename}</span>
                          <span className={`text-[10px] ${msg.role === 'user' ? 'text-navy-300' : 'text-navy-400'}`}>
                            {att.fileSize}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content && <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white border border-navy-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-navy-300 rounded-full animate-pulse-soft" />
                    <span className="w-2 h-2 bg-navy-300 rounded-full animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 bg-navy-300 rounded-full animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="shrink-0 px-3 pt-2 space-y-1.5 bg-white">
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-2.5 py-2 text-xs animate-scale-in"
                >
                  <span className="text-navy-500">{getAttachIcon(att.fileType)}</span>
                  <span className="truncate font-medium text-navy-700 flex-1">{att.filename}</span>
                  {att.status === 'processing' ? (
                    <span className="flex items-center gap-1 text-navy-400 text-[10px]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Reading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-teal-600 text-[10px]">
                      <Check className="w-3 h-3" />
                      Ready
                    </span>
                  )}
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="text-navy-300 hover:text-coral-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 border-t border-navy-100 p-3 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFileSelect(e.target.files);
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
                  handleFileSelect(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-xl bg-navy-50 text-navy-500 flex items-center justify-center
                  transition-all hover:bg-navy-100 active:scale-95 shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && sendMessage()}
                placeholder="Ask a question..."
                className="min-w-0 flex-1 bg-navy-50 border border-navy-200 rounded-xl px-4 py-2.5 text-sm
                  text-navy-800 placeholder:text-navy-400
                  focus:outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-200/50
                  transition-all duration-200"
              />
              <button
                onClick={sendMessage}
                disabled={isSending || isLoadingHistory || (!input.trim() && pendingAttachments.filter((a) => a.status === 'ready').length === 0)}
                className="w-10 h-10 rounded-xl bg-navy-800 text-white flex items-center justify-center
                  transition-all hover:bg-navy-700 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

