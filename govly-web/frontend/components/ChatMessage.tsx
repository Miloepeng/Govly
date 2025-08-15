import { useState, useEffect } from 'react';
import { Message } from '../types/chat';
import { Search, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
  selectedButton: 'default' | 'ragLink' | 'ragForm';
  onSelectedButtonChange: (button: 'default' | 'ragLink' | 'ragForm') => void;
  isMostRecent: boolean;
}

// Typing animation component
function TypingText({ text, speed = 60, onTypingComplete }: { text: string; speed?: number; onTypingComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
        
        // Auto-scroll to keep typing cursor visible
        setTimeout(() => {
          // Target the specific chat messages container
          const chatContainer = document.querySelector('.flex-1.overflow-y-auto');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          } else {
            // Fallback: try to find any scrollable container
            const scrollableContainers = document.querySelectorAll('[class*="overflow"]');
            Array.from(scrollableContainers).some(container => {
              if (container.scrollHeight > container.clientHeight) {
                container.scrollTop = container.scrollHeight;
                return true; // Stop iteration
              }
              return false;
            });
          }
        }, 10); // Minimal delay
      }, speed);
      return () => clearTimeout(timer);
    } else if (currentIndex === text.length && onTypingComplete) {
      // Typing is complete, trigger callback
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

export default function ChatMessage({ message, selectedButton, onSelectedButtonChange, isMostRecent }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [showRAGResults, setShowRAGResults] = useState(false);
  const [showFormResults, setShowFormResults] = useState(false);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-4xl ${isUser ? 'order-2' : 'order-1'}`}>
        {isUser ? (
          // User message - right aligned with background
          <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-sm">
            <p className="text-white">{message.content}</p>
          </div>
        ) : (
          // Assistant message - left aligned, full width, no background
          <div className="w-full">
            <TypingText 
              text={message.content} 
              speed={12} 
              onTypingComplete={() => {
                // Show RAG results only after typing is complete
                if (message.ragResults && message.ragResults.length > 0) {
                  setShowRAGResults(true);
                }
                if (message.formResults && message.formResults.length > 0) {
                  setShowFormResults(true);
                }
              }}
            />
            
            {/* RAG Results - only show after typing is complete */}
            {showRAGResults && message.ragResults && message.ragResults.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Relevant Documents:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {message.ragResults.map((result, index) => (
                    <div
                      key={index}
                      className="rag-card p-4 cursor-pointer"
                      onClick={() => {
                        // Handle document summary
                        console.log('Document clicked:', result.title);
                      }}
                    >
                      <h5 className="font-medium text-gray-900 line-clamp-2 mb-2">
                        {result.title}
                      </h5>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                        {result.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Score: {result.similarity.toFixed(3)}</span>
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

            {/* Form Results - only show after typing is complete */}
            {showFormResults && message.formResults && message.formResults.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Relevant Forms:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {message.formResults.map((result, index) => (
                    <div
                      key={index}
                      className="rag-card p-4 cursor-pointer"
                      onClick={() => {
                        // Handle form details
                        console.log('Form clicked:', result.title);
                      }}
                    >
                      <h5 className="font-medium text-gray-900 line-clamp-2 mb-2">
                        {result.title}
                      </h5>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                        {result.description}
                      </p>
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
          </div>
        )}
      </div>
    </div>
  );
} 