import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Bot, Sparkles, Search, FileText, Check } from 'lucide-react';
import { TrashIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import ChatMessage from '../components/ChatMessage';
import Sidebar from '../components/Sidebar';
import { Message } from '../types/chat';
import DynamicForm from '../components/DynamicForm';
import { useSmartScroll } from '../hooks/useSmartScroll';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState<string>('New Chat');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [loadingState, setLoadingState] = useState<'understanding' | 'finding' | 'found' | 'generating' | 'chat' | 'agency' | 'retrieving_links' | 'retrieving_forms' | null>(null);
  const [selectedButton, setSelectedButton] = useState<'smart' | 'ragLink' | 'ragForm'>('smart');
  const [settings, setSettings] = useState({
    maxTokens: 300,
    temperature: 0.7,
    thinkingMode: 'off',
  });

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);



  const handleConfirmDeleteChat = () => {
    // Delete current chat from localStorage if it exists
    if (currentChatId) {
      localStorage.removeItem(`chat:${currentChatId}`);

      // Update saved chats list
      const savedChats = JSON.parse(localStorage.getItem('chatConversations') || '[]');
      const updatedChats = savedChats.filter((chat: any) => chat.id !== currentChatId);
      localStorage.setItem('chatConversations', JSON.stringify(updatedChats));

      // Create new chat ID and redirect (refresh page)
      const newChatId = `${Date.now()}`;
      localStorage.setItem(`chat:${newChatId}`, JSON.stringify([]));
      const newChats = [{ id: newChatId, title: 'New Chat', updatedAt: Date.now() }, ...updatedChats];
      localStorage.setItem('chatConversations', JSON.stringify(newChats));

      const search = new URLSearchParams(window.location.search);
      search.set('chatId', newChatId);
      window.location.href = `/${search.toString() ? `?${search.toString()}` : ''}`;
    } else {
      // If no current chat, just clear state
      setMessages([]);
      setCurrentChatId(null);
      setFormSchema(null);
      setLoadingState(null);
      setIsLoading(false);
      setChatTitle('New Chat');
      setIsGeneratingTitle(false);
      setSelectedAgency(null);
      setAgencyDetection(null);
      setCurrentFormSchema(null);
      setFormState([]);
      setPendingField(null);
      setExternalUpdate(null);
    }

    setIsDeleteDialogOpen(false);
  };

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

  // Use the smart scroll hook instead of manual scroll handling
  const { 
    userScrolledUp: userHasScrolledUp, 
    scrollToBottom,
    resetScrollState,
    setUserScrolledUp: setUserHasScrolledUp
  } = useSmartScroll({
    containerSelector: '[data-chat-container]',
    threshold: 100
  });

  // Function to generate chat title based on first 3 user messages
  const generateChatTitle = async (userMessages: string[]) => {
    if (userMessages.length < 3 || isGeneratingTitle) return;
    
    setIsGeneratingTitle(true);
    try {
      // Use fallback title generation since the endpoint doesn't exist
      const fallbackTitle = userMessages[0].length > 30 
        ? userMessages[0].substring(0, 30) + '...' 
        : userMessages[0];
      setChatTitle(fallbackTitle);
      console.log('Generated chat title:', fallbackTitle);
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Fallback to first message truncated
      const fallbackTitle = userMessages[0].length > 30 
        ? userMessages[0].substring(0, 30) + '...' 
        : userMessages[0];
      setChatTitle(fallbackTitle);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // Handle category parameter from URL
  useEffect(() => {
    if (router.isReady && router.query.category) {
      const category = router.query.category as string;
      if (category === 'housing' || category === 'business') {
        setSelectedCategory(category);
        console.log('Category set from URL:', category);
      }
    }
  }, [router.isReady, router.query.category]);

  // No more timer-based scrolling! The smart scroll hook handles everything automatically.

  // Helpers for conversations storage
  function getStoredConversations(): Array<{ id: string; title: string; updatedAt: number }> {
    try {
      const json = localStorage.getItem('chatConversations');
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  function saveStoredConversations(convs: Array<{ id: string; title: string; updatedAt: number }>) {
    localStorage.setItem('chatConversations', JSON.stringify(convs));
  }

  function saveCurrentConversation(messagesToSave: Message[]) {
    if (!currentChatId) return;
    localStorage.setItem(`chat:${currentChatId}`, JSON.stringify(messagesToSave));

    // Update list metadata
    const title = deriveTitle(messagesToSave);
    const updatedAt = Date.now();
    const convs = getStoredConversations();
    const idx = convs.findIndex(c => c.id === currentChatId);
    if (idx >= 0) convs[idx] = { id: currentChatId, title, updatedAt };
    else convs.unshift({ id: currentChatId, title, updatedAt });
    saveStoredConversations(convs);
  }

  function deriveTitle(msgs: Message[]): string {
    const firstUser = msgs.find(m => m.role === 'user');
    return firstUser?.content?.slice(0, 60) || 'New chat';
  }

  function startNewChat() {
    const newId = `${Date.now()}`;
    setCurrentChatId(newId);
    setMessages([]);
    setSelectedAgency(null);
    setAgencyDetection(null);
    localStorage.setItem(`chat:${newId}`, JSON.stringify([]));
    const convs = getStoredConversations();
    convs.unshift({ id: newId, title: 'New chat', updatedAt: Date.now() });
    saveStoredConversations(convs);
    // Update URL
    router.replace({ pathname: '/', query: { ...router.query, chatId: newId, category: router.query.category } }, undefined, { shallow: true });
  }

  // Restore chat history and user preferences from localStorage on component mount
  useEffect(() => {
    // Determine chat to load from URL or start a new one
    const queryId = (router.query.chatId as string) || null;
    let effectiveId = queryId;
    const convs = getStoredConversations();
    if (!effectiveId) {
      // Use most recent or create new
      effectiveId = convs[0]?.id || null;
    }
    if (!effectiveId) {
      // Start new chat if none exists
      const newId = `${Date.now()}`;
      setCurrentChatId(newId);
      setMessages([]);
      saveStoredConversations([{ id: newId, title: 'New chat', updatedAt: Date.now() }]);
      localStorage.setItem(`chat:${newId}`, JSON.stringify([]));
      router.replace({ pathname: '/', query: { ...router.query, chatId: newId, category: router.query.category } }, undefined, { shallow: true });
    } else {
      setCurrentChatId(effectiveId);
      const stored = localStorage.getItem(`chat:${effectiveId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setMessages(parsed);
        } catch {}
      }
      // Ensure URL reflects chatId
      if (router.query.chatId !== effectiveId) {
        router.replace({ pathname: '/', query: { ...router.query, chatId: effectiveId } }, undefined, { shallow: true });
      }
    }

    // Restore user preferences
    const savedLanguage = localStorage.getItem("selectedLanguage");
    const savedAgency = localStorage.getItem("selectedAgency");
    const savedButton = localStorage.getItem("selectedButton");
    const savedCategory = localStorage.getItem("selectedCategory");

    if (savedLanguage) setSelectedLanguage(savedLanguage);
    if (savedAgency) setSelectedAgency(savedAgency);
    if (savedButton && (savedButton === 'smart' || savedButton === 'ragLink' || savedButton === 'ragForm')) {
      setSelectedButton(savedButton as 'smart' | 'ragLink' | 'ragForm');
    }
    // Only restore category from localStorage if no URL parameter is present
    if (!router.query.category && savedCategory && (savedCategory === 'housing' || savedCategory === 'business')) {
      setSelectedCategory(savedCategory as 'housing' | 'business');
    }

    console.log("✅ Restored user preferences from localStorage");
  }, [router.isReady, router.query.category]); // Run when router is ready or category changes

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    saveCurrentConversation(messages);
  }, [messages]);

  // Check for continue application data from status page
  useEffect(() => {
    const continueAppData = localStorage.getItem('continueApplication');
    if (continueAppData) {
      try {
        const appData = JSON.parse(continueAppData);
        console.log('🔄 Continuing application in chat:', appData);
        
        // Set the form schema and state
        if (appData.schema) {
          setFormSchema(appData.schema);
          setCurrentFormSchema(appData.schema);
        }
        
        
        // Convert form data to form state format
        let formStateArray: Array<{ name: string; value: string }> = [];
        if (appData.formData) {
          formStateArray = Object.entries(appData.formData).map(([name, value]) => ({
            name,
            value: value as string
          }));
          setFormState(formStateArray);
        }
        
        // Add a message to the chat with the form embedded
        const continueMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `📝 Continuing your application: **${appData.formTitle}**\n\nI've loaded your previous form data. You can continue filling out the form below or ask me questions about it.`,
          timestamp: new Date(),
          formSchema: appData.schema,
          formState: formStateArray,
          continuingApplicationId: appData.id
        };
        
        setMessages(prev => [...prev, continueMessage]);
        
        // Clear the continue application data
        localStorage.removeItem('continueApplication');
        
      } catch (error) {
        console.error('Error parsing continue application data:', error);
        localStorage.removeItem('continueApplication');
      }
    }
  }, []); // Run once on mount


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

    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      
      // Check if we have exactly 3 user messages and generate title
      const userMessages = newMessages.filter(msg => msg.role === 'user');
      if (userMessages.length === 3 && chatTitle === 'New Chat') {
        generateChatTitle(userMessages.map(msg => msg.content));
      }
      
      return newMessages;
    });
    setInput('');
    setIsLoading(true);

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
      country: 'Vietnam',
      language: selectedLanguage,
      selectedAgency: selectedAgency, // Pass selected agency to backend
      settings: {
        ...settings,
        responseType: selectedButton, // Pass the selected button type to the API
        category: selectedCategory
      }
    };
    console.log('DEBUG: Sending request with country: Vietnam, language:', selectedLanguage, 'category:', selectedCategory);
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
                country: 'Vietnam',
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
                  country: 'Vietnam',
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
          country: 'Vietnam',
          language: selectedLanguage,
          selectedAgency: selectedAgency, // Pass selected agency to backend
          settings: {
            ...settings,
            responseType: selectedButton,
            ragResults: ragResults,
            formResults: formResults
          }
        };
            console.log('DEBUG: Sending RAG request with country: Vietnam, language:', selectedLanguage, 'category:', selectedCategory);
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
    // Keep current chatId but clear messages and update storage
    setMessages([]);
    if (currentChatId) {
      localStorage.setItem(`chat:${currentChatId}`, JSON.stringify([]));
      const convs = getStoredConversations();
      const idx = convs.findIndex(c => c.id === currentChatId);
      if (idx >= 0) {
        convs[idx].title = 'New chat';
        convs[idx].updatedAt = Date.now();
        saveStoredConversations(convs);
      }
    }
    resetScrollState(); // Reset scroll state when clearing chat
    console.log("🗑️ Chat cleared and localStorage updated");
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
      <Sidebar 
        settings={settings} 
        onSettingsChange={setSettings}
        userProfile={user ? { name: profile?.full_name || user.email || 'User', email: user.email || '', avatar: undefined } : undefined}
        onLogout={signOut}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Left controls: Category badge + dropdowns */}
            <div className="flex items-center gap-3">
              {/* Language dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {languages.map((language) => (
                    <option key={language.name} value={language.name}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category dropdown - prominent style */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as 'housing' | 'business')}
                  className={`px-4 py-2 rounded-xl font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent border ${selectedCategory === 'housing' || selectedCategory === 'business' ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white text-gray-900 border-gray-200'}`}
                >
                  <option value="housing">Housing</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
            {/* Delete Chat Button */}
            <button 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              title="Delete chat and start new"
            >
              <TrashIcon className="w-5 h-5 text-gray-700" />
            </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteDialogOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsDeleteDialogOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-6 mx-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <TrashIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Delete chat?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-5">This action is permanent. Once deleted, this chat cannot be restored.</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteChat}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agency Display Card */}
        {selectedAgency && (
          <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {selectedAgency.split(' ').map(word => word[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-900">
                      🏛️ Speaking on behalf of {selectedAgency}
                    </h3>
                    <p className="text-xs text-red-700">
                      All responses are now from this agency's perspective
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      🌍 Vietnam
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedAgency(null)}
                    className="text-red-600 hover:text-red-800 text-sm px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50"
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
                    }}
                    className="text-red-600 hover:text-red-800 text-sm px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50"
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
                        📍 {agencyDetection.category.replace("_", " ").toUpperCase()} • Vietnam
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
        <div 
          data-chat-container
          className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50"
        >
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
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
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Understanding user's question...</span>
                        </div>
                      ) : loadingState === 'finding' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Generating response...</span>
                        </div>
                      ) : loadingState === 'chat' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Generating response for chat endpoint...</span>
                        </div>
                      ) : loadingState === 'agency' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Generating agency suggestions...</span>
                        </div>
                      ) : loadingState === 'retrieving_links' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Retrieving relevant links...</span>
                        </div>
                      ) : loadingState === 'retrieving_forms' ? (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Retrieving relevant forms...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Generating...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div id="messages-end" />
              </>
            )}
          </div>
          
          {/* Scroll to bottom button - only show when user has scrolled up */}
          {userHasScrolledUp && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-24 right-6 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-10"
              aria-label="Scroll to bottom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>

        {/* Chat Input */}
        <div className="bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Action Buttons */}
            <div className="flex gap-2 mb-4 justify-between">
                <div className="flex gap-2">
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
                        ? 'bg-red-600 text-white border-red-600'
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
                        ? 'bg-red-600 text-white border-red-600'
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
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Find Forms
                  </button>
                </div>
                
              </div>


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
                className="p-2 rounded-md text-gray-600 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
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