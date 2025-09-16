import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, MessageSquare, Send, FileText, ExternalLink, Maximize2, Minimize2, Search, Quote, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import dynamic from 'next/dynamic';
const PDFViewer = dynamic(() => import('../../components/PDFViewer'), { ssr: false });
import WebsiteViewer from '../../components/WebsiteViewer';

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
  referencedSections?: string[];
}

// Component for rendering document content with highlights and search
function DocumentContentWithHighlights({
  content,
  highlightedSections,
  searchQuery
}: {
  content: string;
  highlightedSections: string[];
  searchQuery: string;
}) {
  const highlightText = (text: string) => {
    if (!searchQuery && highlightedSections.length === 0) {
      return text;
    }

    let processedText = text;

    // Highlight search query
    if (searchQuery.trim()) {
      const searchRegex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      processedText = processedText.replace(
        searchRegex,
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
      );
    }

    // Highlight referenced sections
    highlightedSections.forEach((section) => {
      const variations = [
        section,
        `# ${section}`,
        `## ${section}`,
        section.toLowerCase(),
      ];

      variations.forEach((variation) => {
        const sectionRegex = new RegExp(`(${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        processedText = processedText.replace(
          sectionRegex,
          '<mark class="bg-red-100 text-red-800 px-2 py-1 rounded-md border-l-4 border-red-500">$1</mark>'
        );
      });
    });

    return processedText;
  };

  return (
    <div
      className="whitespace-pre-line"
      dangerouslySetInnerHTML={{ __html: highlightText(content) }}
    />
  );
}

// Hardcoded documents using real PDFs and government websites
const SAMPLE_DOCUMENTS: Document[] = [
  {
    id: '1',
    title: 'Giấy chứng nhận đăng ký doanh nghiệp - Công ty cổ phần',
    type: 'pdf',
    category: 'Business',
    description: 'Business registration certificate for joint stock companies in Vietnam.',
    url: '/api/pdf/vietmy-giay-chung-nhan-dang-ky-doanh-nghiep-cong-ty-co-phan.pdf',
    dateAdded: '2024-09-15',
    author: 'Ministry of Planning and Investment',
    tags: ['business', 'registration', 'certificate'],
    size: '2.1 MB',
    content: `# Business Registration Certificate - Joint Stock Company

## Company Information
This certificate contains official registration details for a joint stock company in Vietnam, including:

## Key Sections
- Company name and legal form
- Business address and headquarters location
- Charter capital and ownership structure
- Business scope and activities
- Legal representative information
- Registration number and dates

## Required Documents for Registration
- Application for business registration
- Company charter/articles of association
- List of founding shareholders
- Proof of legal capital contribution
- Headquarters lease agreement or ownership documents

## Processing Information
- Registration authority: Department of Planning and Investment
- Processing time: 15-20 working days
- Certificate validity: Permanent (subject to annual reporting)

This certificate serves as legal proof of business establishment and operation authorization.`
  },
  {
    id: '2',
    title: 'Đơn xin xác nhận có đất ở hợp pháp',
    type: 'pdf',
    category: 'Housing',
    description: 'Application form for legal residential land confirmation in Vietnam.',
    url: '/api/pdf/Mẫu_đơn_xin_xác_nhận_có_đất_ở_hợp_pháp.pdf',
    dateAdded: '2024-09-14',
    author: 'Ministry of Natural Resources and Environment',
    tags: ['housing', 'land', 'confirmation'],
    size: '1.8 MB',
    content: `# Application for Legal Residential Land Confirmation

## Purpose
This form is used to apply for official confirmation of legal residential land ownership in Vietnam.

## Required Information
- Personal information of applicant
- Property location and boundaries
- Current land use status
- Supporting documentation

## Key Sections
1. Applicant personal details
2. Property information and location
3. Land use history and documentation
4. Current occupancy status
5. Supporting evidence attachments

## Supporting Documents
- Identity card/passport copies
- Existing land use certificates (if any)
- Property purchase agreements
- Inheritance documents (if applicable)
- Survey maps and boundaries
- Neighbor confirmations

## Processing Timeline
- Initial review: 7-10 working days
- Field verification: 10-15 working days
- Final approval: 20-30 working days total

This confirmation is essential for property transactions and development permits.`
  },
  {
    id: '3',
    title: 'Mẫu số 16 - Phụ lục I (Form Template)',
    type: 'pdf',
    category: 'Administrative',
    description: 'Official government form template for administrative procedures.',
    url: '/api/pdf/8_5_2025_32_14_636_mau-so-16---phu-luc-i.pdf',
    dateAdded: '2024-09-13',
    author: 'Government Administrative Office',
    tags: ['form', 'administrative', 'template'],
    size: '1.2 MB',
    content: `# Form Template No. 16 - Appendix I

## Form Purpose
This is an official government form template used for various administrative procedures and applications.

## Form Sections
- Header with ministry/agency information
- Applicant identification section
- Application details and purpose
- Supporting document checklist
- Signature and date fields

## Usage Guidelines
- Complete all required fields clearly
- Attach necessary supporting documents
- Submit to appropriate government office
- Retain copies for personal records

## Processing Information
- Form submission requirements
- Documentation checklist
- Processing timeline expectations
- Contact information for inquiries

This standardized form ensures consistent processing of administrative requests across government departments.`
  },
  {
    id: '4',
    title: 'FAQ - Frequently Asked Questions',
    type: 'link',
    category: 'Support',
    description: 'Frequently asked questions about government services and procedures from Ministry of Industry and Trade.',
    url: 'https://dichvucong.moit.gov.vn/FAQ.aspx',
    dateAdded: '2024-09-12',
    author: 'Ministry of Industry and Trade',
    tags: ['faq', 'support', 'questions'],
    content: `# Frequently Asked Questions - Government Services

## Common Questions
This page provides answers to frequently asked questions about government services and administrative procedures.

## Topics Covered
- Business registration procedures
- License applications and renewals
- Document requirements and processing
- Fee structures and payment methods
- Contact information for assistance

## Service Categories
1. Business Registration Services
2. Import/Export Licensing
3. Industrial Development Permits
4. Trade Promotion Services
5. Consumer Protection

## How to Use
- Browse categories to find relevant questions
- Use search function for specific topics
- Contact support if question not found
- Submit new questions through feedback form

## Support Channels
- Online chat support
- Phone hotline assistance
- Email inquiry system
- In-person consultations

Updated regularly with new questions and policy changes.`
  },
  {
    id: '5',
    title: 'Business Support Services',
    type: 'link',
    category: 'Business',
    description: 'Business support hotline and consultation services from Ministry of Industry and Trade.',
    url: 'https://dichvucong.moit.gov.vn/SupportPhone.aspx',
    dateAdded: '2024-09-11',
    author: 'Ministry of Industry and Trade',
    tags: ['business', 'support', 'hotline'],
    content: `# Business Support Services

## Support Hotline
Dedicated phone support for businesses seeking assistance with government procedures and regulations.

## Services Provided
- Guidance on business registration
- License application assistance
- Regulatory compliance advice
- Document preparation support
- Process timeline information

## Contact Methods
- Toll-free hotline numbers
- Regional office locations
- Email support addresses
- Online consultation booking

## Operating Hours
- Monday to Friday: 8:00 AM - 5:00 PM
- Lunch break: 12:00 PM - 1:00 PM
- Emergency contact available

## Support Languages
- Vietnamese (primary)
- English (limited availability)
- Other languages upon request

## Preparation Tips
- Have business documents ready
- Prepare specific questions
- Note reference numbers if applicable
- Allow sufficient time for consultation`
  },
  {
    id: '6',
    title: 'E-commerce Registration Services',
    type: 'link',
    category: 'E-commerce',
    description: 'Registration and amendment services for e-commerce business applications.',
    url: 'https://dichvucong.moit.gov.vn/VdxpTTHCOnlineDetail.aspx?DocId=254',
    dateAdded: '2024-09-10',
    author: 'Ministry of Industry and Trade',
    tags: ['ecommerce', 'registration', 'amendments'],
    content: `# E-commerce Registration and Amendment Services

## Service Overview
Online platform for registering e-commerce businesses and managing registration amendments in Vietnam.

## Available Services
- Initial e-commerce registration
- Registration information amendments
- Business scope modifications
- Contact detail updates
- Legal representative changes

## Registration Requirements
- Valid business license
- E-commerce business plan
- Technical infrastructure details
- Privacy policy and terms of service
- Consumer protection measures

## Amendment Process
1. Login to e-government portal
2. Select amendment type
3. Complete required forms
4. Upload supporting documents
5. Submit and track application

## Processing Times
- New registrations: 15-20 business days
- Simple amendments: 7-10 business days
- Complex changes: 10-15 business days

## Required Documents
- Business registration certificate
- Legal representative ID
- Current e-commerce registration (for amendments)
- Detailed change documentation

Modern online platform with real-time tracking and digital certificate issuance.`
  }
];

export default function DocumentViewerPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const documentContentRef = useRef<HTMLDivElement>(null);

  const [document, setDocument] = useState<Document | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedSections, setHighlightedSections] = useState<string[]>([]);
  const [persistentHighlights, setPersistentHighlights] = useState<string[]>([]);
  const [extractedContent, setExtractedContent] = useState<string>('');
  const [isDocumentLoading, setIsDocumentLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      const loadDocument = async () => {
        setIsDocumentLoading(true);
        try {
          // First try to fetch from API
          const response = await fetch(`/api/documents/${id}`);
          if (response.ok) {
            const apiDoc = await response.json();
            console.log('📄 API Document Response:', apiDoc);
            console.log('🔗 Public URL:', apiDoc.public_url);
            
            const foundDoc: Document = {
              id: apiDoc.id,
              title: apiDoc.title,
              type: 'pdf' as const,
              category: 'Government',
              description: `Government document: ${apiDoc.title}`,
              url: apiDoc.public_url || `/api/pdf/${apiDoc.storage_path}`,
              dateAdded: apiDoc.created_at,
              author: 'Government Agency',
              tags: ['government', 'pdf'],
              size: apiDoc.size_bytes ? `${(apiDoc.size_bytes / 1024 / 1024).toFixed(1)} MB` : 'Unknown'
            };
            console.log('📋 Final Document Object:', foundDoc);
            setDocument(foundDoc);
            // Add welcome message
            setChatMessages([{
              id: '1',
              role: 'assistant',
              content: `Hi! I'm here to help you understand "${foundDoc.title}". I can explain concepts, find specific information, summarize sections, and answer questions about this document. What would you like to know?`,
              timestamp: new Date()
            }]);
          } else {
            // Fallback to hardcoded documents
            const foundDoc = SAMPLE_DOCUMENTS.find(doc => doc.id === id);
            if (foundDoc) {
              setDocument(foundDoc);
              setChatMessages([{
                id: '1',
                role: 'assistant',
                content: `Hi! I'm here to help you understand "${foundDoc.title}". I can explain concepts, find specific information, summarize sections, and answer questions about this document. What would you like to know?`,
                timestamp: new Date()
              }]);
            }
          }
        } catch (error) {
          console.log('Error fetching document from API, trying hardcoded:', error);
          // Fallback to hardcoded documents
          const foundDoc = SAMPLE_DOCUMENTS.find(doc => doc.id === id);
          if (foundDoc) {
            setDocument(foundDoc);
            setChatMessages([{
              id: '1',
              role: 'assistant',
              content: `Hi! I'm here to help you understand "${foundDoc.title}". I can explain concepts, find specific information, summarize sections, and answer questions about this document. What would you like to know?`,
              timestamp: new Date()
            }]);
          }
        } finally {
          setIsDocumentLoading(false);
        }
      };
      
      loadDocument();
    }
  }, [id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTextExtracted = (text: string) => {
    setExtractedContent(text);
    console.log('Extracted text length:', text.length);
  };

  const handleDocumentLoadSuccess = () => {
    setIsDocumentLoading(false);
  };

  const handleDocumentLoadError = (error: any) => {
    setIsDocumentLoading(false);
    console.error('Document load error:', error);
  };

  const scrollToSection = (sectionName: string) => {
    console.log('🎯 Scrolling to section:', sectionName);
    console.log('📄 Document type:', document?.type);
    console.log('📝 Extracted content length:', extractedContent?.length || 0);

    // Add persistent highlighting first (always visible)
    setPersistentHighlights(prev => {
      const newHighlights = [...prev];
      if (!newHighlights.includes(sectionName)) {
        newHighlights.push(sectionName);
      }
      return newHighlights;
    });

    // Add temporary visual highlight for immediate feedback
    setHighlightedSections([sectionName]);
    setTimeout(() => setHighlightedSections([]), 3000);

    // For PDF viewer - search for section and navigate to correct page
    if (document?.type === 'pdf' && extractedContent) {
      console.log('🔍 Searching PDF content for:', sectionName);

      // Try multiple search variations
      const searchTerms = [
        sectionName,
        sectionName.toLowerCase(),
        `# ${sectionName}`,
        `## ${sectionName}`,
        sectionName.replace(/\s+/g, ' ').trim(), // Normalize spaces
        // Try without common words
        sectionName.replace(/\b(section|part|chapter|article)\b/gi, '').trim()
      ];

      const lines = extractedContent.split('\n');
      let targetPage = 1;
      let foundMatch = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Track current page
        const pageMatch = line.match(/--- Page (\d+) ---/);
        if (pageMatch) {
          targetPage = parseInt(pageMatch[1]);
          continue;
        }

        // Check all search terms
        for (const term of searchTerms) {
          if (term && line.toLowerCase().includes(term.toLowerCase())) {
            console.log(`✅ Found "${sectionName}" on page ${targetPage}: ${line.substring(0, 100)}...`);

            // Set search query to highlight the text in PDF viewer
            setSearchQuery(term);

            foundMatch = true;
            break;
          }
        }

        if (foundMatch) break;
      }

      if (!foundMatch) {
        console.log('❌ Section not found in PDF, using general search');
        // Fallback: just search for the section name
        setSearchQuery(sectionName);
      }
    }

    // For website viewers - add visual indicators since we can't control iframe content
    else if (document?.type === 'link') {
      console.log('🌐 Adding website section indicator for:', sectionName);

      // For websites, we can only show visual indicators
      // The search query will be shown in the status bar
      setSearchQuery(sectionName);

      console.log('✅ Website section highlighting applied');
    }

    // Fallback for any document with hardcoded content
    else if (document?.content) {
      console.log('📖 Searching hardcoded content for:', sectionName);

      const contentLower = document.content.toLowerCase();
      const sectionLower = sectionName.toLowerCase();

      if (contentLower.includes(sectionLower)) {
        console.log('✅ Found section in hardcoded content');
        setSearchQuery(sectionName);
      } else {
        console.log('❌ Section not found in hardcoded content');
      }
    }

    console.log('🏁 ScrollToSection completed');
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
      // Try to use the new document-aware chat endpoint
      let response;

      try {
        // Use the new document chat endpoint
        const apiResponse = await fetch('/api/documentChat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: newMessage,
            documentId: document.id,
            documentTitle: document.title,
            documentContent: extractedContent || document.content || '',
            documentType: document.type,
            conversationContext: chatMessages.slice(-5).map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          })
        });

        if (apiResponse.ok) {
          const apiResult = await apiResponse.json();
          response = {
            content: apiResult.response,
            referencedSections: apiResult.referencedSections || [],
            citations: [{ text: document.title, section: document.category }]
          };
        } else {
          throw new Error('API request failed');
        }
      } catch (apiError) {
        console.log('Document chat API call failed, using fallback response:', apiError);
        // Fallback to hardcoded responses
        response = generateAIResponse(newMessage, document);
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        citations: response.citations,
        referencedSections: response.referencedSections || []
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // Auto-scroll to the first referenced section if available
      if (response.referencedSections && response.referencedSections.length > 0) {
        setTimeout(() => {
          scrollToSection(response.referencedSections[0]);
        }, 1000); // Delay to allow chat message to render first
      }
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
          citations: [{ text: 'Fees Structure', section: 'Section 5' }],
          referencedSections: ['Fees Structure']
        };
      }
    }

    if (lowerQuery.includes('time') || lowerQuery.includes('how long') || lowerQuery.includes('duration')) {
      if (doc.id === '1') {
        return {
          content: 'The business registration process typically takes 35-70 working days in total:\n\n• Business name registration: 3-5 working days\n• Investment certificate: 15-45 days (depending on sector)\n• Business registration: 15-20 working days\n\nThe timeline can vary based on the complexity of your business and completeness of documentation.',
          citations: [{ text: 'Processing Time', section: 'Section 4' }],
          referencedSections: ['Processing Time']
        };
      }
    }

    if (lowerQuery.includes('document') || lowerQuery.includes('require') || lowerQuery.includes('need')) {
      if (doc.id === '1') {
        return {
          content: 'For business registration in Vietnam, you need the following key documents:\n\n• Passport copies of all investors\n• Proof of registered address\n• Business plan and financial projections\n• Articles of association\n• Investment decision documents\n\nMake sure all documents are properly notarized and translated if necessary.',
          citations: [{ text: 'Required Documents', section: 'Section 3' }],
          referencedSections: ['Required Documents']
        };
      }
    }

    if (lowerQuery.includes('permit') && doc.id === '2') {
      return {
        content: 'There are four main types of housing permits in Vietnam:\n\n1. Construction permits for new buildings\n2. Renovation permits for existing structures\n3. Demolition permits\n4. Occupancy permits\n\nEach type has specific requirements and processing procedures.',
        citations: [{ text: 'Types of Housing Permits', section: 'Section 2' }],
        referencedSections: ['Types of Housing Permits']
      };
    }

    // Default response
    return {
      content: `I can help you understand various aspects of "${doc.title}". Could you be more specific about what you'd like to know? For example, you could ask about:\n\n• Requirements and procedures\n• Timelines and processing duration\n• Fees and costs\n• Required documents\n• Specific sections or concepts\n\nWhat particular aspect interests you?`,
      citations: [],
      referencedSections: []
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
            {/* Document Search and Highlighted Sections */}
            <div className="p-4 border-b border-gray-200">
              <div className="space-y-3">
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

                {/* Highlighted Sections Panel */}
                {persistentHighlights.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-red-800">Referenced Sections</h4>
                      <button
                        onClick={() => setPersistentHighlights([])}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {persistentHighlights.map((section, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs border border-red-300"
                        >
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>{section}</span>
                          <button
                            onClick={() => setPersistentHighlights(prev => prev.filter(h => h !== section))}
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-hidden" ref={documentContentRef}>
              {document.type === 'pdf' ? (
                <div>
                  
                  <PDFViewer
                    url={document.url}
                    onTextExtracted={handleTextExtracted}
                    highlightedSections={highlightedSections}
                    persistentHighlights={persistentHighlights}
                    searchQuery={searchQuery}
                    onLoadSuccess={handleDocumentLoadSuccess}
                    onLoadError={handleDocumentLoadError}
                  />
                </div>
              ) : (
                <WebsiteViewer
                  url={document.url}
                  onTextExtracted={handleTextExtracted}
                  highlightedSections={highlightedSections}
                  persistentHighlights={persistentHighlights}
                  onLoadSuccess={handleDocumentLoadSuccess}
                  onLoadError={handleDocumentLoadError}
                />
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
                    {message.referencedSections && message.referencedSections.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs text-gray-500 mb-1">Referenced sections:</p>
                        <div className="flex flex-wrap gap-1">
                          {message.referencedSections.map((section, index) => (
                            <button
                              key={index}
                              onClick={() => scrollToSection(section)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                            >
                              <MapPin className="w-3 h-3" />
                              {section}
                            </button>
                          ))}
                        </div>
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