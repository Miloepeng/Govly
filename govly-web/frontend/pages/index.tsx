import { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Search, FileText, Check } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { GearIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import ChatMessage from '../components/ChatMessage';
import Sidebar from '../components/Sidebar';
import { Message } from '../types/chat';
import DynamicForm from '../components/DynamicForm';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<'finding' | 'found' | 'generating' | null>(null);
  const [selectedButton, setSelectedButton] = useState<'default' | 'ragLink' | 'ragForm'>('default');
  const [settings, setSettings] = useState({
    maxTokens: 300,
    temperature: 0.7,
    thinkingMode: 'off',
  });

  const [selectedCountry, setSelectedCountry] = useState('Vietnam');
  const [selectedLanguage, setSelectedLanguage] = useState('Vietnamese');
  const [formSchema, setFormSchema] = useState<any>(null);

  const countries = [
    { name: 'Vietnam', flag: '🇻🇳' },
    { name: 'Thailand', flag: '🇹🇭' },
    { name: 'Singapore', flag: '🇸🇬' },
    { name: 'Malaysia', flag: '🇲🇾' },
    { name: 'Indonesia', flag: '🇮🇩' },
    { name: 'Philippines', flag: '🇵🇭' },
    { name: 'Myanmar', flag: '🇲🇲' },
    { name: 'Cambodia', flag: '🇰🇭' },
    { name: 'Laos', flag: '🇱🇦' },
    { name: 'Brunei', flag: '🇧🇳' },
    { name: 'East Timor', flag: '🇹🇱' },
  ];

  const languages = [
    { name: 'Vietnamese', code: 'vi', flag: '🇻🇳' },
    { name: 'Thai', code: 'th', flag: '🇹🇭' },
    { name: 'English', code: 'en', flag: '🇬🇧' },
    { name: 'Malay', code: 'ms', flag: '🇲🇾' },
    { name: 'Indonesian', code: 'id', flag: '🇮🇩' },
    { name: 'Filipino', code: 'tl', flag: '🇵🇭' },
    { name: 'Burmese', code: 'my', flag: '🇲🇲' },
    { name: 'Khmer', code: 'km', flag: '🇰🇭' },
    { name: 'Lao', code: 'lo', flag: '🇱🇦' },
    { name: 'Chinese', code: 'zh', flag: '🇨🇳' },
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
  localStorage.setItem("chatHistory", JSON.stringify(messages));
}, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Set initial loading state for RAG operations
    if (selectedButton === 'ragLink' || selectedButton === 'ragForm') {
      setLoadingState('finding');
    }

    // Build conversation context from previous messages
    const conversationContext = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add the current user message to the context
    conversationContext.push({
      role: 'user',
      content: userMessage.content
    });

    try {
      // Debug: Log what we're sending
      const requestBody = {
        message: userMessage.content,
        conversationContext: conversationContext,
        country: selectedCountry,
        language: selectedLanguage,
        settings: {
          ...settings,
          responseType: selectedButton // Pass the selected button type to the API
        }
      };
      console.log('DEBUG: Sending request with country:', selectedCountry, 'language:', selectedLanguage);
      console.log('DEBUG: Full request body:', requestBody);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        
        // For RAG links/forms, get RAG results first, then generate AI response
        if (selectedButton === 'ragLink' || selectedButton === 'ragForm') {
          let ragResults = [];
          let formResults = [];
          
          if (selectedButton === 'ragLink') {
            // Get RAG link results first
            const ragResponse = await fetch('/api/ragLink', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: userMessage.content })
            });
            if (ragResponse.ok) {
              const ragData = await ragResponse.json();
              ragResults = ragData.results;
            }
            // Show found state briefly, then change to generating
            setLoadingState('found');
            setTimeout(() => setLoadingState('generating'), 1000);
          } else if (selectedButton === 'ragForm') {
            // Get RAG form results first
            const formResponse = await fetch('/api/ragForm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: userMessage.content })
            });
            if (formResponse.ok) {
              const formData = await formResponse.json();
              formResults = formData.results;
            }
            // Show found state briefly, then change to generating
            setLoadingState('found');
            setTimeout(() => setLoadingState('generating'), 1000);
          }
          
          // Now generate AI response with knowledge of the results
          const aiRequestBody = {
            message: userMessage.content,
            conversationContext: conversationContext,
            country: selectedCountry,
            language: selectedLanguage,
            settings: {
              ...settings,
              responseType: selectedButton,
              ragResults: ragResults,
              formResults: formResults
            }
          };
          console.log('DEBUG: Sending RAG request with country:', selectedCountry, 'language:', selectedLanguage);
          console.log('DEBUG: Full RAG request body:', aiRequestBody);
          
          const aiResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiRequestBody)
          });
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiData.response,
              userQuery: userMessage.content,
              timestamp: new Date(),
              ragResults: selectedButton === 'ragLink' ? ragResults : undefined,
              formResults: selectedButton === 'ragForm' ? formResults : undefined
            };
            setMessages(prev => [...prev, assistantMessage]);
          }
        } else {
          // Default response - no RAG/Form search
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response,
            userQuery: userMessage.content,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingState(null);
    }
  };

  const handleRAGSearch = async (messageId: string, userQuery: string) => {
    try {
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, ragResults: data.results, formResults: undefined }
            : msg
        ));
      }
    } catch (error) {
      console.error('RAG search failed:', error);
    }
  };

  const handleFormSearch = async (messageId: string, userQuery: string) => {
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, formResults: data.results, ragResults: undefined }
            : msg
        ));
      }
    } catch (error) {
      console.error('Form search failed:', error);
    }
  };

  const handleDefaultResponse = (messageId: string) => {
    // Clear all results when default response is selected
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, ragResults: undefined, formResults: undefined }
        : msg
    ));
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-white">
      <div className="flex flex-col w-80 bg-gray-100 border-r border-gray-200">
        <Sidebar 
          settings={settings} 
          onSettingsChange={setSettings}
        />

        {/* ✅ Dynamic Form appended below Sidebar */}
        {formSchema && (
          <div className="p-4 border-t border-gray-300 overflow-y-auto max-h-[50vh]">
            <h3 className="text-md font-semibold mb-2 text-gray-800">Form Preview</h3>
            <DynamicForm schema={formSchema} />
          </div>
        )}
      </div>

      
      
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Country and Language dropdowns */}
            <div className="flex items-center gap-3">
              {/* Country dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                >
                  {countries.map((country) => (
                    <option key={country.name} value={country.name}>
                      {country.name} {country.flag}  
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Language dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                >
                  {languages.map((language) => (
                    <option key={language.name} value={language.name}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Clear chat button */}
              <button
                onClick={clearChat}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-sm">Clear Chat</span>
              </button>

            {/* Settings dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                  <GearIcon className="w-5 h-5 text-gray-700" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 mr-2" align="end">
                <div className="w-72 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Max Response Length: <span className="text-blue-600 font-semibold">{settings.maxTokens}</span></label>
                    <input type="range" min="50" max="300" value={settings.maxTokens} onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Temperature: <span className="text-blue-600 font-semibold">{settings.temperature}</span></label>
                    <input type="range" min="0.1" max="1.0" step="0.1" value={settings.temperature} onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Thinking Mode</label>
                    <select value={settings.thinkingMode} onChange={(e) => setSettings({ ...settings, thinkingMode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="off">Off - Direct responses</option>
                      <option value="on">On - Show reasoning</option>
                    </select>
                  </div>
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
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
                {messages.map((message, index) => {
                  const userQuery = index > 0 ? messages[index - 1].content : undefined;
  
                  return (
                  <ChatMessage
                  key={message.id}
                  message={message}
                  selectedButton={selectedButton}
                  onSelectedButtonChange={setSelectedButton}
                  isMostRecent={index === messages.length - 1}
                  setFormSchema={setFormSchema}   // 🔥 added this line
                  />
                  );
                  })}

                
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="w-full">
                      {loadingState === 'finding' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">
                            {selectedButton === 'ragForm' ? 'Finding relevant forms...' : 'Finding relevant files...'}
                          </span>
                        </div>
                      ) : loadingState === 'found' ? (
                        <div className="flex items-center gap-3 text-green-600">
                          <Check className="w-5 h-5 text-green-500" />
                          <span className="text-sm font-medium">Found</span>
                        </div>
                      ) : loadingState === 'generating' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Generating response...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Generating...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Action Buttons */}
            {messages.length > 0 && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setSelectedButton('default');
                    // Clear all results from the most recent message
                    if (messages.length > 0) {
                      const lastMessage = messages[messages.length - 1];
                      setMessages(prev => prev.map(msg => 
                        msg.id === lastMessage.id 
                          ? { ...msg, ragResults: undefined, formResults: undefined }
                          : msg
                      ));
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-200 ${
                    selectedButton === 'default'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Default Response
                </button>
                <button
                  onClick={() => {
                    setSelectedButton('ragLink');
                    // Just set the mode for the next message
                  }}
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
                  onClick={() => {
                    setSelectedButton('ragForm');
                    // Just set the mode for the next message
                  }}
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
            )}

            <div className="flex items-center gap-2 modern-input px-4 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder="Message Govly..."
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-base"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
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
          </div>
        </div>
      </div>
    </div>
  );
} 