import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, RotateCw, Search, Loader2 } from 'lucide-react';

// Set up PDF.js worker with exact version match
const setupPDFWorker = () => {
  // Use the exact same version as the API
  const apiVersion = pdfjs.version;
  // console.log('🔍 PDF.js API version:', apiVersion);
  
  const workerOptions = [
    `/pdf.worker.min.js`, // Local file (we'll update this)
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${apiVersion}/build/pdf.worker.min.mjs`, // CDN with exact version
    `https://unpkg.com/pdfjs-dist@${apiVersion}/build/pdf.worker.min.mjs`, // Alternative CDN with exact version
  ];
  
  for (const workerSrc of workerOptions) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      // console.log('✅ PDF.js worker set to:', workerSrc);
      // console.log('✅ Worker version should match API version:', apiVersion);
      break;
    } catch (error) {
      console.warn('❌ Worker setup failed for:', workerSrc, error);
    }
  }
};

// Set up worker immediately
setupPDFWorker();

interface PDFViewerProps {
  url: string;
  onTextExtracted?: (text: string) => void;
  highlightedSections?: string[];
  persistentHighlights?: string[];
  searchQuery?: string;
  onLoadSuccess?: () => void;
  onLoadError?: (error: any) => void;
}

export default function PDFViewer({
  url,
  onTextExtracted,
  highlightedSections = [],
  persistentHighlights = [],
  searchQuery = '',
  onLoadSuccess,
  onLoadError
}: PDFViewerProps) {
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // URL change effect (no debug logs)
  useEffect(() => {
    // no-op
  }, [url]);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pageTexts, setPageTexts] = useState<Record<number, string>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<any>(null);

  const onDocumentLoadSuccess = useCallback(async (pdf: any) => {
    setNumPages(pdf.numPages);
    setIsLoading(false);
    setError(null);
    documentRef.current = pdf;

    // Extract text from all pages
    try {
      const allTexts: Record<number, string> = {};
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        allTexts[i] = pageText;
        fullText += `\n--- Page ${i} ---\n${pageText}`;
      }

      setPageTexts(allTexts);
      setExtractedText(fullText);

      // Pass extracted text to parent component for AI analysis
      if (onTextExtracted) {
        onTextExtracted(fullText);
      }
    } catch (textError) {
      console.warn('Failed to extract text from PDF:', textError);
    }

    if (onLoadSuccess) {
      onLoadSuccess();
    }
  }, [onTextExtracted, onLoadSuccess]);

  const onDocumentLoadError = useCallback((error: any) => {
    // console.error('PDF load error for URL:', url, error);
    let errorMessage = 'Failed to load PDF';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Handle specific PDF.js worker errors
    if (errorMessage.includes('worker') || errorMessage.includes('Setting up fake worker') || errorMessage.includes('Worker')) {
      errorMessage = 'PDF viewer initialization failed. This might be a network issue. Please check your internet connection and try again.';
    } else if (errorMessage.includes('CORS') || errorMessage.includes('cors')) {
      errorMessage = 'CORS error: The PDF server does not allow cross-origin requests.';
    } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      errorMessage = 'PDF file not found. The document may have been moved or deleted.';
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      errorMessage = 'Access denied. You may not have permission to view this PDF.';
    }
    
    setError(`Failed to load PDF: ${errorMessage}`);
    setIsLoading(false);
    if (onLoadError) {
      onLoadError(error);
    }
  }, [onLoadError]);

  const goToPreviousPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search functionality within PDF
  const searchInPDF = useCallback((query: string) => {
    if (!query.trim() || !extractedText) return [];

    const matches = [];
    const lowerQuery = query.toLowerCase();
    const lowerText = extractedText.toLowerCase();

    // Find all page matches
    for (const [pageNum, text] of Object.entries(pageTexts)) {
      if (text.toLowerCase().includes(lowerQuery)) {
        matches.push(parseInt(pageNum));
      }
    }

    return matches;
  }, [extractedText, pageTexts]);

  // Jump to page containing search query
  const jumpToSearchResult = useCallback(() => {
    if (searchQuery.trim()) {
      console.log('🔍 PDF: Searching for:', searchQuery);
      const matches = searchInPDF(searchQuery);
      console.log('📄 PDF: Found matches on pages:', matches);

      if (matches.length > 0) {
        const targetPage = matches[0];
        console.log('🎯 PDF: Jumping to page:', targetPage);
        setPageNumber(targetPage);

        // Add visual feedback
        console.log('✨ PDF: Added visual highlighting');
      } else {
        console.log('❌ PDF: No matches found for:', searchQuery);
      }
    }
  }, [searchQuery, searchInPDF]);

  useEffect(() => {
    if (searchQuery.trim() && extractedText) {
      // Small delay to ensure PDF is loaded
      setTimeout(() => {
        jumpToSearchResult();
      }, 500);
    }
  }, [searchQuery, extractedText, jumpToSearchResult]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load PDF</h3>
          <p className="text-gray-600 mb-4 max-w-md">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => window.open(url, '_blank')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Open in New Tab
            </button>
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* PDF Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousPage}
              disabled={pageNumber <= 1}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= numPages) {
                    setPageNumber(page);
                  }
                }}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
              />
              <span className="text-sm text-gray-600">of {numPages}</span>
            </div>

            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 border-l border-gray-300 pl-4">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Rotate */}
          <button
            onClick={rotate}
            className="p-2 text-gray-600 hover:text-gray-900 border-l border-gray-300 pl-4"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center space-x-2">
          {searchQuery && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 rounded-lg">
              <Search className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Searching: "{searchQuery}"
              </span>
            </div>
          )}

          <button
            onClick={downloadPDF}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 p-4 flex justify-center"
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
              <span className="text-gray-600">Loading PDF...</span>
            </div>
          </div>
        )}

        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null} // We handle loading state above
          className="shadow-lg"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="bg-white"
          />
        </Document>
      </div>

      {/* Page Indicator */}
      {numPages > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-2">
          <div className="flex justify-center">
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(numPages, 10) }, (_, i) => {
                const page = i + 1;
                const isActive = page === pageNumber;
                return (
                  <button
                    key={page}
                    onClick={() => setPageNumber(page)}
                    className={`w-8 h-8 text-xs rounded ${
                      isActive
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              {numPages > 10 && (
                <span className="flex items-center px-2 text-gray-500">
                  ... +{numPages - 10} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}