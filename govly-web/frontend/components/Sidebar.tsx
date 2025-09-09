import { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { ChatBubbleIcon, FileTextIcon, MixIcon } from '@radix-ui/react-icons';

interface SettingsState {
  maxTokens: number;
  temperature: number;
  thinkingMode: string;
}

interface SidebarProps {
  settings: SettingsState;
  onSettingsChange: (settings: SettingsState) => void;
}

export default function Sidebar({ settings, onSettingsChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`modern-sidebar h-full ${isOpen ? 'w-80' : 'w-20'} transition-all duration-200 p-4 overflow-y-auto bg-gray-100 border-r border-gray-200`}>
      {isOpen ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-gray-900">Govly Chat Interface</h1>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <MixIcon className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-3">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <ChatBubbleIcon className="w-5 h-5 text-gray-700" />
              </div>
              <span className="text-gray-800 text-sm">Chat</span>
            </a>
            <a
              href="/status"
              className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <FileTextIcon className="w-5 h-5 text-gray-700" />
              </div>
              <span className="text-gray-800 text-sm">View Applications</span>
            </a>
          </nav>

          <div className="mt-8 text-xs text-gray-500">
            Govly © {new Date().getFullYear()}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center h-full">
          {/* Centered toggle button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex-shrink-0 mt-4"
            aria-label="Toggle sidebar"
          >
            <MixIcon className="w-4 h-4 text-gray-700" />
          </button>

          {/* Centered navigation icons */}
          <nav className="flex flex-col items-center space-y-4 mt-8">
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
            >
              <ChatBubbleIcon className="w-5 h-5 text-gray-700" />
            </a>
            <a
              href="/status"
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              title="View Applications"
            >
              <FileTextIcon className="w-5 h-5 text-gray-700" />
            </a>
          </nav>
        </div>
      )}
    </div>
  );
} 