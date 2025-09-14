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
  const [loadingState, setLoadingState] = useState<'understanding' | 'finding' | 'found' | 'generating' | 'chat' | 'agency' | 'retrieving_links' | 'retrieving_forms' | null>(null);
  const [selectedButton, setSelectedButton] = useState<'smart' | 'ragLink' | 'ragForm'>('smart');
  const [settings, setSettings] = useState({
    maxTokens: 300,
    temperature: 0.7,
    thinkingMode: 'off',
  });

  const [selectedCountry, setSelectedCountry] = useState('Vietnam');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedCategory, setSelectedCategory] = useState<'housing' | 'business'>('housing');
  const [formSchema, setFormSchema] = useState<any>(null);

  const [pendingField, setPendingField] = useState<string | null>(null);
  const [externalUpdate, setExternalUpdate] = useState<{ field: string; value: string } | null>(null);

  const [currentFormSchema, setCurrentFormSchema] = useState<any>(null);
  const [formState, setFormState] = useState<any[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [agencyDetection, setAgencyDetection] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);


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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Simple auto-scroll: scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Continuous scroll during typing animations and loading states
  useEffect(() => {
    if (isLoading || loadingState || isTyping) {
      // Scroll every 100ms while loading/typing to keep up with the animation
      const interval = setInterval(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [isLoading, loadingState, isTyping]);

  // Additional scroll during typing animations (when messages are being typed out)
  useEffect(() => {
    // Check if the last message is from assistant and might be typing
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        // Calculate scrolling duration based on text length and typing speed
        const textLength = lastMessage.content.length;
        const typingSpeed = 6; // characters per 100ms (from TypingText speed prop)
        const scrollDuration = Math.max(
          (textLength * 100) / typingSpeed, // Time needed to type the full text
          5000 // Minimum 5 seconds
        );
        
        console.log(`📝 Text length: ${textLength} chars, calculated scroll duration: ${scrollDuration}ms`);
        
        // Scroll continuously for the calculated duration
        const scrollInterval = setInterval(() => {
          scrollToBottom();
        }, 200); // Slightly slower than loading scroll to avoid conflicts
        
        // Stop after calculated duration
        const stopScroll = setTimeout(() => {
          clearInterval(scrollInterval);
        }, scrollDuration);
        
        return () => {
          clearInterval(scrollInterval);
          clearTimeout(stopScroll);
        };
      }
    }
  }, [messages]);

  // Scroll when loading state changes
  useEffect(() => {
    if (loadingState) {
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [loadingState]);

  // Restore chat history and user preferences from localStorage on component mount
  useEffect(() => {
    // Restore chat history
    const savedChatHistory = localStorage.getItem("chatHistory");
    if (savedChatHistory) {
      try {
        const parsedHistory = JSON.parse(savedChatHistory);
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
          setMessages(parsedHistory);
          console.log("✅ Restored chat history from localStorage:", parsedHistory.length, "messages");
          
          // Show a subtle notification that chat was restored
          console.log(`💾 Chat history restored: ${parsedHistory.length} messages`);
          
          // Scroll to bottom after restoring chat history
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (error) {
        console.error("❌ Error parsing saved chat history:", error);
      }
    }

    // Restore user preferences
    const savedCountry = localStorage.getItem("selectedCountry");
    const savedLanguage = localStorage.getItem("selectedLanguage");
    const savedAgency = localStorage.getItem("selectedAgency");
    const savedButton = localStorage.getItem("selectedButton");
    const savedCategory = localStorage.getItem("selectedCategory");

    if (savedCountry) setSelectedCountry(savedCountry);
    if (savedLanguage) setSelectedLanguage(savedLanguage);
    if (savedAgency) setSelectedAgency(savedAgency);
    if (savedButton && (savedButton === 'smart' || savedButton === 'ragLink' || savedButton === 'ragForm')) {
      setSelectedButton(savedButton as 'smart' | 'ragLink' | 'ragForm');
    }
    if (savedCategory && (savedCategory === 'housing' || savedCategory === 'business')) {
      setSelectedCategory(savedCategory as 'housing' | 'business');
    }

    console.log("✅ Restored user preferences from localStorage");
  }, []); // Empty dependency array - only run once on mount

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(messages));
    }
  }, [messages]);

  // Save user preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("selectedCountry", selectedCountry);
  }, [selectedCountry]);

  useEffect(() => {
    localStorage.setItem("selectedLanguage", selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    if (selectedAgency) {
      localStorage.setItem("selectedAgency", selectedAgency);
    } else {
      localStorage.removeItem("selectedAgency");
    }
  }, [selectedAgency]);

  useEffect(() => {
    localStorage.setItem("selectedButton", selectedButton);
  }, [selectedButton]);

  useEffect(() => {
    localStorage.setItem("selectedCategory", selectedCategory);
  }, [selectedCategory]);

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
    
    // Scroll to bottom when user sends message
    setTimeout(() => scrollToBottom(), 100);

    // Set initial loading state based on response type
    if (selectedButton === 'ragLink' || selectedButton === 'ragForm') {
      setLoadingState('finding');
    } else {
      // For default/smart response, start with understanding
      setLoadingState('understanding');
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
      selectedAgency: selectedAgency, // Pass selected agency to backend
      settings: {
        ...settings,
        responseType: selectedButton, // Pass the selected button type to the API
        category: selectedCategory
      }
    };
    console.log('DEBUG: Sending request with country:', selectedCountry, 'language:', selectedLanguage);
    console.log('DEBUG: Selected button type:', selectedButton);
    console.log('DEBUG: Full request body:', requestBody);
    console.log('DEBUG: Sending to endpoint:', '/api/smartChat');
    
    const response = await fetch('/api/smartChat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      const data = await response.json();
      
      // Check if this is a SmartChat response with routing info
      if (data.agency_detection) {
        // SmartChat routed to agency choice
        setLoadingState('agency');
        setTimeout(() => setLoadingState(null), 1000);
      } else if (data.response_type === 'ragLink' || data.response_type === 'ragForm') {
        // SmartChat routed to RAG search with LLM explanation
        // The backend now provides an intelligent explanation of how the documents relate to the user's query
        console.log('DEBUG: SmartChat routed to RAG:', data.response_type);
        console.log('DEBUG: RAG results:', data.results);
        console.log('DEBUG: LLM explanation response:', data.response);
        
        setSelectedButton(data.response_type === 'ragLink' ? 'ragLink' : 'ragForm');
        
        // Show immediate loading state based on what we're retrieving
        // This gives users instant feedback that SmartChat has routed to RAG endpoints
        if (data.response_type === 'ragLink') {
          setLoadingState('retrieving_links');
        } else {
          setLoadingState('retrieving_forms');
        }
        
        // Show loading states and create message with explanation
        setTimeout(() => {
          setLoadingState('found');
          setTimeout(() => {
            setLoadingState('generating');
            
            // Create the assistant message with explanation and RAG results
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.response, // This is now the LLM explanation
              userQuery: userMessage.content,
              timestamp: new Date(),
              ragResults: data.response_type === 'ragLink' ? data.results : undefined,
              formResults: data.response_type === 'ragForm' ? data.results : undefined
            };
            setMessages(prev => [...prev, assistantMessage]);
            
            // Scroll to bottom when assistant message is added
            setTimeout(() => scrollToBottom(), 100);
            
            setTimeout(() => {
              setLoadingState(null);
              // Switch back to Smart Response after showing results
              setSelectedButton('smart');
            }, 1000);
          }, 1000);
        }, 1000);
        
        // Exit early to prevent duplicate processing
        return;
      } else if (selectedButton === 'smart') {
        // SmartChat routed to general chat
        setLoadingState('chat');
        setTimeout(() => setLoadingState(null), 1000);
      }
      
      // For manual RAG button clicks, get RAG results first, then generate AI response
      if (selectedButton === 'ragLink' || selectedButton === 'ragForm') {
        let ragResults: any[] = [];
        let formResults: any[] = [];
        
        if (selectedButton === 'ragLink' || data.response_type === 'ragLink') {
          // Get RAG link results first (or use SmartChat results)
          if (data.response_type === 'ragLink') {
            // SmartChat already has results
            ragResults = data.results || [];
            setLoadingState('found');
            setTimeout(() => setLoadingState('generating'), 1000);
          } else {
            // Manual button click - fetch results
            setLoadingState('retrieving_links');
            const ragResponse = await fetch('/api/ragLink', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: userMessage.content,
                country: selectedCountry,
                language: selectedLanguage,
                category: selectedCategory
              })
            });
            if (ragResponse.ok) {
              const ragData = await ragResponse.json();
              ragResults = ragData.results;
            }
            // Show found state briefly, then change to generating
            setLoadingState('found');
            setTimeout(() => setLoadingState('generating'), 1000);
          }
        } else if (selectedButton === 'ragForm' || data.response_type === 'ragForm') {
          // Handle forms (manual OR SmartChat)
          if (data.response_type === 'ragForm') {
            // SmartChat already has results
            formResults = data.results || [];
            setLoadingState('found');
            setTimeout(() => setLoadingState('generating'), 1000);
          } else {
            // Manual button click - fetch results
            if (!currentFormSchema) {
              // First time → search forms, then extract schema
              setLoadingState('retrieving_forms');
              const formResponse = await fetch('/api/ragForm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: userMessage.content,
                  country: selectedCountry,
                  language: selectedLanguage
                })
              });
              if (formResponse.ok) {
                const formData = await formResponse.json();
                formResults = formData.results;

                if (formResults.length > 0) {
                  // 👇 Call extractFormById on the first result
                  const extractResponse = await fetch('/api/extractFormById', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ form_id: formResults[0].id })
                  });

                  if (extractResponse.ok) {
                    const schemaData = await extractResponse.json();
                    setFormSchema(schemaData);
                    setCurrentFormSchema(schemaData);
                  }
                }
              }
            } else {
              // Subsequent replies → only update values
              try {
                const fillResponse = await fetch('/api/fillForm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    form_schema: currentFormSchema,   // must match backend
                    chat_history: conversationContext
                  })
                });

                if (fillResponse.ok) {
                  const fillData = await fillResponse.json();
                  setFormState(fillData.fields);
                }
              } catch (err) {
                console.error("fillForm error", err);
              }
            }

            // Show found state briefly, then change to generating
            setLoadingState('found');
            setTimeout(() => setLoadingState('generating'), 1000);
          }
        }
        
        // Now generate AI response with knowledge of the results
        const aiRequestBody = {
          message: userMessage.content,
          conversationContext: conversationContext,
          country: selectedCountry,
          language: selectedLanguage,
          selectedAgency: selectedAgency, // Pass selected agency to backend
          settings: {
            ...settings,
            responseType: selectedButton,
            ragResults: ragResults,
            formResults: formResults
          }
        };
        console.log('DEBUG: Sending RAG request with country:', selectedCountry, 'language:', selectedLanguage);
        console.log('DEBUG: Full RAG request body:', aiRequestBody);
        
        const aiResponse = await fetch('/api/smartChat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiRequestBody)
        });
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          
          // Check if AI is suggesting agency connection
          if (aiData.agency_detection && aiData.agency_detection.should_offer_agency) {
            setAgencyDetection({
              needs_agency: true,
              agency: aiData.agency_detection.suggested_agency,
              reasoning: "AI detected this query needs specialized agency help"
            });
          }
          
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
          
          // Scroll to bottom when assistant message is added
          setTimeout(() => scrollToBottom(), 100);
        }
      } else {
        // Default response - no RAG/Form search
                  const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response,
            userQuery: userMessage.content,
            timestamp: new Date(),
            // Attach RAG results based on SmartChat response type
            ragResults: data.response_type === 'ragLink' ? data.results : undefined,
            formResults: data.response_type === 'ragForm' ? data.results : undefined
          };
        
        // Check if AI is suggesting agency connection
        if (data.agency_detection && data.agency_detection.should_offer_agency) {
          setAgencyDetection({
            needs_agency: true,
            agency: data.agency_detection.suggested_agency,
            reasoning: "AI detected this query needs specialized agency help"
          });
        }
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Scroll to bottom when assistant message is added
        setTimeout(() => scrollToBottom(), 100);
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
    
    // Scroll to bottom when error message is added
    setTimeout(() => scrollToBottom(), 100);
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
        
        // Scroll to bottom when RAG results are updated
        setTimeout(() => scrollToBottom(), 100);
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
        
        // Scroll to bottom when form results are updated
        setTimeout(() => scrollToBottom(), 100);
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
    localStorage.removeItem("chatHistory");
    console.log("🗑️ Chat cleared and localStorage updated");
  };

  return (
    <div className="flex h-screen bg-white">
      <Sidebar 
        settings={settings} 
        onSettingsChange={setSettings}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Country, Language, and Category dropdowns */}
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

              {/* Category dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as 'housing' | 'business')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                >
                  <option value="housing">Housing</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Clear chat button */}
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear the chat? This action cannot be undone.")) {
                    clearChat();
                  }
                }}
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

        {/* Agency Display Card */}
        {selectedAgency && (
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {selectedAgency.split(' ').map(word => word[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">
                      🏛️ Speaking on behalf of {selectedAgency}
                    </h3>
                    <p className="text-xs text-blue-700">
                      All responses are now from this agency's perspective
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      🌍 {selectedCountry}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedAgency(null)}
                    className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-50"
                  >
                    Disconnect
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAgency(null);
                      setAgencyDetection(null);
                      // Add disconnection message to chat
                      const disconnectionMessage: Message = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: `🔌 Disconnected from ${selectedAgency}. I'm now providing general government assistance.`,
                        timestamp: new Date()
                      };
                      setMessages(prev => [...prev, disconnectionMessage]);
                      
                      // Scroll to bottom when disconnection message is added
                      setTimeout(() => scrollToBottom(), 100);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-50"
                  >
                    Switch Agency
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agency Detection Suggestion */}
        {agencyDetection && agencyDetection.needs_agency && agencyDetection.agency && !selectedAgency && (
          <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">💡</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-green-900">
                      Would you like to talk to {agencyDetection.agency}?
                    </h3>
                    <p className="text-xs text-green-700">
                      {agencyDetection.reasoning}
                    </p>
                    {agencyDetection.category && (
                      <p className="text-xs text-green-600 mt-1">
                        📍 {agencyDetection.category.replace("_", " ").toUpperCase()} • {selectedCountry}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedAgency(agencyDetection.agency);
                      setAgencyDetection(null); // Hide suggestion after accepting
                      
                      // Add confirmation message to chat
                      const confirmationMessage: Message = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: `✅ Connected to ${agencyDetection.agency}! I'm now speaking on behalf of this agency and can provide you with specialized assistance.`,
                        timestamp: new Date()
                      };
                      setMessages(prev => [...prev, confirmationMessage]);
                      
                      // Scroll to bottom when agency confirmation is added
                      setTimeout(() => scrollToBottom(), 100);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg"
                  >
                    Yes, connect me
                  </button>
                  <button
                    onClick={() => setAgencyDetection(null)}
                    className="text-green-600 hover:text-green-800 text-sm px-4 py-2 rounded-lg border border-green-200 hover:bg-green-50"
                  >
                    No, thanks
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  setFormSchema={(schema) => {
                  setFormSchema(schema);
                  setCurrentFormSchema(schema); // 🔥 make sure fillForm uses the right one
                  }}
                  chatHistory={messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                  }))}
                  onTypingStart={() => setIsTyping(true)}
                  onTypingComplete={() => setIsTyping(false)}
                  />

                  );
                  })}

                
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="w-full">
                      {loadingState === 'understanding' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Understanding user's question...</span>
                        </div>
                      ) : loadingState === 'finding' ? (
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
                      ) : loadingState === 'chat' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Generating response for chat endpoint...</span>
                        </div>
                      ) : loadingState === 'agency' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Generating agency suggestions...</span>
                        </div>
                      ) : loadingState === 'retrieving_links' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Retrieving relevant links...</span>
                        </div>
                      ) : loadingState === 'retrieving_forms' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Retrieving relevant forms...</span>
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
                    setSelectedButton('smart');
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