import { Check } from 'lucide-react';
import { LoadingState } from '../types/chat';

interface LoadingIndicatorProps {
  loadingState: LoadingState;
  selectedButton: 'smart' | 'ragLink' | 'ragForm';
}

export default function LoadingIndicator({ loadingState, selectedButton }: LoadingIndicatorProps) {
  if (!loadingState) return null;

  const LoadingDots = () => (
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  );

  const loadingStates = {
    understanding: {
      text: "Understanding user's question...",
      icon: <LoadingDots />,
    },
    finding: {
      text: selectedButton === 'ragForm' ? 'Finding relevant forms...' : 'Finding relevant files...',
      icon: <LoadingDots />,
    },
    found: {
      text: "Found",
      icon: <Check className="w-5 h-5 text-green-500" />,
      color: "text-green-600",
    },
    generating: {
      text: "Generating response...",
      icon: <LoadingDots />,
    },
    chat: {
      text: "Generating response for chat endpoint...",
      icon: <LoadingDots />,
    },
    agency: {
      text: "Generating agency suggestions...",
      icon: <LoadingDots />,
    },
    retrieving_links: {
      text: "Retrieving relevant links...",
      icon: <LoadingDots />,
    },
    retrieving_forms: {
      text: "Retrieving relevant forms...",
      icon: <LoadingDots />,
    },
  };

  const state = loadingStates[loadingState] || {
    text: "Generating...",
    icon: <LoadingDots />,
  };

  return (
    <div className="flex justify-start mb-4">
      <div className="w-full">
        {(() => {
          const colorClass = (state as { color?: string }).color ?? 'text-gray-600';
          return (
            <div className={`flex items-center gap-3 ${colorClass}`}>
              {state.icon}
              <span className="text-sm font-medium">{state.text}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
