import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, MessageSquare, Send, FileText, ExternalLink, Maximize2, Minimize2, Search, Quote } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Document {
  id: string;
  title: string;
  type: 'pdf' | 'link';
  category: string;
  description: string;
  url: string;
  dateAdded: string;
  author?: string;
  tags: string[];
  size?: string;
  content?: string; // For AI analysis
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Array<{
    text: string;
    page?: number;
    section?: string;
  }>;
}

// Hardcoded documents (same as in documents list)
const SAMPLE_DOCUMENTS: Document[] = [
  {
    id: '1',
    title: 'Vietnam Business Registration Guide 2024',
    type: 'pdf',
    category: 'Business',
    description: 'Complete guide for registering a business in Vietnam, including all required forms and procedures.',
    url: '/documents/business-registration-guide.pdf',
    dateAdded: '2024-09-15',
    author: 'Ministry of Planning and Investment',
    tags: ['business', 'registration', 'guide'],
    size: '2.4 MB',
    content: `# Vietnam Business Registration Guide 2024

## Overview
This comprehensive guide provides step-by-step instructions for registering a business in Vietnam. The process involves several key stages and requires specific documentation.

## Key Requirements
1. Business name registration
2. Investment certificate (for foreign investors)
3. Business registration certificate
4. Tax registration
5. Labor registration

## Required Documents
- Passport copies of all investors
- Proof of registered address
- Business plan and financial projections
- Articles of association
- Investment decision documents

## Processing Time
- Business name registration: 3-5 working days
- Investment certificate: 15-45 days depending on sector
- Business registration: 15-20 working days
- Total estimated time: 35-70 working days

## Fees Structure
- Business name registration: 100,000 VND
- Investment certificate: 11,000,000 VND
- Business registration: 300,000 VND
- Total estimated fees: 11,400,000 VND

For detailed procedures and forms, please refer to the subsequent sections of this guide.`
  },
  {
    id: '2',
    title: 'Housing Permit Application Requirements',
    type: 'link',
    category: 'Housing',
    description: 'Official government webpage detailing housing permit application requirements and procedures.',
    url: 'https://example.gov.vn/housing-permits',
    dateAdded: '2024-09-10',
    author: 'Ministry of Construction',
    tags: ['housing', 'permits', 'requirements'],
    content: `# Housing Permit Application Requirements

## Introduction
This document outlines the requirements and procedures for obtaining housing permits in Vietnam. All construction projects must comply with local regulations and obtain proper permits before construction begins.

## Types of Housing Permits
1. Construction permits for new buildings
2. Renovation permits for existing structures
3. Demolition permits
4. Occupancy permits

## Application Process
### Step 1: Document Preparation
Gather all required documents including:
- Land use rights certificate
- Architectural drawings approved by authorized agencies
- Construction contractor license
- Environmental impact assessment (if required)

### Step 2: Submission
Submit applications to the local Department of Construction or People's Committee depending on project scope.

### Step 3: Review Process
Authorities review submissions within 20-45 days depending on project complexity.

## Common Requirements
- Valid land use rights
- Compliance with local zoning regulations
- Approved architectural plans
- Licensed contractors
- Environmental clearances where applicable

For specific requirements in your locality, contact your local construction department.`
  },
  // Add more sample documents as needed...
];

export default function DocumentViewerPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [document, setDocument] = useState<Document | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (id) {
      // Find document by ID
      const foundDoc = SAMPLE_DOCUMENTS.find(doc => doc.id === id);
      if (foundDoc) {
        setDocument(foundDoc);
        // Add welcome message
        setChatMessages([{
          id: '1',
          role: 'assistant',
          content: `Hi! I'm here to help you understand "${foundDoc.title}". I can explain concepts, find specific information, summarize sections, and answer questions about this document. What would you like to know?`,
          timestamp: new Date()
        }]);
      }
    }
  }, [id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !document) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      // Try to use real API first, fallback to hardcoded responses
      let response;

      try {
        // Use the existing chat endpoint with document context
        const apiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Based on the document "${document.title}" (${document.category}), please answer: ${newMessage}`,
            conversationContext: chatMessages.slice(-5).map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            country: 'Vietnam',
            language: 'English',
            settings: {
              documentContext: {
                title: document.title,
                category: document.category,
                type: document.type,
                content: document.content?.substring(0, 2000) // Send first 2000 chars as context
              }
            }
          })
        });

        if (apiResponse.ok) {
          const apiResult = await apiResponse.json();
          response = {
            content: apiResult.response,
            citations: [{ text: document.title, section: document.category }]
          };
        } else {
          throw new Error('API request failed');
        }
      } catch (apiError) {
        console.log('API call failed, using fallback response:', apiError);
        // Fallback to hardcoded responses
        response = generateAIResponse(newMessage, document);
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        citations: response.citations
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = (query: string, doc: Document) => {
    const lowerQuery = query.toLowerCase();

    // Simple pattern matching for demo
    if (lowerQuery.includes('fee') || lowerQuery.includes('cost') || lowerQuery.includes('price')) {
      if (doc.id === '1') {
        return {
          content: 'According to the Business Registration Guide, the total estimated fees are 11,400,000 VND, which breaks down as follows:\n\n• Business name registration: 100,000 VND\n• Investment certificate: 11,000,000 VND\n• Business registration: 300,000 VND\n\nThese fees may vary depending on your specific business type and location.',
          citations: [{ text: 'Fees Structure', section: 'Section 5' }]
        };
      }
    }

    if (lowerQuery.includes('time') || lowerQuery.includes('how long') || lowerQuery.includes('duration')) {
      if (doc.id === '1') {
        return {
          content: 'The business registration process typically takes 35-70 working days in total:\n\n• Business name registration: 3-5 working days\n• Investment certificate: 15-45 days (depending on sector)\n• Business registration: 15-20 working days\n\nThe timeline can vary based on the complexity of your business and completeness of documentation.',
          citations: [{ text: 'Processing Time', section: 'Section 4' }]
        };
      }
    }

    if (lowerQuery.includes('document') || lowerQuery.includes('require') || lowerQuery.includes('need')) {
      if (doc.id === '1') {
        return {
          content: 'For business registration in Vietnam, you need the following key documents:\n\n• Passport copies of all investors\n• Proof of registered address\n• Business plan and financial projections\n• Articles of association\n• Investment decision documents\n\nMake sure all documents are properly notarized and translated if necessary.',
          citations: [{ text: 'Required Documents', section: 'Section 3' }]
        };
      }
    }

    if (lowerQuery.includes('permit') && doc.id === '2') {
      return {
        content: 'There are four main types of housing permits in Vietnam:\n\n1. Construction permits for new buildings\n2. Renovation permits for existing structures\n3. Demolition permits\n4. Occupancy permits\n\nEach type has specific requirements and processing procedures.',
        citations: [{ text: 'Types of Housing Permits', section: 'Section 2' }]
      };
    }

    // Default response
    return {
      content: `I can help you understand various aspects of "${doc.title}". Could you be more specific about what you'd like to know? For example, you could ask about:\n\n• Requirements and procedures\n• Timelines and processing duration\n• Fees and costs\n• Required documents\n• Specific sections or concepts\n\nWhat particular aspect interests you?`,
      citations: []
    };
  };

  const handleQuickQuestion = (question: string) => {
    setNewMessage(question);
  };

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Document not found</h2>
          <p className="text-gray-600 mb-4">The requested document could not be found.</p>
          <button
            onClick={() => router.push('/documents')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/documents')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              document.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {document.type === 'pdf' ? (
                <FileText className="w-4 h-4" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {document.title}
              </h1>
              <p className="text-sm text-gray-600">{document.category} • {document.author}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Viewer */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          isFullscreen ? 'w-full' : 'w-2/3'
        }`}>
          <div className="h-full flex flex-col">
            {/* Document Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search in document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-auto p-6">
              {document.type === 'pdf' ? (
                <div className="prose max-w-none">
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Note:</strong> This is a preview of the document content. In a real implementation,
                      this would show the actual PDF using a PDF viewer library.
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>File:</strong> {document.url} ({document.size})
                    </p>
                  </div>
                  <div className="whitespace-pre-line">
                    {document.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>External Link:</strong> This document is hosted on an external website.
                    </p>
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      {document.url}
                    </a>
                  </div>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-line">
                      {document.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Chatbot Panel */}
        {!isFullscreen && (
          <div className="w-1/3 bg-white flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                  <p className="text-xs text-gray-600">Ask questions about this document</p>
                </div>
              </div>
            </div>

            {/* Quick Questions */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <p className="text-xs font-medium text-gray-700 mb-2">Quick questions:</p>
              <div className="space-y-2">
                {document.id === '1' && (
                  <>
                    <button
                      onClick={() => handleQuickQuestion('What are the fees for business registration?')}
                      className="w-full text-left text-xs p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      What are the fees for business registration?
                    </button>
                    <button
                      onClick={() => handleQuickQuestion('How long does the process take?')}
                      className="w-full text-left text-xs p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      How long does the process take?
                    </button>
                    <button
                      onClick={() => handleQuickQuestion('What documents do I need?')}
                      className="w-full text-left text-xs p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      What documents do I need?
                    </button>
                  </>
                )}
                {document.id === '2' && (
                  <>
                    <button
                      onClick={() => handleQuickQuestion('What types of housing permits are available?')}
                      className="w-full text-left text-xs p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      What types of housing permits are available?
                    </button>
                    <button
                      onClick={() => handleQuickQuestion('What is the application process?')}
                      className="w-full text-left text-xs p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      What is the application process?
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        {message.citations.map((citation, index) => (
                          <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                            <Quote className="w-3 h-3" />
                            <span>{citation.text}</span>
                            {citation.section && <span>• {citation.section}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs opacity-75 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about this document..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isLoading}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}