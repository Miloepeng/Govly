import { useState, useEffect } from 'react';
import { Message, LoadingState, ResponseType, Settings } from '../types/chat';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>(null);
  const [selectedButton, setSelectedButton] = useState<ResponseType>('smart');
  const [settings, setSettings] = useState<Settings>({
    maxTokens: 300,
    temperature: 0.7,
    thinkingMode: 'off',
  });

  // Restore chat history from localStorage
  useEffect(() => {
    const savedChatHistory = localStorage.getItem("chatHistory");
    if (savedChatHistory) {
      try {
        const parsedHistory = JSON.parse(savedChatHistory);
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
          setMessages(parsedHistory);
          console.log("✅ Restored chat history from localStorage:", parsedHistory.length, "messages");
        }
      } catch (error) {
        console.error("❌ Error parsing saved chat history:", error);
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(messages));
    }
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("chatHistory");
    console.log("🗑️ Chat cleared and localStorage updated");
  };

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    loadingState,
    setLoadingState,
    selectedButton,
    setSelectedButton,
    settings,
    setSettings,
    clearChat,
  };
}

export function useScroll() {
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  const handleScroll = () => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setUserScrolledUp(!isAtBottom);
      
      if (isAtBottom) {
        setUserScrolledUp(false);
      }
    }
  };

  const scrollToBottom = () => {
    const messagesEndRef = document.getElementById('messages-end');
    if (messagesEndRef && !userScrolledUp) {
      messagesEndRef.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return {
    userScrolledUp,
    setUserScrolledUp,
    isTyping,
    setIsTyping,
    isTypingComplete,
    setIsTypingComplete,
    handleScroll,
    scrollToBottom,
  };
}

export function useLocalization() {
  const [selectedCountry, setSelectedCountry] = useState('Vietnam');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedCategory, setSelectedCategory] = useState<'housing' | 'business'>('housing');

  // Restore preferences from localStorage
  useEffect(() => {
    const savedCountry = localStorage.getItem("selectedCountry");
    const savedLanguage = localStorage.getItem("selectedLanguage");
    const savedCategory = localStorage.getItem("selectedCategory");

    if (savedCountry) setSelectedCountry(savedCountry);
    if (savedLanguage) setSelectedLanguage(savedLanguage);
    if (savedCategory && (savedCategory === 'housing' || savedCategory === 'business')) {
      setSelectedCategory(savedCategory as 'housing' | 'business');
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("selectedCountry", selectedCountry);
  }, [selectedCountry]);

  useEffect(() => {
    localStorage.setItem("selectedLanguage", selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    localStorage.setItem("selectedCategory", selectedCategory);
  }, [selectedCategory]);

  return {
    selectedCountry,
    setSelectedCountry,
    selectedLanguage,
    setSelectedLanguage,
    selectedCategory,
    setSelectedCategory,
  };
}
