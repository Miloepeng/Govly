import { useEffect, useState } from 'react';
import { Settings, Trash2, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { ChatBubbleIcon, FileTextIcon } from '@radix-ui/react-icons';

interface SettingsState {
  maxTokens: number;
  temperature: number;
  thinkingMode: string;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

interface SidebarProps {
  settings: SettingsState;
  onSettingsChange: (settings: SettingsState) => void;
  userProfile?: UserProfile;
  onLogout: () => void;
}

export default function Sidebar({ settings, onSettingsChange, userProfile, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [savedChats, setSavedChats] = useState<Array<{ id: string; title: string; updatedAt: number }>>([]);
  const [isSettingsOpenExpanded, setIsSettingsOpenExpanded] = useState(false);
  const [isSettingsOpenCollapsed, setIsSettingsOpenCollapsed] = useState(false);

  useEffect(() => {
    function loadChats() {
      try {
        const json = localStorage.getItem('chatConversations');
        const convs = json ? JSON.parse(json) : [];
        if (Array.isArray(convs)) setSavedChats(convs);
      } catch {
        setSavedChats([]);
      }
    }
    loadChats();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'chatConversations') loadChats();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function startNewChatFromSidebar() {
    const newId = `${Date.now()}`;
    localStorage.setItem(`chat:${newId}`, JSON.stringify([]));
    const updated = [{ id: newId, title: 'New chat', updatedAt: Date.now() }, ...savedChats];
    localStorage.setItem('chatConversations', JSON.stringify(updated));
    setSavedChats(updated);
    const search = new URLSearchParams(window.location.search);
    search.set('chatId', newId);
    window.location.href = `/${search.toString() ? `?${search.toString()}` : ''}`;
  }

  function openChat(chatId: string) {
    const search = new URLSearchParams(window.location.search);
    search.set('chatId', chatId);
    window.location.href = `/${search.toString() ? `?${search.toString()}` : ''}`;
  }

  function deleteChat(chatId: string) {
    localStorage.removeItem(`chat:${chatId}`);
    const updated = savedChats.filter(c => c.id !== chatId);
    localStorage.setItem('chatConversations', JSON.stringify(updated));
    setSavedChats(updated);
  }

  return (
    <div className={`modern-sidebar h-full ${isOpen ? 'w-80' : 'w-20'} transition-all ease-in-out duration-200 p-4 bg-gray-100 border-r border-gray-200 flex flex-col overflow-hidden`}>
      {/* Collapsed item shared styles */}
      {/* Using slightly larger hit area for consistency and accessibility */}
      {(() => null)()}
      {isOpen ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-gray-900">Govly AI Assistant</h1>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <PanelLeftClose className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-3">
            <a
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
              </div>
              <span className="text-gray-800 text-sm">Dashboard</span>
            </a>
            <a
              href="/status"
              className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <FileTextIcon className="w-5 h-5 text-gray-700" />
              </div>
              <span className="text-gray-800 text-sm">View Applications</span>
            </a>
          </nav>

          {/* Saved Chats Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chats</h3>
            </div>
            {/* New chat full-width row */}
            <button
              onClick={startNewChatFromSidebar}
              className="w-full h-12 mb-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-sm text-rose-700 flex items-center justify-center gap-2"
              title="New Chat"
            >
              <svg className="h-4 w-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {savedChats.length === 0 ? (
                <div className="text-xs text-gray-500">No saved chats</div>
              ) : (
                savedChats
                  .slice()
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map(chat => (
                  <div key={chat.id} className="group relative">
                    <button
                      onClick={() => openChat(chat.id)}
                      className="w-full h-12 text-left pl-5 pr-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-red-300 text-sm text-gray-800 truncate"
                      title={chat.title || 'Untitled chat'}
                    >
                      {chat.title || 'Untitled chat'}
                    </button>
                    <button
                      onClick={() => deleteChat(chat.id)}
                      className="hidden group-hover:flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      title="Delete chat"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Profile Section */}
          <div className="mt-auto pt-8">
            <div className="border-t border-gray-200 pt-4">
              {userProfile ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-3">
                    <button
                      onClick={() => window.location.href = '/profile'}
                      className="flex items-center gap-3 flex-1 min-w-0 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      aria-label="Open profile"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        {userProfile.avatar ? (
                          <img 
                            src={userProfile.avatar} 
                            alt={userProfile.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-red-600 font-medium text-lg">
                            {userProfile.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {userProfile.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {userProfile.email}
                        </p>
                      </div>
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setIsSettingsOpenExpanded(v => !v)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex-shrink-0"
                        aria-label="Open settings"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      {isSettingsOpenExpanded && (
                        <div className="absolute bottom-full right-0 translate-x-3 mb-2 bg-white border border-gray-200 rounded-xl shadow-md p-3 w-72 z-20">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Max Response Length: <span className="text-gray-900 font-semibold">{settings.maxTokens}</span>
                              </label>
                              <input
                                type="range"
                                min="50"
                                max="300"
                                value={settings.maxTokens}
                                onChange={(e) => onSettingsChange({ ...settings, maxTokens: parseInt(e.target.value) })}
                                className="w-full accent-rose-600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Temperature: <span className="text-gray-900 font-semibold">{settings.temperature}</span>
                              </label>
                              <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.1"
                                value={settings.temperature}
                                onChange={(e) => onSettingsChange({ ...settings, temperature: parseFloat(e.target.value) })}
                                className="w-full accent-rose-600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">Thinking Mode</label>
                              <select
                                value={settings.thinkingMode}
                                onChange={(e) => onSettingsChange({ ...settings, thinkingMode: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white text-gray-900"
                              >
                                <option value="off">Off - Direct responses</option>
                                <option value="on">On - Show reasoning</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.location.href = '/profile'}
                      className="flex-1 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Profile
                    </button>
                    <button
                      onClick={onLogout}
                      className="flex-1 px-3 py-2 text-sm text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="flex-1 px-3 py-2 text-sm text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center">
              Govly © {new Date().getFullYear()}
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col">
          {/* Header row with toggle */}
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-red-300 bg-red-500 hover:bg-red-600 active:scale-95 text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-red-100 flex-shrink-0 transition"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>

          {/* Content area: nav top, chats, profile bottom */}
          <div className="flex-1 min-h-0 flex flex-col items-center">
            <nav className="flex flex-col items-center space-y-3">
              <a
                href="/dashboard"
                className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-label="Dashboard"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
              </a>
              <a
                href="/"
                className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-label="Chat"
              >
                <ChatBubbleIcon className="w-5 h-5 text-gray-700" />
              </a>
              <a
                href="/status"
                className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-label="View applications"
              >
                <FileTextIcon className="w-5 h-5 text-gray-700" />
              </a>
            </nav>

            {/* New Chat (collapsed) */}
            <div className="mt-4">
              <button
                onClick={startNewChatFromSidebar}
                className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 active:scale-95 transition text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-label="New chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Collapsed saved chats as icons list */}
            <div className="mt-3 space-y-2 overflow-y-auto">
              {savedChats.slice().sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,8).map(chat => (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat.id)}
                  className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-label={chat.title || 'Untitled chat'}
                  title={chat.title || 'Untitled chat'}
                >
                  <ChatBubbleIcon className="w-5 h-5 text-gray-700" />
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Compact User Profile at bottom */}
            <div className="pt-4 w-full">
              <div className="border-t border-gray-200 pt-4 flex flex-col items-center gap-3">
                {userProfile ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      {userProfile.avatar ? (
                        <img 
                          src={userProfile.avatar} 
                          alt={userProfile.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-red-600 font-medium text-lg">
                          {userProfile.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setIsSettingsOpenCollapsed(v => !v)}
                        className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 active:scale-95 transition text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label="Open settings"
                        title="Settings"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      {isSettingsOpenCollapsed && (
                        <div className="absolute bottom-full left-full ml-2 mb-2 bg-white border border-gray-200 rounded-xl shadow-md p-3 w-64 z-20">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Max Response Length: <span className="text-gray-900 font-semibold">{settings.maxTokens}</span>
                              </label>
                              <input
                                type="range"
                                min="50"
                                max="300"
                                value={settings.maxTokens}
                                onChange={(e) => onSettingsChange({ ...settings, maxTokens: parseInt(e.target.value) })}
                                className="w-full accent-rose-600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Temperature: <span className="text-gray-900 font-semibold">{settings.temperature}</span>
                              </label>
                              <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.1"
                                value={settings.temperature}
                                onChange={(e) => onSettingsChange({ ...settings, temperature: parseFloat(e.target.value) })}
                                className="w-full accent-rose-600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">Thinking Mode</label>
                              <select
                                value={settings.thinkingMode}
                                onChange={(e) => onSettingsChange({ ...settings, thinkingMode: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white text-gray-900"
                              >
                                <option value="off">Off - Direct responses</option>
                                <option value="on">On - Show reasoning</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={onLogout}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 active:scale-95 transition text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label="Logout"
                      title="Logout"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 active:scale-95 transition text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    aria-label="Login"
                    title="Login"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 