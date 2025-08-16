import { useState, useEffect } from 'react';
import { Message } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import DynamicForm from './DynamicForm';

interface ChatMessageProps {
  message: Message & { formSchema?: any };
  selectedButton: 'smart' | 'ragLink' | 'ragForm';
  onSelectedButtonChange: (button: 'smart' | 'ragLink' | 'ragForm') => void;
  isMostRecent: boolean;
  setFormSchema?: (schema: any) => void; // for sidebar
  chatHistory?: Array<{ role: string; content: string }>;
  onTypingStart?: () => void;
  onTypingComplete?: () => void;
}

function TypingText({
  text,
  speed = 60,
  onTypingComplete,
  onTypingStart,
  shouldAnimate = true,
}: {
  text: string | undefined | null;
  speed?: number;
  onTypingComplete?: () => void;
  onTypingStart?: () => void;
  shouldAnimate?: boolean;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle undefined/null text
  const safeText = text || '';

  useEffect(() => {
    if (!shouldAnimate) {
      // If no animation needed, show full text immediately
      setDisplayedText(safeText);
      setCurrentIndex(safeText.length);
      if (onTypingComplete) onTypingComplete();
      return;
    }

    // Call onTypingStart when animation begins
    if (currentIndex === 0 && onTypingStart) {
      onTypingStart();
    }

    if (currentIndex < safeText.length) {
      const timer = setTimeout(() => {
        setDisplayedText(safeText.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (currentIndex === safeText.length && onTypingComplete) {
      onTypingComplete();
    }
  }, [currentIndex, safeText, speed, onTypingComplete, onTypingStart, shouldAnimate]);

  useEffect(() => {
    if (shouldAnimate) {
      setDisplayedText('');
      setCurrentIndex(0);
    }
  }, [safeText, shouldAnimate]);

  return (
    <div className="text-gray-900 leading-relaxed prose prose-sm max-w-none">
      <ReactMarkdown>{displayedText}</ReactMarkdown>
    </div>
  );
}

export default function ChatMessage({
  message,
  selectedButton,
  onSelectedButtonChange,
  isMostRecent,
  setFormSchema,
  chatHistory,
  onTypingStart,
  onTypingComplete,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [showRAGResults, setShowRAGResults] = useState(false);
  const [showFormResults, setShowFormResults] = useState(false);
  
  // Check if this message is actually new (created in current session)
  // Messages restored from localStorage will have old timestamps
  const isActuallyNew = () => {
    const now = new Date();
    const messageTime = new Date(message.timestamp);
    const timeDiff = now.getTime() - messageTime.getTime();
    // Consider message "new" if it was created within the last 30 seconds
    return timeDiff < 30000; // 30 seconds
  };

  const [showFormPrompt, setShowFormPrompt] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [extractedFormSchema, setExtractedFormSchema] = useState<any>(null);

  const handleFillForm = async () => {
    if (!selectedForm?.url) return;

    try {
      const response = await fetch('/api/extractForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedForm.url }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("✅ extractForm response:", data);

        // ✅ Only update sidebar form schema now
        if (setFormSchema) setFormSchema(data);
      } else {
        console.error('Failed to extract form');
      }
    } catch (err) {
      console.error('Error extracting form:', err);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-4xl ${isUser ? 'order-2' : 'order-1'}`}>
        {isUser ? (
          <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-sm">
            <p className="text-white">{message.content}</p>
          </div>
        ) : (
          <div className="w-full">
            <TypingText
              text={message.content}
              speed={6}
              shouldAnimate={isActuallyNew()}
              onTypingStart={() => {
                if (onTypingStart) onTypingStart();
              }}
              onTypingComplete={() => {
                if (message.ragResults?.length) setShowRAGResults(true);
                if (message.formResults?.length) setShowFormResults(true);
                if (onTypingComplete) onTypingComplete();
              }}
            />

            {/* --- Document Results --- */}
            {showRAGResults && (message.ragResults?.length ?? 0) > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                  📚 Relevant Policies & Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {message.ragResults?.map((result, index) => (
                    <div
                      key={index}
                      className="rag-card p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => console.log('Document clicked:', result.title)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900 line-clamp-2 flex-1">
                          📄 {result.title}
                        </h5>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Policy
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                        {result.content}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Relevance: {result.similarity?.toFixed(3)}</span>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 truncate"
                        >
                          📖 Read Full
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Form Results --- */}
            {showFormResults && (message.formResults?.length ?? 0) > 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                  📋 Relevant Forms & Applications
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {message.formResults?.map((result, index) => (
                    <div
                      key={index}
                      className="rag-card p-4 cursor-pointer"
                      onClick={async () => {
                        setSelectedForm(result);
                        setIsLoadingForm(true);
                        setExtractedFormSchema(null);
                        
                        try {
                          const response = await fetch('http://localhost:8000/api/extractForm', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: result.url }),
                          });
                          if (response.ok) {
                            const data = await response.json();
                            console.log("✅ extractForm response:", data);
                            setExtractedFormSchema(data);
                            if (setFormSchema) setFormSchema(data); // also send to sidebar
                          } else {
                            console.error('Failed to extract form');
                          }
                        } catch (err) {
                          console.error('Error extracting form:', err);
                        } finally {
                          setIsLoadingForm(false);
                        }
                      }}

                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900 line-clamp-2 flex-1">
                          📋 {result.title}
                        </h5>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Form
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">{result.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-600 font-medium">Click to load form</span>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 truncate"
                        >
                          📄 View PDF
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Form Loading State --- */}
            {isLoadingForm && (
              <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-blue-700 font-medium">🔄 Processing Form...</span>
                </div>
                <p className="text-center text-sm text-blue-600 mt-2">
                  Extracting form fields and structure...
                </p>
              </div>
            )}

            {/* --- Extracted Form Display --- */}
            {extractedFormSchema && !isLoadingForm && (
              <div className="mt-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      📋 {selectedForm?.title || 'Form'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Fill out this form with AI assistance
                    </p>
                  </div>
                  <button
                    onClick={() => setExtractedFormSchema(null)}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
                    title="Close form"
                  >
                    ✕
                  </button>
                </div>
                <DynamicForm
                  schema={extractedFormSchema}
                  onAskClarification={(fieldName, label) => {
                    // Handle field clarification requests
                    console.log(`Need clarification for: ${fieldName} - ${label}`);
                  }}
                  chatHistory={chatHistory}
                />
              </div>
            )}

            {/* --- Modal asking user --- */}
            {showFormPrompt && selectedForm && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                <div className="bg-white rounded-xl p-6 shadow-lg w-96">
                  <h3 className="text-lg font-semibold mb-4">
                    Fill in {selectedForm.title}?
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Would you like to fill this form directly here?
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                      onClick={() => setShowFormPrompt(false)}
                    >
                      No
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => {
                        setShowFormPrompt(false);
                        handleFillForm();
                      }}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


