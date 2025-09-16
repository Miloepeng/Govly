import { useState, useRef } from 'react';
import { Search, FileText, Camera } from 'lucide-react';
import { PaperPlaneIcon } from '@radix-ui/react-icons';
import { ResponseType } from '../types/chat';

interface ChatInputProps {
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  selectedButton: ResponseType;
  setSelectedButton: (button: ResponseType) => void;
  showActionButtons?: boolean;
}

export default function ChatInput({
  isLoading,
  onSendMessage,
  selectedButton,
  setSelectedButton,
  showActionButtons = true,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      // TODO: Add file upload logic here
    }
  };

  return (
    <div className="bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Action Buttons */}
        {showActionButtons && (
          <div className="flex gap-2 mb-4 justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedButton('smart');
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-200 ${
                  selectedButton === 'smart'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Smart Response
              </button>
              <button
                onClick={() => setSelectedButton('ragLink')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-200 ${
                  selectedButton === 'ragLink'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <Search className="h-4 w-4" />
                Find Links
              </button>
              <button
                onClick={() => setSelectedButton('ragForm')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-200 ${
                  selectedButton === 'ragForm'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <FileText className="h-4 w-4" />
                Find Forms
              </button>
            </div>
            
            {/* Upload Form Button */}
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-200 bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
            >
              <Camera className="h-4 w-4" />
              Upload Form
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 modern-input px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Message Govly..."
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-base"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-md text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
            aria-label="Send"
          >
            <PaperPlaneIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Govly can make mistakes. Consider checking important information.
        </p>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
