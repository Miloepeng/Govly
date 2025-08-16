import { useState, useEffect } from 'react';
import { Message } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import DynamicForm from './DynamicForm';

interface ChatMessageProps {
  message: Message & { formSchema?: any };
  selectedButton: 'default' | 'ragLink' | 'ragForm';
  onSelectedButtonChange: (button: 'default' | 'ragLink' | 'ragForm') => void;
  isMostRecent: boolean;
  setFormSchema?: (schema: any) => void; // for sidebar
}

function TypingText({
  text,
  speed = 60,
  onTypingComplete,
}: {
  text: string;
  speed?: number;
  onTypingComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (currentIndex === text.length && onTypingComplete) {
      onTypingComplete();
    }
  }, [currentIndex, text, speed, onTypingComplete]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

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
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [showRAGResults, setShowRAGResults] = useState(false);
  const [showFormResults, setShowFormResults] = useState(false);

  const [showFormPrompt, setShowFormPrompt] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);

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
              speed={12}
              onTypingComplete={() => {
                if (message.ragResults?.length) setShowRAGResults(true);
                if (message.formResults?.length) setShowFormResults(true);
              }}
            />

            {/* --- Document Results --- */}
            {showRAGResults && (message.ragResults?.length ?? 0) > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Relevant Documents:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {message.ragResults?.map((result, index) => (
                    <div
                      key={index}
                      className="rag-card p-4 cursor-pointer"
                      onClick={() => console.log('Document clicked:', result.title)}
                    >
                      <h5 className="font-medium text-gray-900 line-clamp-2 mb-2">
                        {result.title}
                      </h5>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                        {result.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Score: {result.similarity?.toFixed(3)}</span>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 truncate"
                        >
                          View Source
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Form Results --- */}
            {showFormResults && (message.formResults?.length ?? 0) > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Relevant Forms:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {message.formResults?.map((result, index) => (
                    <div
                      key={index}
                      className="rag-card p-4 cursor-pointer"
                      onClick={async () => {
  setSelectedForm(result);
  // directly extract + render the form
  try {
    const response = await fetch('http://localhost:8000/api/extractForm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: result.url }),
    });
    if (response.ok) {
      const data = await response.json();
      console.log("✅ extractForm response:", data);
      if (setFormSchema) setFormSchema(data); // send schema to sidebar
      if ((window as any).setCurrentFormSchema) {
      (window as any).setCurrentFormSchema(data);
      }
    } else {
      console.error('Failed to extract form');
    }
  } catch (err) {
    console.error('Error extracting form:', err);
  }
}}

                    >
                      <h5 className="font-medium text-gray-900 line-clamp-2 mb-2">
                        {result.title}
                      </h5>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-2">{result.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 truncate"
                        >
                          View Form
                        </a>
                      </div>
                    </div>
                  ))}
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


