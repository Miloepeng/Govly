import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, Filter, FileText, ExternalLink, Calendar, User, ArrowLeft, Eye } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';

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
  size?: string; // For PDFs
  public_url?: string; // From Supabase
  mime_type?: string;
  size_bytes?: number;
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
    size: '2.1 MB'
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
    size: '1.8 MB'
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
    size: '1.2 MB'
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
    tags: ['faq', 'support', 'questions']
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
    tags: ['business', 'support', 'hotline']
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
    tags: ['ecommerce', 'registration', 'amendments']
  }
];

const CATEGORIES = ['All', 'Business', 'Housing', 'Administrative', 'Support', 'E-commerce'];

export default function DocumentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [documents, setDocuments] = useState<Document[]>(SAMPLE_DOCUMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load documents from API
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        // Load documents from the new document management API
        const documentsResponse = await fetch('/api/documents');
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();

          // Convert API documents to the expected format
          const apiDocuments: Document[] = documentsData.documents?.map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            type: 'pdf' as const,
            category: 'Government', // Default category for uploaded PDFs
            description: `Government document: ${doc.title}`,
            url: doc.public_url || `/api/pdf/${doc.storage_path}`,
            dateAdded: doc.created_at,
            author: 'Government Agency',
            tags: ['government', 'pdf'],
            size: doc.size_bytes ? `${(doc.size_bytes / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
            public_url: doc.public_url,
            mime_type: doc.mime_type,
            size_bytes: doc.size_bytes
          })) || [];

          // Also try to get forms from the forms API for backward compatibility
          try {
            const formsResponse = await fetch('/api/formsSummary');
            if (formsResponse.ok) {
              const formsData = await formsResponse.json();
              const formDocuments: Document[] = formsData.forms?.map((form: any) => ({
                id: `form_${form.id}`,
                title: form.title || form.filename || 'Untitled Form',
                type: 'pdf' as const,
                category: form.category || 'Government',
                description: form.description || 'Government form document',
                url: `/api/forms/${form.filename}`,
                dateAdded: form.created_at || '2024-01-01',
                author: 'Government Agency',
                tags: form.category ? [form.category.toLowerCase()] : ['government'],
                size: '1.0 MB'
              })) || [];

              // Combine all documents
              setDocuments([...SAMPLE_DOCUMENTS, ...apiDocuments, ...formDocuments]);
            } else {
              // If forms API fails, just use documents + samples
              setDocuments([...SAMPLE_DOCUMENTS, ...apiDocuments]);
            }
          } catch (formsError) {
            console.log('Forms API failed, using documents + samples:', formsError);
            setDocuments([...SAMPLE_DOCUMENTS, ...apiDocuments]);
          }
        } else {
          // Fallback to sample documents if API fails
          console.log('Documents API failed, using samples');
          setDocuments(SAMPLE_DOCUMENTS);
        }
      } catch (error) {
        console.log('Could not load documents from API, using samples:', error);
        setDocuments(SAMPLE_DOCUMENTS);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  // Search documents using API
  useEffect(() => {
    const searchDocuments = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchResponse = await fetch(`/api/documents/search?query=${encodeURIComponent(searchQuery)}&limit=20`);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const apiSearchResults: Document[] = searchData.documents?.map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            type: 'pdf' as const,
            category: 'Government',
            description: `Government document: ${doc.title}`,
            url: doc.public_url || `/api/pdf/${doc.storage_path}`,
            dateAdded: doc.created_at,
            author: 'Government Agency',
            tags: ['government', 'pdf'],
            size: doc.size_bytes ? `${(doc.size_bytes / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
            public_url: doc.public_url,
            mime_type: doc.mime_type,
            size_bytes: doc.size_bytes
          })) || [];
          setSearchResults(apiSearchResults);
        }
      } catch (error) {
        console.log('Search API failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchDocuments, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter documents based on search and category
  const filteredDocuments = (() => {
    if (searchQuery.trim()) {
      // Use search results when searching
      return searchResults.filter((doc: Document) => {
        const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
        return matchesCategory;
      });
    } else {
      // Use local filtering when not searching
      return documents.filter((doc: Document) => {
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             doc.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;

        return matchesSearch && matchesCategory;
      });
    }
  })();

  const handleDocumentClick = (doc: Document) => {
    router.push(`/documents/${doc.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Manager</h1>
            <p className="text-gray-600 mt-1">Browse and explore government documents with AI assistance</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search documents, descriptions, or tags..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white min-w-[200px]"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {isSearching ? (
                'Searching...'
              ) : (
                <>
                  Showing {filteredDocuments.length} of {searchQuery.trim() ? 'search results' : documents.length} documents
                  {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                  {searchQuery && ` matching "${searchQuery}"`}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc: Document) => (
            <div
              key={doc.id}
              onClick={() => handleDocumentClick(doc)}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all duration-200 cursor-pointer group relative flex flex-col"
            >
              {/* Document Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    doc.type === 'pdf'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {doc.type === 'pdf' ? (
                      <FileText className="w-6 h-6" />
                    ) : (
                      <ExternalLink className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      doc.type === 'pdf'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {doc.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                {/* View Button */}
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Document Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                {doc.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {doc.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {doc.tags.slice(0, 3).map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
                {doc.tags.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                    +{doc.tags.length - 3} more
                  </span>
                )}
              </div>

              {/* Document Meta (stick to bottom) */}
              <div className="mt-auto flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(doc.dateAdded).toLocaleDateString()}</span>
                  </div>
                  {doc.size && (
                    <span className="px-2 py-1 bg-gray-100 rounded-md">
                      {doc.size}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{doc.author}</span>
                </div>
              </div>

              {/* Category Badge */}
              <div className="absolute top-4 right-14">
                <span className="px-2 py-1 text-xs font-medium bg-white border border-gray-200 rounded-full">
                  {doc.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? `No documents match your search for "${searchQuery}"`
                : `No documents found in the ${selectedCategory} category`
              }
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}