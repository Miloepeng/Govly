import { useState, useEffect } from 'react';
import { Message } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import DynamicForm from './DynamicForm';
import { getSupabase } from '../lib/supabase';
const supabase = getSupabase();

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

    setIsLoadingForm(true);

    try {
      const response = await fetch('/api/extractFormById', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_id: selectedForm.id }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("✅ extractFormPreprocessed response:", data);

        // Set the extracted form schema for display
        setExtractedFormSchema(data);
        // Also update sidebar form schema
        if (setFormSchema) setFormSchema(data);
      } else {
        console.error('Failed to extract form');
      }
    } catch (err) {
      console.error('Error extracting form:', err);
    } finally {
      setIsLoadingForm(false);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-4xl ${isUser ? 'order-2' : 'order-1'}`}>
        {isUser ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl shadow-sm">
            <p className="text-rose-900">{message.content}</p>
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
            {showRAGResults && message.ragResults && message.ragResults.length > 0 && (
              <div className="mt-6 space-y-4">
                {/* Best Match Document */}
                {message.ragResults[0] && (
                  <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      ⭐️ Best Matching Policy
                    </h4>
                    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div
                        key="best-match"
                        className="p-5 cursor-pointer"
                        onClick={() => {
                          const bestMatch = message.ragResults?.[0];
                          if (!bestMatch) return;
                          window.open(bestMatch.url, '_blank');
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                            📄 {message.ragResults[0].title}
                          </h5>
                          <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium">
                            Recommended
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {message.ragResults[0].content}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-600 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Click to read policy
                          </span>
                          <a
                            href={message.ragResults[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📖 Read Full
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alternative Documents */}
                {message.ragResults.length > 1 && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 mb-2">
                      Other relevant policies:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {message.ragResults.slice(1).map((result, index) => (
                        <button
                          key={`alt-doc-${index}`}
                          className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors cursor-pointer flex items-center gap-1"
                          onClick={() => window.open(result.url, '_blank')}
                        >
                          📄 {result.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- Form Results --- */}
            {showFormResults && message.formResults && message.formResults.length > 0 && (
              <div className="mt-6 space-y-4">
                {/* Best Match Form */}
                {message.formResults[0] && (
                  <div className="p-5 bg-green-50 border-2 border-green-200 rounded-xl shadow-sm">
                    <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                      ⭐️ Best Matching Form
                    </h4>
                    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div
                        key="best-match"
                        className="p-5 cursor-pointer"
                        onClick={async () => {
                          const bestMatch = message.formResults?.[0];
                          if (!bestMatch) return;
                          
                          setSelectedForm(bestMatch);
                          setIsLoadingForm(true);
                          
                          try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/extractFormById`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ form_id: bestMatch.id }),
                            });
                            if (response.ok) {
                              const data = await response.json();
                              setExtractedFormSchema(data);
                              if (setFormSchema) setFormSchema(data);
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
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                            📋 {message.formResults[0].title}
                          </h5>
                          <span className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium">
                            Recommended
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{message.formResults[0].description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Click to fill form
                          </span>
                          <a
                            href={message.formResults[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📄 View PDF
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alternative Forms */}
                {message.formResults.length > 1 && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 mb-2">
                      Other similar forms:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {message.formResults.slice(1).map((result, index) => (
                        <button
                          key={`alt-form-${index}`}
                          className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors cursor-pointer flex items-center gap-1"
                          onClick={async () => {
                            setSelectedForm(result);
                            setIsLoadingForm(true);
                            
                            try {
                              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/extractFormById`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ form_id: result.id }),
                              });
                              if (response.ok) {
                                const data = await response.json();
                                setExtractedFormSchema(data);
                                if (setFormSchema) setFormSchema(data);
                              } else {
                                console.error('Failed to extract form');
                              }
                            } catch (err) {
                              console.error('Error extracting form:', err);
                            } finally {
                              setIsLoadingForm(false);
                            }
                          }}
                          title="Click to load this form"
                        >
                          <span>📋</span>
                          <span className="truncate">{result.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

            {/* --- Continue Application Form --- */}
            {message.formSchema && message.formState && (
              <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">
                    📝 {message.formSchema.fields?.[0]?.label || 'Government Form'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Continue filling out your form
                  </p>
                </div>
                <div className="p-4">
                  <DynamicForm
                    schema={message.formSchema}
                    formState={message.formState}
                    chatHistory={chatHistory}
                    onAskClarification={(fieldName, label) => {
                      // Handle field clarification requests
                      console.log(`Need clarification for: ${fieldName} - ${label}`);
                    }}
                    onFormUpdate={message.continuingApplicationId ? async (formData) => {
                      // Update the application in the database
                      try {
                        const { error } = await supabase
                          .from('user_applications')
                          .update({
                            form_data: formData,
                            last_saved: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', message.continuingApplicationId);
                        
                        if (error) {
                          console.error('Error updating form data:', error);
                        } else {
                          console.log('✅ Application form data updated successfully');
                          // You could add a toast notification here if needed
                        }
                      } catch (error) {
                        console.error('Error in form update:', error);
                      }
                    } : undefined}
                  />
                </div>
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


