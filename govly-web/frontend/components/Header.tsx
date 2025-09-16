import { GearIcon } from '@radix-ui/react-icons';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Country, Language, Settings } from '../types/chat';

interface HeaderProps {
  settings?: Settings;
  setSettings?: (settings: Settings) => void;
  onClearChat?: () => void;
}

export default function Header({
  settings,
  setSettings,
  onClearChat,
}: HeaderProps) {
  // Default settings if not provided
  const defaultSettings: Settings = {
    maxTokens: 300,
    temperature: 0.7,
    thinkingMode: 'off'
  };
  
  const currentSettings = settings || defaultSettings;

  return (
    <div className="px-6 py-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">🇻🇳 Vietnam</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Clear chat button - only show if onClearChat is provided */}
          {onClearChat && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear the chat? This action cannot be undone.")) {
                  onClearChat();
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-sm">Clear Chat</span>
            </button>
          )}

          {/* Settings dropdown - only show if settings and setSettings are provided */}
          {settings && setSettings && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                  <GearIcon className="w-5 h-5 text-gray-700" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 mr-2" align="end">
                <div className="w-72 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Max Response Length: <span className="text-blue-600 font-semibold">{currentSettings.maxTokens}</span>
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      value={currentSettings.maxTokens}
                      onChange={(e) => setSettings({ ...currentSettings, maxTokens: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Temperature: <span className="text-blue-600 font-semibold">{currentSettings.temperature}</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={currentSettings.temperature}
                      onChange={(e) => setSettings({ ...currentSettings, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Thinking Mode</label>
                    <select
                      value={currentSettings.thinkingMode}
                      onChange={(e) => setSettings({ ...currentSettings, thinkingMode: e.target.value as 'on' | 'off' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="off">Off - Direct responses</option>
                      <option value="on">On - Show reasoning</option>
                    </select>
                  </div>
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
        </div>
      </div>
    </div>
  );
}
