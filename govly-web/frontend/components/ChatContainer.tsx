import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import ChatMessage from './ChatMessage';
import LoadingIndicator from './LoadingIndicator';
import { Message, ResponseType } from '../types/chat';
import { useSmartScroll } from '../hooks/useSmartScroll';

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  loadingState: 'understanding' | 'finding' | 'found' | 'generating' | 'chat' | 'agency' | 'retrieving_links' | 'retrieving_forms' | null;
  selectedButton: ResponseType;
  setSelectedButton: (button: ResponseType) => void;
  setFormSchema: (schema: any) => void;
  setIsTyping: (typing: boolean) => void;
  setIsTypingComplete: (complete: boolean) => void;
}

export default function ChatContainer({
  messages,
  isLoading,
  loadingState,
  selectedButton,
  setSelectedButton,
  setFormSchema,
  setIsTyping,
  setIsTypingComplete,
}: ChatContainerProps) {
  // Use smart scroll hook
  const { userScrolledUp, scrollToBottom } = useSmartScroll({
    containerSelector: '#chat-container'
  });

  return (
    <div id="chat-container" className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50 relative">
      {/* Scroll to bottom button */}
      {userScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-10"
          title="Scroll to bottom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
      <div className="max-w-4xl mx-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Welcome to Govly</h2>
            <p className="text-gray-600 max-w-md">
              Ask me anything in your native language! I'll tell you anything about relevant policies and even fill out your forms!
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                selectedButton={selectedButton}
                onSelectedButtonChange={setSelectedButton}
                isMostRecent={index === messages.length - 1}
                setFormSchema={setFormSchema}
                chatHistory={messages.map(msg => ({
                  role: msg.role,
                  content: msg.content
                }))}
                onTypingStart={() => {
                  setIsTyping(true);
                  setIsTypingComplete(false);
                }}
                onTypingComplete={() => {
                  setIsTyping(false);
                  setIsTypingComplete(true);
                }}
              />
            ))}

            {isLoading && (
              <LoadingIndicator
                loadingState={loadingState}
                selectedButton={selectedButton}
              />
            )}

            <div id="messages-end" />
          </>
        )}
      </div>
    </div>
  );
}
