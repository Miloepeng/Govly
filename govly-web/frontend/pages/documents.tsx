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
}

// Hardcoded documents for now
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
    size: '2.4 MB'
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
    tags: ['housing', 'permits', 'requirements']
  },
  {
    id: '3',
    title: 'Tax Certificate Application Form',
    type: 'pdf',
    category: 'Tax',
    description: 'Official form for applying for tax certificates and related documentation.',
    url: '/documents/tax-certificate-form.pdf',
    dateAdded: '2024-09-08',
    author: 'General Department of Taxation',
    tags: ['tax', 'certificate', 'form'],
    size: '1.1 MB'
  },
  {
    id: '4',
    title: 'Enterprise License Procedures',
    type: 'link',
    category: 'Business',
    description: 'Step-by-step procedures for obtaining various types of enterprise licenses.',
    url: 'https://example.gov.vn/enterprise-licenses',
    dateAdded: '2024-09-05',
    author: 'Department of Business Registration',
    tags: ['enterprise', 'license', 'procedures']
  },
  {
    id: '5',
    title: 'Construction Permit Guidelines',
    type: 'pdf',
    category: 'Construction',
    description: 'Comprehensive guidelines for obtaining construction permits in urban and rural areas.',
    url: '/documents/construction-permit-guidelines.pdf',
    dateAdded: '2024-09-01',
    author: 'Ministry of Construction',
    tags: ['construction', 'permit', 'guidelines'],
    size: '3.2 MB'
  },
  {
    id: '6',
    title: 'Investment Law Documentation',
    type: 'link',
    category: 'Investment',
    description: 'Official documentation of Vietnam\'s investment law and related regulations.',
    url: 'https://example.gov.vn/investment-law',
    dateAdded: '2024-08-28',
    author: 'Ministry of Planning and Investment',
    tags: ['investment', 'law', 'regulations']
  },
  {
    id: '7',
    title: 'Import-Export License Application',
    type: 'pdf',
    category: 'Trade',
    description: 'Application forms and procedures for import-export licenses.',
    url: '/documents/import-export-license.pdf',
    dateAdded: '2024-08-25',
    author: 'Ministry of Industry and Trade',
    tags: ['import', 'export', 'license'],
    size: '1.8 MB'
  },
  {
    id: '8',
    title: 'Social Insurance Registration',
    type: 'link',
    category: 'Social Services',
    description: 'Information and procedures for social insurance registration for employees.',
    url: 'https://example.gov.vn/social-insurance',
    dateAdded: '2024-08-20',
    author: 'Vietnam Social Security',
    tags: ['social', 'insurance', 'registration']
  }
];

const CATEGORIES = ['All', 'Business', 'Housing', 'Tax', 'Construction', 'Investment', 'Trade', 'Social Services'];

export default function DocumentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [documents, setDocuments] = useState<Document[]>(SAMPLE_DOCUMENTS);
  const [isLoading, setIsLoading] = useState(false);

  // Try to load documents from API
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        // Try to get forms from the API
        const formsResponse = await fetch('/api/formsSummary');
        if (formsResponse.ok) {
          const formsData = await formsResponse.json();

          // Convert forms to document format
          const apiDocuments: Document[] = formsData.forms?.map((form: any) => ({
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

          // Combine with sample documents
          if (apiDocuments.length > 0) {
            setDocuments([...SAMPLE_DOCUMENTS, ...apiDocuments]);
          }
        }
      } catch (error) {
        console.log('Could not load documents from API, using samples:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  // Filter documents based on search and category
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
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
              Showing {filteredDocuments.length} of {documents.length} documents
              {selectedCategory !== 'All' && ` in ${selectedCategory}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
        </div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              onClick={() => handleDocumentClick(doc)}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all duration-200 cursor-pointer group"
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
                {doc.tags.slice(0, 3).map((tag) => (
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

              {/* Document Meta */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
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
              <div className="absolute top-4 right-4">
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